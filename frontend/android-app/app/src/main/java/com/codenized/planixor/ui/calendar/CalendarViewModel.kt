package com.codenized.planixor.ui.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderRepository
import com.codenized.planixor.data.local.ShiftRepository
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.domain.validation.CalendarEventValidation
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.calendar.components.EventTypeOption
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import javax.inject.Inject

/**
 * ViewModel responsible for managing calendar navigation state, event data,
 * and the event form state (create/edit).
 *
 * Form state manages startDay, endDay, startTime, endTime, totalHours (computed),
 * eventType, eventTypeId, notes, and conditional time editability.
 *
 * When a shift is selected: startTime/endTime are auto-populated from the shift
 * definition as read-only; totalHours = shift's hoursWorked; endDay is auto-computed
 * via computeEndDayForShift() if crossing midnight.
 *
 * When a reminder is selected: startTime/endTime are editable via timepickers;
 * totalHours is recalculated on every time/day change via computeTotalHours().
 *
 * Validates: Requirements 1.5, 1.6, 9.1–9.7
 */
@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
    private val shiftRepository: ShiftRepository,
    private val reminderRepository: ReminderRepository,
) : ViewModel() {

    private val _activeView = MutableStateFlow(CalendarView.Day)
    val activeView: StateFlow<CalendarView> = _activeView.asStateFlow()

    private val _currentDate = MutableStateFlow(LocalDate.now())
    val currentDate: StateFlow<LocalDate> = _currentDate.asStateFlow()

    private val _events = MutableStateFlow<List<CalendarEventDisplay>>(emptyList())
    val events: StateFlow<List<CalendarEventDisplay>> = _events.asStateFlow()

    private val _formState = MutableStateFlow(EventFormUiState())
    val formState: StateFlow<EventFormUiState> = _formState.asStateFlow()

    init {
        loadPersistedView()
    }

    // region Navigation

    fun navigateForward() {
        _currentDate.value = when (_activeView.value) {
            CalendarView.Day -> _currentDate.value.plusDays(1)
            CalendarView.Week -> _currentDate.value.plusWeeks(1)
            CalendarView.Month -> _currentDate.value.plusMonths(1)
            CalendarView.Year -> _currentDate.value.plusYears(1)
        }
    }

    fun navigateBackward() {
        _currentDate.value = when (_activeView.value) {
            CalendarView.Day -> _currentDate.value.minusDays(1)
            CalendarView.Week -> _currentDate.value.minusWeeks(1)
            CalendarView.Month -> _currentDate.value.minusMonths(1)
            CalendarView.Year -> _currentDate.value.minusYears(1)
        }
    }

    fun navigateDay(delta: Int) {
        _currentDate.value = _currentDate.value.plusDays(delta.toLong())
    }

    fun navigateWeek(delta: Int) {
        _currentDate.value = _currentDate.value.plusWeeks(delta.toLong())
    }

    fun navigateMonth(delta: Int) {
        _currentDate.value = _currentDate.value.plusMonths(delta.toLong())
    }

    fun navigateYear(delta: Int) {
        _currentDate.value = _currentDate.value.plusYears(delta.toLong())
    }

    fun switchView(view: CalendarView) {
        _activeView.value = view
        viewModelScope.launch {
            preferencesRepository.setActiveView(view.toStorageValue())
        }
    }

    fun goToToday() {
        _currentDate.value = LocalDate.now()
    }

    fun navigateToDate(date: LocalDate) {
        _currentDate.value = date
    }

    // endregion

    // region Form State Management

    /**
     * Initializes form state for creating a new event.
     * Pre-selects startDay and endDay based on current view context.
     * Loads available event type options (active, non-deleted shifts/reminders).
     *
     * Validates: Requirements 9.1–9.7
     */
    fun initCreateForm() {
        val preSelectedDay = computePreSelectedDay()
        _formState.value = EventFormUiState(
            startDay = preSelectedDay,
            endDay = preSelectedDay,
            isLoading = true,
        )
        loadEventTypeOptions()
    }

    /**
     * Initializes form state for editing an existing event.
     * Pre-populates all fields from the existing event.
     */
    fun initEditForm(event: CalendarEventDisplay) {
        val startTimeMinutes = event.startTime
        val endTimeMinutes = event.endTime
        val isShift = event.eventType == "shift"

        _formState.value = EventFormUiState(
            eventType = event.eventType,
            eventTypeId = event.eventTypeId,
            startDay = LocalDate.parse(event.startDay),
            endDay = LocalDate.parse(event.endDay),
            startTimeHours = startTimeMinutes / 60,
            startTimeMinutes = startTimeMinutes % 60,
            endTimeHours = endTimeMinutes / 60,
            endTimeMinutes = endTimeMinutes % 60,
            totalHours = event.totalHours,
            isTimeEditable = !isShift,
            notes = event.notes ?: "",
            derivedName = event.name,
            derivedIcon = event.icon,
            derivedBackgroundColor = event.backgroundColor,
            isLoading = true,
        )
        loadEventTypeOptions()
    }

    /**
     * Handles event type selection from the Event_Type_Selector.
     * Looks up the shift/reminder definition and auto-populates fields.
     *
     * For shifts: sets startTime, endTime (read-only), totalHours from hoursWorked,
     * and computes endDay via computeEndDayForShift() (crossing midnight).
     *
     * For reminders: times remain editable, recalculates totalHours.
     *
     * Validates: Requirements 1.5, 1.6
     */
    fun selectEventType(eventType: String, eventTypeId: String) {
        viewModelScope.launch {
            if (eventType == "shift") {
                val shift = shiftRepository.getById(eventTypeId)
                if (shift != null) {
                    val currentStartDay = _formState.value.startDay?.toString() ?: LocalDate.now().toString()
                    val endDayStr = CalendarEventValidation.computeEndDayForShift(
                        currentStartDay,
                        shift.startTime,
                        shift.endTime,
                    )
                    val endDay = LocalDate.parse(endDayStr)

                    _formState.update { current ->
                        current.copy(
                            eventType = eventType,
                            eventTypeId = eventTypeId,
                            startTimeHours = shift.startTime / 60,
                            startTimeMinutes = shift.startTime % 60,
                            endTimeHours = shift.endTime / 60,
                            endTimeMinutes = shift.endTime % 60,
                            totalHours = shift.hoursWorked,
                            endDay = endDay,
                            isTimeEditable = false,
                            derivedName = shift.name,
                            derivedIcon = shift.icon,
                            derivedBackgroundColor = shift.backgroundColor,
                            errors = current.errors - setOf("eventType", "eventTypeId", "startTime", "endTime", "endDay"),
                            formError = null,
                        )
                    }
                } else {
                    _formState.update { current ->
                        current.copy(
                            eventType = eventType,
                            eventTypeId = eventTypeId,
                            errors = current.errors - setOf("eventType", "eventTypeId"),
                            formError = null,
                        )
                    }
                }
            } else {
                val reminder = reminderRepository.getById(eventTypeId)
                _formState.update { current ->
                    val totalHours = recalculateTotalHoursForReminder(current)
                    current.copy(
                        eventType = eventType,
                        eventTypeId = eventTypeId,
                        isTimeEditable = true,
                        totalHours = totalHours,
                        derivedName = reminder?.name ?: "",
                        derivedIcon = reminder?.icon ?: "",
                        derivedBackgroundColor = reminder?.backgroundColor ?: "",
                        errors = current.errors - setOf("eventType", "eventTypeId"),
                        formError = null,
                    )
                }
            }
        }
    }

    /**
     * Updates the start day and recalculates dependent fields.
     * For shifts: recomputes endDay via crossing midnight rule.
     * For reminders: recalculates totalHours.
     */
    fun onStartDaySelected(day: LocalDate) {
        _formState.update { current ->
            val updatedState = current.copy(
                startDay = day,
                errors = current.errors - "startDay",
            )

            if (current.eventType == "shift" && current.startTimeHours != null && current.endTimeHours != null) {
                val startTime = current.startTimeHours * 60 + (current.startTimeMinutes ?: 0)
                val endTime = current.endTimeHours * 60 + (current.endTimeMinutes ?: 0)
                val endDayStr = CalendarEventValidation.computeEndDayForShift(
                    day.toString(),
                    startTime,
                    endTime,
                )
                updatedState.copy(endDay = LocalDate.parse(endDayStr))
            } else if (current.eventType == "reminder") {
                updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
            } else {
                updatedState.copy(endDay = day)
            }
        }
    }

    /**
     * Updates the end day and recalculates totalHours for reminders.
     */
    fun onEndDaySelected(day: LocalDate) {
        _formState.update { current ->
            val updatedState = current.copy(
                endDay = day,
                errors = current.errors - "endDay",
            )
            if (current.eventType == "reminder") {
                updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
            } else {
                updatedState
            }
        }
    }

    /**
     * Updates start time and recalculates totalHours for reminders.
     * For shifts this should not be called (times are read-only).
     */
    fun onStartTimeSelected(hours: Int, minutes: Int) {
        _formState.update { current ->
            val updatedState = current.copy(
                startTimeHours = hours,
                startTimeMinutes = minutes,
                errors = current.errors - "startTime",
            )
            if (current.eventType == "reminder") {
                updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
            } else {
                updatedState
            }
        }
    }

    /**
     * Updates end time and recalculates totalHours for reminders.
     * For shifts this should not be called (times are read-only).
     */
    fun onEndTimeSelected(hours: Int, minutes: Int) {
        _formState.update { current ->
            val updatedState = current.copy(
                endTimeHours = hours,
                endTimeMinutes = minutes,
                errors = current.errors - "endTime",
            )
            if (current.eventType == "reminder") {
                updatedState.copy(totalHours = recalculateTotalHoursForReminder(updatedState))
            } else {
                updatedState
            }
        }
    }

    /**
     * Updates the notes field.
     */
    fun onNotesChanged(notes: String) {
        _formState.update { current ->
            current.copy(
                notes = notes,
                errors = current.errors - "notes",
            )
        }
    }

    /**
     * Resets the form state back to initial (for cancel or after successful save).
     */
    fun resetForm() {
        val preSelectedDay = computePreSelectedDay()
        _formState.value = EventFormUiState(
            startDay = preSelectedDay,
            endDay = preSelectedDay,
        )
    }

    // endregion

    // region Private helpers

    /**
     * Computes the pre-selected day based on the active view and current navigated date.
     *
     * Validates: Requirements 9.1–9.7
     */
    private fun computePreSelectedDay(): LocalDate {
        val today = LocalDate.now()
        val displayDate = _currentDate.value

        return when (_activeView.value) {
            CalendarView.Day -> {
                // 9.1: Pre-select the day currently displayed
                displayDate
            }
            CalendarView.Week -> {
                val monday = displayDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                val sunday = monday.plusDays(6)
                // 9.2/9.3: If today falls within displayed week, use today; otherwise use Monday
                if (today in monday..sunday) today else monday
            }
            CalendarView.Month -> {
                val firstOfMonth = displayDate.withDayOfMonth(1)
                val lastOfMonth = displayDate.with(TemporalAdjusters.lastDayOfMonth())
                // 9.4/9.5: If today falls within displayed month, use today; otherwise use first day
                if (today in firstOfMonth..lastOfMonth) today else firstOfMonth
            }
            CalendarView.Year -> {
                val firstOfYear = LocalDate.of(displayDate.year, 1, 1)
                val lastOfYear = LocalDate.of(displayDate.year, 12, 31)
                // 9.6/9.7: If today falls within displayed year, use today; otherwise use Jan 1st
                if (today in firstOfYear..lastOfYear) today else firstOfYear
            }
        }
    }

    /**
     * Recalculates totalHours for a reminder event based on current form state.
     * Returns null if required fields are not yet populated.
     */
    private fun recalculateTotalHoursForReminder(state: EventFormUiState): Int? {
        val startDay = state.startDay ?: return null
        val endDay = state.endDay ?: return null
        val startTimeHours = state.startTimeHours ?: return null
        val startTimeMinutes = state.startTimeMinutes ?: 0
        val endTimeHours = state.endTimeHours ?: return null
        val endTimeMinutes = state.endTimeMinutes ?: 0

        val startTime = startTimeHours * 60 + startTimeMinutes
        val endTime = endTimeHours * 60 + endTimeMinutes

        return CalendarEventValidation.computeTotalHours(
            eventType = "reminder",
            startDay = startDay.toString(),
            endDay = endDay.toString(),
            startTime = startTime,
            endTime = endTime,
        )
    }

    /**
     * Loads event type options (active, non-deleted shifts and reminders).
     */
    private fun loadEventTypeOptions() {
        viewModelScope.launch {
            val shifts = shiftRepository.getAllActive().first()
            val reminders = reminderRepository.getActiveForCalendarSelection().first()

            val options = mutableListOf<EventTypeOption>()
            shifts.filter { it.isActive && !it.isDeleted }.forEach { shift ->
                options.add(
                    EventTypeOption(
                        id = shift.id,
                        eventType = "shift",
                        name = shift.name,
                        icon = shift.icon,
                        backgroundColor = shift.backgroundColor,
                        displayLabel = "Turno: ${shift.name}",
                        startTime = shift.startTime,
                        endTime = shift.endTime,
                    ),
                )
            }
            reminders.filter { it.isActive && !it.isDeleted }.forEach { reminder ->
                options.add(
                    EventTypeOption(
                        id = reminder.id,
                        eventType = "reminder",
                        name = reminder.name,
                        icon = reminder.icon,
                        backgroundColor = reminder.backgroundColor,
                        displayLabel = "Recordatorio: ${reminder.name}",
                    ),
                )
            }

            options.sortWith(compareBy({ it.eventType != "shift" }, { it.name }))

            _formState.update { current ->
                current.copy(
                    eventTypeOptions = options,
                    isLoading = false,
                )
            }
        }
    }

    private fun loadPersistedView() {
        viewModelScope.launch {
            val stored = preferencesRepository.activeViewFlow.first()
            _activeView.value = stored.toCalendarView()
        }
    }

    // endregion

    companion object {
        private val VALID_VALUES = setOf("day", "week", "month", "year")

        private fun String?.toCalendarView(): CalendarView = when {
            this == null -> CalendarView.Day
            this !in VALID_VALUES -> CalendarView.Day
            this == "day" -> CalendarView.Day
            this == "week" -> CalendarView.Week
            this == "month" -> CalendarView.Month
            this == "year" -> CalendarView.Year
            else -> CalendarView.Day
        }

        private fun CalendarView.toStorageValue(): String = when (this) {
            CalendarView.Day -> "day"
            CalendarView.Week -> "week"
            CalendarView.Month -> "month"
            CalendarView.Year -> "year"
        }
    }
}
