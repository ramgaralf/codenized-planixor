package com.codenized.planixor.ui.reminders

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.R
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.data.local.ReminderRepository
import com.codenized.planixor.domain.series.SeriesGenerator
import com.codenized.planixor.domain.validation.ReminderValidator
import com.codenized.planixor.ui.shifts.PropagationUiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.Year
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.UUID
import javax.inject.Inject

/**
 * UI state for the series-specific propagation dialog.
 * Shows when frequency changed and events exist in the current year.
 */
sealed class SeriesPropagationUiState {
    data object Hidden : SeriesPropagationUiState()
    data class Showing(
        val name: String,
        val previousFrequency: String,
        val newFrequency: String,
        val count: Int,
    ) : SeriesPropagationUiState()
}

@HiltViewModel
class ReminderFormViewModel @Inject constructor(
    private val reminderRepository: ReminderRepository,
    private val calendarEventDao: CalendarEventDao,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReminderFormUiState())
    val uiState: StateFlow<ReminderFormUiState> = _uiState.asStateFlow()

    private val _propagationState = MutableStateFlow<PropagationUiState>(PropagationUiState.Hidden)
    val propagationState: StateFlow<PropagationUiState> = _propagationState.asStateFlow()

    private val _seriesPropagationState = MutableStateFlow<SeriesPropagationUiState>(SeriesPropagationUiState.Hidden)
    val seriesPropagationState: StateFlow<SeriesPropagationUiState> = _seriesPropagationState.asStateFlow()

    /** Stores the reminder ID needed if the user confirms propagation */
    private var savedReminderId: String? = null

    /** Callback to navigate back after propagation is confirmed/declined */
    private var pendingNavigateBack: (() -> Unit)? = null

    /** Original frequency when editing, for change detection */
    private var originalSeriesFrequency: String = "never"

    /** Whether the frequency has changed from the original value */
    val hasFrequencyChanged: Boolean
        get() = _uiState.value.seriesFrequency != originalSeriesFrequency

    init {
        val reminderId: String? = savedStateHandle["reminderId"]
        if (reminderId != null) {
            _uiState.update { it.copy(mode = ReminderFormMode.Edit(reminderId), isLoading = true) }
            loadReminder(reminderId)
        }
    }

    fun onFieldChange(field: String, value: String) {
        when (field) {
            "name" -> _uiState.update { it.copy(name = value) }
            "icon" -> _uiState.update { it.copy(icon = value) }
            "backgroundColor" -> _uiState.update { it.copy(backgroundColor = value) }
            "seriesFrequency" -> {
                _uiState.update { it.copy(seriesFrequency = value) }
                // Compute default end date when switching to a repeating frequency
                if (value != "never" && _uiState.value.seriesEndDate.isEmpty()) {
                    val defaultEnd = computeDefaultSeriesEndDate(value)
                    _uiState.update { it.copy(seriesEndDate = defaultEnd) }
                }
            }
            "seriesEndDate" -> _uiState.update { it.copy(seriesEndDate = value) }
        }
        clearFieldErrorIfValid(field)
    }

    /**
     * Computes the default series end date based on frequency.
     * Weekly: +1 year, Monthly: +5 years, Yearly: +50 years from today.
     */
    private fun computeDefaultSeriesEndDate(frequency: String): String {
        val today = LocalDate.now()
        val endDate = when (frequency) {
            "weekly" -> today.plusYears(1)
            "monthly" -> today.plusYears(5)
            "yearly" -> today.plusYears(50)
            else -> today.plusYears(1)
        }
        return endDate.toString()
    }

    fun onSubmit(onSuccess: () -> Unit) {
        val state = _uiState.value
        _uiState.update { it.copy(hasAttemptedSubmit = true) }

        val validationResult = ReminderValidator.validate(
            name = state.name,
            icon = state.icon,
            backgroundColor = state.backgroundColor,
        )

        if (!validationResult.isValid) {
            val fieldErrors = buildReminderFieldErrors(validationResult)
            _uiState.update {
                it.copy(
                    nameError = validationResult.nameError,
                    iconError = validationResult.iconError,
                    backgroundColorError = validationResult.backgroundColorError,
                    fieldErrors = fieldErrors,
                    isValid = false,
                )
            }
            return
        }

        _uiState.update { it.copy(isSaving = true, saveError = null) }

        viewModelScope.launch {
            try {
                when (val mode = state.mode) {
                    is ReminderFormMode.Create -> {
                        reminderRepository.create(
                            name = state.name.trim(),
                            icon = state.icon,
                            backgroundColor = state.backgroundColor,
                            seriesFrequency = state.seriesFrequency,
                            seriesEndDate = state.seriesEndDate,
                        )
                        _uiState.update { it.copy(isSaving = false) }
                        onSuccess()
                    }
                    is ReminderFormMode.Edit -> {
                        val existing = reminderRepository.getById(mode.reminderId)
                        if (existing == null || existing.isDeleted) {
                            _uiState.update { it.copy(isSaving = false, shouldNavigateBack = true) }
                            return@launch
                        }
                        reminderRepository.update(
                            id = mode.reminderId,
                            name = state.name.trim(),
                            icon = state.icon,
                            backgroundColor = state.backgroundColor,
                            seriesFrequency = state.seriesFrequency,
                            seriesEndDate = state.seriesEndDate,
                        )
                        _uiState.update { it.copy(isSaving = false) }

                        // Check for affected calendar events in the current year
                        val affectedCount = countAffectedEvents(mode.reminderId)

                        if (affectedCount > 0 && hasFrequencyChanged) {
                            // Series frequency changed — show series propagation dialog
                            // This takes priority over display-field propagation (Req 3.9)
                            savedReminderId = mode.reminderId
                            pendingNavigateBack = onSuccess
                            _seriesPropagationState.update {
                                SeriesPropagationUiState.Showing(
                                    name = state.name.trim(),
                                    previousFrequency = originalSeriesFrequency,
                                    newFrequency = state.seriesFrequency,
                                    count = affectedCount,
                                )
                            }
                        } else if (affectedCount > 0 && !hasFrequencyChanged) {
                            // Only display fields changed — existing propagation logic
                            savedReminderId = mode.reminderId
                            pendingNavigateBack = onSuccess
                            _propagationState.update {
                                PropagationUiState.Showing(
                                    name = state.name.trim(),
                                    count = affectedCount,
                                )
                            }
                        } else {
                            onSuccess()
                        }
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        saveError = e.message ?: "Unexpected error",
                    )
                }
            }
        }
    }

    /**
     * Counts non-deleted calendar events with eventType="reminder" and matching eventTypeId
     * whose startDay falls within the current year (Jan 1 – Dec 31).
     *
     * Validates: Requirements 7.1, 7.5, 7.7
     */
    private suspend fun countAffectedEvents(reminderId: String): Int {
        val currentYear = Year.now().value
        val startOfYear = "$currentYear-01-01"
        val endOfYear = "$currentYear-12-31"

        val allEvents = calendarEventDao.getAll()
        return allEvents.count { event ->
            !event.isDeleted &&
                event.eventType == "reminder" &&
                event.eventTypeId == reminderId &&
                event.startDay >= startOfYear &&
                event.startDay <= endOfYear
        }
    }

    /**
     * Confirms propagation: touches modifiedAt/syncedAt on all affected current-year
     * calendar events that reference this reminder, then navigates back.
     *
     * For reminders, no event fields are updated because display fields (name, icon,
     * backgroundColor) are derived from the reminder template at read time.
     * The timestamp update ensures other devices pull the refreshed event and
     * re-derive the display values from the updated template.
     *
     * Validates: Requirements 7.3, 7.8
     */
    fun confirmPropagation() {
        val reminderId = savedReminderId ?: return
        val navigateBack = pendingNavigateBack ?: return

        viewModelScope.launch {
            val currentYear = Year.now().value
            val startOfYear = "$currentYear-01-01"
            val endOfYear = "$currentYear-12-31"
            val now = System.currentTimeMillis()

            val allEvents = calendarEventDao.getAll()
            val affectedEvents = allEvents.filter { event ->
                !event.isDeleted &&
                    event.eventType == "reminder" &&
                    event.eventTypeId == reminderId &&
                    event.startDay >= startOfYear &&
                    event.startDay <= endOfYear
            }

            for (event in affectedEvents) {
                val updated = event.copy(
                    modifiedAt = now,
                    syncedAt = null,
                )
                calendarEventDao.update(updated)
            }

            _propagationState.update { PropagationUiState.Hidden }
            savedReminderId = null
            pendingNavigateBack = null
            navigateBack()
        }
    }

    /**
     * Declines propagation: the reminder was already saved, just navigate back
     * without modifying any calendar events.
     *
     * Validates: Requirements 7.4
     */
    fun declinePropagation() {
        val navigateBack = pendingNavigateBack ?: return

        _propagationState.update { PropagationUiState.Hidden }
        savedReminderId = null
        pendingNavigateBack = null
        navigateBack()
    }

    /**
     * Confirms series propagation: applies the appropriate propagation logic
     * based on the frequency transition (never→repeating, repeating→never,
     * repeating→different repeating).
     *
     * Validates: Requirements 3.3, 3.4, 3.5
     */
    fun confirmSeriesPropagation() {
        val reminderId = savedReminderId ?: return
        val navigateBack = pendingNavigateBack ?: return
        val seriesState = _seriesPropagationState.value
        if (seriesState !is SeriesPropagationUiState.Showing) return

        val previousFrequency = seriesState.previousFrequency
        val newFrequency = seriesState.newFrequency

        viewModelScope.launch {
            val currentYear = Year.now().value
            val startOfYear = "$currentYear-01-01"
            val endOfYear = "$currentYear-12-31"

            val allEvents = calendarEventDao.getAll()
            val reminderEvents = allEvents.filter { event ->
                !event.isDeleted &&
                    event.eventType == "reminder" &&
                    event.eventTypeId == reminderId &&
                    event.startDay >= startOfYear &&
                    event.startDay <= endOfYear
            }.sortedBy { it.startDay }

            if (reminderEvents.isNotEmpty()) {
                val sourceEvent = reminderEvents.first()

                // Get the reminder's seriesEndDate for end date computation
                val reminder = reminderRepository.getById(reminderId)
                val seriesEndDate = reminder?.seriesEndDate ?: ""

                when {
                    // Repeating → Never: soft-delete events after earliest
                    newFrequency == "never" -> {
                        propagateRepeatingToNever(sourceEvent, reminderEvents)
                    }
                    // Never → Repeating: generate new occurrences from earliest
                    previousFrequency == "never" -> {
                        val endDate = computeEndDateForPropagation(newFrequency, seriesEndDate)
                        propagateNeverToRepeating(sourceEvent, reminderEvents, newFrequency, endDate)
                    }
                    // Repeating → Different Repeating: soft-delete then regenerate
                    else -> {
                        val endDate = computeEndDateForPropagation(newFrequency, seriesEndDate)
                        propagateRepeatingToRepeating(sourceEvent, reminderEvents, newFrequency, endDate)
                    }
                }
            }

            _seriesPropagationState.update { SeriesPropagationUiState.Hidden }
            savedReminderId = null
            pendingNavigateBack = null
            navigateBack()
        }
    }

    /**
     * Declines series propagation: the reminder was already saved with new frequency,
     * just navigate back without modifying any calendar events.
     *
     * Validates: Requirements 3.6
     */
    fun declineSeriesPropagation() {
        val navigateBack = pendingNavigateBack ?: return

        _seriesPropagationState.update { SeriesPropagationUiState.Hidden }
        savedReminderId = null
        pendingNavigateBack = null
        navigateBack()
    }

    /**
     * Propagation: Repeating → Never
     * Soft-deletes all events after the earliest source event in the current year.
     *
     * Validates: Requirements 3.3
     */
    private suspend fun propagateRepeatingToNever(
        sourceEvent: CalendarEventEntity,
        reminderEvents: List<CalendarEventEntity>,
    ) {
        val now = System.currentTimeMillis()
        val eventsToDelete = reminderEvents.filter { it.startDay > sourceEvent.startDay }

        for (event in eventsToDelete) {
            val updated = event.copy(
                isDeleted = true,
                modifiedAt = now,
                syncedAt = null,
            )
            calendarEventDao.update(updated)
        }
    }

    /**
     * Propagation: Never → Repeating
     * Generates new series occurrences from the earliest source event through the end date,
     * skipping dates that already have non-deleted events for this reminder.
     *
     * Validates: Requirements 3.4
     */
    private suspend fun propagateNeverToRepeating(
        sourceEvent: CalendarEventEntity,
        existingEvents: List<CalendarEventEntity>,
        newFrequency: String,
        endDate: String,
    ) {
        val generatedDates = SeriesGenerator.generateDates(
            startDay = sourceEvent.startDay,
            frequency = newFrequency,
            endDate = endDate,
        )

        val existingStartDays = existingEvents.map { it.startDay }.toSet()
        val datesToCreate = generatedDates.filter { it !in existingStartDays }

        createOccurrences(sourceEvent, datesToCreate)
    }

    /**
     * Propagation: Repeating → Different Repeating
     * Soft-deletes events after earliest, then generates new occurrences with new frequency.
     *
     * Validates: Requirements 3.5
     */
    private suspend fun propagateRepeatingToRepeating(
        sourceEvent: CalendarEventEntity,
        reminderEvents: List<CalendarEventEntity>,
        newFrequency: String,
        endDate: String,
    ) {
        // Soft-delete events after earliest
        propagateRepeatingToNever(sourceEvent, reminderEvents)

        // Generate new occurrences with new frequency
        val generatedDates = SeriesGenerator.generateDates(
            startDay = sourceEvent.startDay,
            frequency = newFrequency,
            endDate = endDate,
        )

        createOccurrences(sourceEvent, generatedDates)
    }

    /**
     * Creates new CalendarEvent records from a source event template for the given dates.
     * Preserves all fields from the source except startDay/endDay (computed from dates),
     * id (new UUID), modifiedAt (now), syncedAt (null), isDeleted (false).
     * Sets a shared seriesId on all generated occurrences and the source event.
     *
     * Validates: Requirements 2.5, 4.1, 4.2
     */
    private suspend fun createOccurrences(
        sourceEvent: CalendarEventEntity,
        dates: List<String>,
    ) {
        if (dates.isEmpty()) return

        val now = System.currentTimeMillis()
        val formatter = DateTimeFormatter.ISO_LOCAL_DATE
        val sourceStartDay = LocalDate.parse(sourceEvent.startDay, formatter)
        val sourceEndDay = LocalDate.parse(sourceEvent.endDay, formatter)
        val daySpan = ChronoUnit.DAYS.between(sourceStartDay, sourceEndDay)
        val seriesId = UUID.randomUUID().toString()

        // Update source event with seriesId
        val updatedSource = sourceEvent.copy(seriesId = seriesId, modifiedAt = now, syncedAt = null)
        calendarEventDao.update(updatedSource)

        for (date in dates) {
            val occurrenceStartDay = LocalDate.parse(date, formatter)
            val occurrenceEndDay = occurrenceStartDay.plusDays(daySpan)

            val occurrence = CalendarEventEntity(
                id = UUID.randomUUID().toString(),
                eventType = sourceEvent.eventType,
                eventTypeId = sourceEvent.eventTypeId,
                startDay = date,
                endDay = occurrenceEndDay.format(formatter),
                startTime = sourceEvent.startTime,
                endTime = sourceEvent.endTime,
                totalHours = sourceEvent.totalHours,
                notes = sourceEvent.notes,
                alertOffsets = sourceEvent.alertOffsets,
                modifiedAt = now,
                syncedAt = null,
                isDeleted = false,
                seriesId = seriesId,
            )
            calendarEventDao.insert(occurrence)
        }
    }

    /**
     * Computes the end date for propagation. Uses the reminder's seriesEndDate
     * if available, otherwise computes a default based on frequency.
     */
    private fun computeEndDateForPropagation(frequency: String, seriesEndDate: String): String {
        if (seriesEndDate.isNotEmpty()) return seriesEndDate
        val today = LocalDate.now()
        val endDate = when (frequency) {
            "weekly" -> today.plusYears(1)
            "monthly" -> today.plusYears(5)
            "yearly" -> today.plusYears(50)
            else -> today.plusYears(1)
        }
        return endDate.toString()
    }

    /**
     * Clears the field error for the given field if the field value is now valid.
     * Only applies if the user has already attempted submit.
     */
    private fun clearFieldErrorIfValid(field: String) {
        val state = _uiState.value
        if (!state.hasAttemptedSubmit) return
        if (field !in state.fieldErrors) return

        val result = ReminderValidator.validate(
            name = state.name,
            icon = state.icon,
            backgroundColor = state.backgroundColor,
        )

        val fieldHasError = when (field) {
            "name" -> result.nameError != null
            "icon" -> result.iconError != null
            "backgroundColor" -> result.backgroundColorError != null
            else -> false
        }

        if (!fieldHasError) {
            _uiState.update {
                when (field) {
                    "name" -> it.copy(
                        nameError = null,
                        fieldErrors = it.fieldErrors - field,
                    )
                    "icon" -> it.copy(
                        iconError = null,
                        fieldErrors = it.fieldErrors - field,
                    )
                    "backgroundColor" -> it.copy(
                        backgroundColorError = null,
                        fieldErrors = it.fieldErrors - field,
                    )
                    else -> it
                }
            }
        }
    }

    /**
     * Builds field errors map with R.string resource IDs from validation result.
     */
    private fun buildReminderFieldErrors(
        result: com.codenized.planixor.domain.validation.ReminderValidationResult,
    ): Map<String, Int> {
        val errors = mutableMapOf<String, Int>()
        if (result.nameError != null) {
            errors["name"] = R.string.reminder_validation_name_required
        }
        if (result.iconError != null) {
            errors["icon"] = R.string.reminder_validation_icon_required
        }
        if (result.backgroundColorError != null) {
            errors["backgroundColor"] = R.string.reminder_validation_color_required
        }
        return errors
    }

    private fun loadReminder(reminderId: String) {
        viewModelScope.launch {
            val reminder = reminderRepository.getById(reminderId)
            if (reminder == null || reminder.isDeleted) {
                _uiState.update { it.copy(isLoading = false, shouldNavigateBack = true) }
                return@launch
            }

            val frequency = reminder.seriesFrequency.ifBlank { "never" }
            originalSeriesFrequency = frequency

            _uiState.update {
                it.copy(
                    name = reminder.name,
                    icon = reminder.icon,
                    backgroundColor = reminder.backgroundColor,
                    seriesFrequency = frequency,
                    seriesEndDate = reminder.seriesEndDate,
                    isLoading = false,
                    isValid = true,
                )
            }
        }
    }
}
