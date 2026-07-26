package com.codenized.planixor.ui.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.AnnualHoursConfigRepository
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.domain.model.AnnualHoursConfig
import com.codenized.planixor.domain.model.CalendarEvent
import com.codenized.planixor.domain.model.TypeAggregate
import com.codenized.planixor.domain.util.aggregateByType
import com.codenized.planixor.domain.util.computePercentages
import com.codenized.planixor.domain.util.filterEventsForPeriod
import com.codenized.planixor.domain.util.normalizeTotalMinutes
import com.codenized.planixor.domain.util.sortByTotalDescending
import com.codenized.planixor.domain.util.TypeTotals
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

/**
 * Report mode: monthly or annual aggregation.
 */
enum class ReportMode {
    MONTH,
    YEAR,
}

/**
 * Aggregated report data for display.
 */
data class ReportData(
    val shifts: List<TypeAggregate>,
    val reminders: List<TypeAggregate>,
    val totalShiftMinutes: Int,
    val totalReminderMinutes: Int,
    val annualConfig: AnnualHoursConfig?,
)

/**
 * UI state for the Reports screen.
 * Contains mode, date selection, config dialog state, and computed report data.
 */
data class ReportsUiState(
    val mode: ReportMode = ReportMode.MONTH,
    val selectedMonth: Int = LocalDate.now().monthValue - 1,
    val selectedYear: Int = LocalDate.now().year,
    val previousMonth: Int = LocalDate.now().monthValue - 1,
    val previousYear: Int = LocalDate.now().year,
    val isConfigDialogOpen: Boolean = false,
    val reportData: ReportData? = null,
    val isLoading: Boolean = false,
)

/**
 * Internal state driving the reactive report data computation.
 * Changes to this trigger recalculation of report data.
 */
private data class ReportQuery(
    val mode: ReportMode,
    val selectedMonth: Int,
    val selectedYear: Int,
)

/**
 * ViewModel for the Reports screen.
 * Manages report mode (month/year), date selection with preservation on mode switch,
 * and reactive report data computation from local calendar events.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val calendarEventDao: CalendarEventDao,
    private val shiftDao: ShiftDao,
    private val reminderDao: ReminderDao,
    private val annualHoursConfigRepository: AnnualHoursConfigRepository,
) : ViewModel() {

    companion object {
        private const val FALLBACK_ICON = "❓"
        private const val FALLBACK_NAME = "Unknown"
        private const val FALLBACK_COLOR = "#6B7280"
        private const val EVENT_TYPE_SHIFT = "shift"
        private const val EVENT_TYPE_REMINDER = "reminder"
    }

    private val _controlState = MutableStateFlow(
        ReportsUiState(
            mode = ReportMode.MONTH,
            selectedMonth = LocalDate.now().monthValue - 1,
            selectedYear = LocalDate.now().year,
            previousMonth = LocalDate.now().monthValue - 1,
            previousYear = LocalDate.now().year,
        ),
    )

    /**
     * Derives a query key from control state to trigger reactive data recalculation.
     */
    private val reportQuery = _controlState.map { state ->
        ReportQuery(
            mode = state.mode,
            selectedMonth = state.selectedMonth,
            selectedYear = state.selectedYear,
        )
    }

    /**
     * Reactive flow: when the query changes, fetch calendar events and annual config,
     * then aggregate into ReportData.
     */
    private val reportDataFlow = reportQuery.flatMapLatest { query ->
        val (startDate, endDate) = computeDateRange(query.mode, query.selectedMonth, query.selectedYear)

        val eventsFlow = calendarEventDao.getByDateRange(startDate, endDate)
        val annualConfigFlow = if (query.mode == ReportMode.YEAR) {
            annualHoursConfigRepository.getByYear(query.selectedYear)
        } else {
            MutableStateFlow(null)
        }

        combine(eventsFlow, annualConfigFlow) { eventEntities, annualConfig ->
            buildReportData(eventEntities, query, annualConfig)
        }
    }

    /**
     * The public UI state combining control state and computed report data.
     */
    val uiState: StateFlow<ReportsUiState> = combine(
        _controlState,
        reportDataFlow,
    ) { controlState, reportData ->
        controlState.copy(
            reportData = reportData,
            isLoading = false,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = _controlState.value.copy(isLoading = true),
    )

    /**
     * Switches the report mode between MONTH and YEAR with date preservation.
     * Month→Year: saves current month+year to previousMonth/previousYear, keeps selectedYear.
     * Year→Month: restores selectedMonth=previousMonth, selectedYear=previousYear.
     */
    fun switchMode(newMode: ReportMode) {
        _controlState.update { current ->
            if (current.mode == newMode) return@update current

            when (newMode) {
                ReportMode.YEAR -> current.copy(
                    mode = ReportMode.YEAR,
                    previousMonth = current.selectedMonth,
                    previousYear = current.selectedYear,
                )
                ReportMode.MONTH -> current.copy(
                    mode = ReportMode.MONTH,
                    selectedMonth = current.previousMonth,
                    selectedYear = current.previousYear,
                )
            }
        }
    }

    /**
     * Navigates to the previous month (wraps to December of previous year if January).
     */
    fun navigatePreviousMonth() {
        _controlState.update { current ->
            if (current.selectedMonth > 0) {
                current.copy(selectedMonth = current.selectedMonth - 1)
            } else {
                current.copy(selectedMonth = 11, selectedYear = current.selectedYear - 1)
            }
        }
    }

    /**
     * Navigates to the next month (wraps to January of next year if December).
     */
    fun navigateNextMonth() {
        _controlState.update { current ->
            if (current.selectedMonth < 11) {
                current.copy(selectedMonth = current.selectedMonth + 1)
            } else {
                current.copy(selectedMonth = 0, selectedYear = current.selectedYear + 1)
            }
        }
    }

    /**
     * Navigates to the previous year.
     */
    fun navigatePreviousYear() {
        _controlState.update { current ->
            current.copy(selectedYear = current.selectedYear - 1)
        }
    }

    /**
     * Navigates to the next year.
     */
    fun navigateNextYear() {
        _controlState.update { current ->
            current.copy(selectedYear = current.selectedYear + 1)
        }
    }

    /**
     * Resets date selection to the current month (Month mode) or current year (Year mode).
     */
    fun navigateToday() {
        val now = LocalDate.now()
        _controlState.update { current ->
            when (current.mode) {
                ReportMode.MONTH -> current.copy(
                    selectedMonth = now.monthValue - 1,
                    selectedYear = now.year,
                )
                ReportMode.YEAR -> current.copy(
                    selectedYear = now.year,
                )
            }
        }
    }

    /**
     * Opens the annual config dialog.
     */
    fun openConfigDialog() {
        _controlState.update { it.copy(isConfigDialogOpen = true) }
    }

    /**
     * Closes the annual config dialog.
     */
    fun closeConfigDialog() {
        _controlState.update { it.copy(isConfigDialogOpen = false) }
    }

    /**
     * Saves the annual hours configuration for the selected year.
     * Closes the dialog on success.
     */
    fun saveAnnualConfig(hours: Int) {
        viewModelScope.launch {
            val year = _controlState.value.selectedYear
            annualHoursConfigRepository.save(year, hours)
            _controlState.update { it.copy(isConfigDialogOpen = false) }
        }
    }

    /**
     * Soft-deletes the annual hours configuration for the selected year.
     * Closes the dialog on success.
     */
    fun deleteAnnualConfig() {
        viewModelScope.launch {
            val year = _controlState.value.selectedYear
            annualHoursConfigRepository.softDelete(year)
            _controlState.update { it.copy(isConfigDialogOpen = false) }
        }
    }

    /**
     * Computes the start and end date strings for the given mode/month/year.
     */
    private fun computeDateRange(mode: ReportMode, month: Int, year: Int): Pair<String, String> {
        return when (mode) {
            ReportMode.MONTH -> {
                val yearMonth = YearMonth.of(year, month + 1)
                val startDate = yearMonth.atDay(1).toString()
                val endDate = yearMonth.atEndOfMonth().toString()
                startDate to endDate
            }
            ReportMode.YEAR -> {
                val startDate = "$year-01-01"
                val endDate = "$year-12-31"
                startDate to endDate
            }
        }
    }

    /**
     * Builds the ReportData by filtering, aggregating, and enriching events with type metadata.
     */
    private suspend fun buildReportData(
        eventEntities: List<CalendarEventEntity>,
        query: ReportQuery,
        annualConfig: AnnualHoursConfig?,
    ): ReportData {
        val events = eventEntities.map { it.toDomain() }
        val (startDate, endDate) = computeDateRange(query.mode, query.selectedMonth, query.selectedYear)

        val shiftEvents = filterEventsForPeriod(
            events.filter { it.eventType == EVENT_TYPE_SHIFT },
            startDate,
            endDate,
        )
        val reminderEvents = filterEventsForPeriod(
            events.filter { it.eventType == EVENT_TYPE_REMINDER },
            startDate,
            endDate,
        )

        val shiftTotals = aggregateByType(shiftEvents)
        val reminderTotals = aggregateByType(reminderEvents)

        val shiftConfiguredHours = if (query.mode == ReportMode.YEAR && annualConfig != null) {
            annualConfig.configuredHours
        } else {
            null
        }

        val shiftPercentages = computePercentages(shiftTotals, shiftConfiguredHours)
        val reminderPercentages = computePercentages(reminderTotals, null)

        val shiftAggregates = buildTypeAggregates(shiftTotals, shiftPercentages, EVENT_TYPE_SHIFT)
        val reminderAggregates = buildTypeAggregates(reminderTotals, reminderPercentages, EVENT_TYPE_REMINDER)

        val totalShiftMinutes = shiftTotals.values.sumOf { it.totalMinutes }.let { normalizeTotalMinutes(it) }
        val totalReminderMinutes = reminderTotals.values.sumOf { it.totalMinutes }.let { normalizeTotalMinutes(it) }

        return ReportData(
            shifts = sortByTotalDescending(shiftAggregates),
            reminders = sortByTotalDescending(reminderAggregates),
            totalShiftMinutes = totalShiftMinutes,
            totalReminderMinutes = totalReminderMinutes,
            annualConfig = annualConfig,
        )
    }

    /**
     * Builds TypeAggregate list by looking up shift or reminder definitions for metadata.
     * Queries include soft-deleted entries. If definition not found, uses fallback values.
     */
    private suspend fun buildTypeAggregates(
        totalsMap: Map<String, TypeTotals>,
        percentages: Map<String, Double>,
        eventType: String,
    ): List<TypeAggregate> {
        return totalsMap.map { (typeId, data) ->
            val (name, icon, backgroundColor) = lookupTypeMetadata(typeId, eventType)
            TypeAggregate(
                typeId = typeId,
                name = name,
                icon = icon,
                backgroundColor = backgroundColor,
                totalMinutes = normalizeTotalMinutes(data.totalMinutes),
                eventCount = data.eventCount,
                percentage = percentages[typeId] ?: 0.0,
            )
        }
    }

    /**
     * Looks up shift or reminder definition for display metadata.
     * Queries by ID regardless of isDeleted status to handle soft-deleted definitions.
     * Returns fallback values if not found.
     */
    private suspend fun lookupTypeMetadata(
        typeId: String,
        eventType: String,
    ): Triple<String, String, String> {
        return when (eventType) {
            EVENT_TYPE_SHIFT -> {
                val shift = shiftDao.getById(typeId)
                if (shift != null) {
                    Triple(shift.name, shift.icon, shift.backgroundColor)
                } else {
                    Triple(FALLBACK_NAME, FALLBACK_ICON, FALLBACK_COLOR)
                }
            }
            EVENT_TYPE_REMINDER -> {
                val reminder = reminderDao.getById(typeId)
                if (reminder != null) {
                    Triple(reminder.name, reminder.icon, reminder.backgroundColor)
                } else {
                    Triple(FALLBACK_NAME, FALLBACK_ICON, FALLBACK_COLOR)
                }
            }
            else -> Triple(FALLBACK_NAME, FALLBACK_ICON, FALLBACK_COLOR)
        }
    }
}

/**
 * Maps CalendarEventEntity to CalendarEvent domain model.
 */
private fun CalendarEventEntity.toDomain(): CalendarEvent = CalendarEvent(
    id = id,
    eventType = eventType,
    eventTypeId = eventTypeId,
    startDay = startDay,
    endDay = endDay,
    startTime = startTime,
    endTime = endTime,
    totalHours = totalHours,
    notes = notes,
    modifiedAt = modifiedAt,
    syncedAt = syncedAt,
    isDeleted = isDeleted,
)
