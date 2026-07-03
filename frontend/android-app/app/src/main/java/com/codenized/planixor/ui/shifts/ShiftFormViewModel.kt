package com.codenized.planixor.ui.shifts

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.R
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.ShiftRepository
import com.codenized.planixor.domain.util.calculateHoursWorked
import com.codenized.planixor.domain.validation.CalendarEventValidation
import com.codenized.planixor.domain.validation.ShiftValidationInput
import com.codenized.planixor.domain.validation.ShiftValidator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Year
import javax.inject.Inject

/**
 * Represents the propagation dialog state after a shift edit.
 * Hidden: no propagation needed or already handled.
 * Showing: propagation modal should be displayed with the shift name and affected event count.
 */
sealed class PropagationUiState {
    data object Hidden : PropagationUiState()
    data class Showing(val name: String, val count: Int) : PropagationUiState()
}

@HiltViewModel
class ShiftFormViewModel @Inject constructor(
    private val shiftRepository: ShiftRepository,
    private val calendarEventDao: CalendarEventDao,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ShiftFormUiState())
    val uiState: StateFlow<ShiftFormUiState> = _uiState.asStateFlow()

    private val _propagationState = MutableStateFlow<PropagationUiState>(PropagationUiState.Hidden)
    val propagationState: StateFlow<PropagationUiState> = _propagationState.asStateFlow()

    private var isHoursWorkedManuallyOverridden = false

    /** Stores the saved shift data needed if the user confirms propagation */
    private var savedShiftData: SavedShiftData? = null

    /** Callback to navigate back after propagation is confirmed/declined */
    private var pendingNavigateBack: (() -> Unit)? = null

    init {
        val shiftId: String? = savedStateHandle["shiftId"]
        if (shiftId != null) {
            _uiState.update { it.copy(mode = ShiftFormMode.Edit(shiftId), isLoading = true) }
            loadShift(shiftId)
        }
    }

    fun onFieldChange(field: String, value: String) {
        when (field) {
            "name" -> _uiState.update { it.copy(name = value) }
            "icon" -> _uiState.update { it.copy(icon = value) }
            "backgroundColor" -> _uiState.update { it.copy(backgroundColor = value) }
            "startTimeHours" -> handleTimeChange(field, value)
            "startTimeMinutes" -> handleTimeChange(field, value)
            "endTimeHours" -> handleTimeChange(field, value)
            "endTimeMinutes" -> handleTimeChange(field, value)
            "hoursWorked" -> handleHoursWorkedChange(value)
        }
        clearFieldErrorIfValid(field)
    }

    fun onSubmit(onSuccess: () -> Unit) {
        val state = _uiState.value
        _uiState.update { it.copy(hasAttemptedSubmit = true) }

        val validationResult = ShiftValidator.validate(buildValidationInput(state))

        if (!validationResult.isValid) {
            val fieldErrors = mapValidationErrorsToResIds(validationResult.errors)
            _uiState.update { it.copy(errors = validationResult.errors, fieldErrors = fieldErrors) }
            return
        }

        _uiState.update { it.copy(isSubmitting = true, errors = emptyMap(), fieldErrors = emptyMap()) }

        viewModelScope.launch {
            val startTime = state.startTimeHours!! * 60 + state.startTimeMinutes!!
            val endTime = state.endTimeHours!! * 60 + state.endTimeMinutes!!
            val hoursWorked = state.hoursWorked!!

            when (val mode = state.mode) {
                is ShiftFormMode.Create -> {
                    shiftRepository.create(
                        name = state.name.trim(),
                        icon = state.icon,
                        backgroundColor = state.backgroundColor,
                        startTime = startTime,
                        endTime = endTime,
                        hoursWorked = hoursWorked,
                    )
                    _uiState.update { it.copy(isSubmitting = false) }
                    onSuccess()
                }
                is ShiftFormMode.Edit -> {
                    shiftRepository.update(
                        id = mode.shiftId,
                        name = state.name.trim(),
                        icon = state.icon,
                        backgroundColor = state.backgroundColor,
                        startTime = startTime,
                        endTime = endTime,
                        hoursWorked = hoursWorked,
                    )
                    _uiState.update { it.copy(isSubmitting = false) }

                    // Check for affected calendar events in the current year
                    val affectedCount = countAffectedEvents(mode.shiftId)
                    if (affectedCount > 0) {
                        savedShiftData = SavedShiftData(
                            shiftId = mode.shiftId,
                            startTime = startTime,
                            endTime = endTime,
                            hoursWorked = hoursWorked,
                        )
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
        }
    }

    private fun handleTimeChange(field: String, value: String) {
        val intValue = value.toIntOrNull()

        _uiState.update { state ->
            val updatedState = when (field) {
                "startTimeHours" -> state.copy(startTimeHours = intValue)
                "startTimeMinutes" -> state.copy(startTimeMinutes = intValue)
                "endTimeHours" -> state.copy(endTimeHours = intValue)
                "endTimeMinutes" -> state.copy(endTimeMinutes = intValue)
                else -> state
            }
            recalculateHoursWorked(updatedState)
        }
    }

    private fun handleHoursWorkedChange(value: String) {
        val intValue = value.toIntOrNull()
        if (intValue != null) {
            isHoursWorkedManuallyOverridden = true
        }
        _uiState.update { it.copy(hoursWorked = intValue) }
    }

    /**
     * Recalculates hours worked based on current time fields.
     * Per Property 11: any time change recalculates and clears manual override.
     * Per Requirement 9.5: clearing either time clears hoursWorked.
     */
    private fun recalculateHoursWorked(state: ShiftFormUiState): ShiftFormUiState {
        val startHours = state.startTimeHours
        val startMinutes = state.startTimeMinutes
        val endHours = state.endTimeHours
        val endMinutes = state.endTimeMinutes

        // If either time is incomplete, clear hoursWorked (Requirement 9.5)
        if (startHours == null || startMinutes == null || endHours == null || endMinutes == null) {
            isHoursWorkedManuallyOverridden = false
            return state.copy(hoursWorked = null)
        }

        // Both times are set → recalculate (Property 11: time change always recalculates)
        isHoursWorkedManuallyOverridden = false
        val startTime = startHours * 60 + startMinutes
        val endTime = endHours * 60 + endMinutes
        val computed = calculateHoursWorked(startTime, endTime)
        return state.copy(hoursWorked = computed)
    }

    /**
     * Clears the field error for the given field if the field value is now valid.
     * Only applies if the user has already attempted submit.
     */
    private fun clearFieldErrorIfValid(field: String) {
        val state = _uiState.value
        if (!state.hasAttemptedSubmit) return

        val fieldKey = when (field) {
            "startTimeHours", "startTimeMinutes" -> "startTime"
            "endTimeHours", "endTimeMinutes" -> "endTime"
            "backgroundColor" -> "color"
            else -> field
        }

        if (fieldKey !in state.fieldErrors) return

        val input = buildValidationInput(state)
        val result = ShiftValidator.validate(input)
        if (fieldKey !in result.errors) {
            _uiState.update {
                it.copy(
                    errors = it.errors - fieldKey,
                    fieldErrors = it.fieldErrors - fieldKey,
                )
            }
        }
    }

    /**
     * Maps validation error keys to R.string resource IDs.
     */
    private fun mapValidationErrorsToResIds(errors: Map<String, String>): Map<String, Int> {
        return errors.mapValues { (_, errorKey) ->
            when (errorKey) {
                "shift.validation.name.required" -> R.string.shift_validation_name_required
                "shift.validation.name.maxLength" -> R.string.shift_validation_name_max_length
                "shift.validation.icon.required" -> R.string.shift_validation_icon_required
                "shift.validation.color.required" -> R.string.shift_validation_color_required
                "shift.validation.startTime.required" -> R.string.shift_validation_start_time_required
                "shift.validation.endTime.required" -> R.string.shift_validation_end_time_required
                "shift.validation.hoursWorked.range" -> R.string.shift_validation_hours_worked_range
                else -> R.string.validation_field_required
            }
        }
    }

    private fun buildValidationInput(state: ShiftFormUiState): ShiftValidationInput {
        return ShiftValidationInput(
            name = state.name.ifEmpty { null },
            icon = state.icon.ifEmpty { null },
            color = state.backgroundColor.ifEmpty { null },
            startTimeHours = state.startTimeHours,
            startTimeMinutes = state.startTimeMinutes,
            endTimeHours = state.endTimeHours,
            endTimeMinutes = state.endTimeMinutes,
            hoursWorked = state.hoursWorked,
        )
    }

    private fun loadShift(shiftId: String) {
        viewModelScope.launch {
            val shift = shiftRepository.getById(shiftId)
            if (shift == null || shift.isDeleted) {
                _uiState.update { it.copy(isLoading = false) }
                return@launch
            }

            val startHours = shift.startTime / 60
            val startMinutes = shift.startTime % 60
            val endHours = shift.endTime / 60
            val endMinutes = shift.endTime % 60

            _uiState.update {
                it.copy(
                    name = shift.name,
                    icon = shift.icon,
                    backgroundColor = shift.backgroundColor,
                    startTimeHours = startHours,
                    startTimeMinutes = startMinutes,
                    endTimeHours = endHours,
                    endTimeMinutes = endMinutes,
                    hoursWorked = shift.hoursWorked,
                    isLoading = false,
                )
            }
        }
    }

    /**
     * Counts non-deleted calendar events with eventType="shift" and matching eventTypeId
     * whose startDay falls within the current year (Jan 1 – Dec 31).
     *
     * Validates: Requirements 6.1, 6.5, 6.7
     */
    private suspend fun countAffectedEvents(shiftId: String): Int {
        val currentYear = Year.now().value
        val startOfYear = "$currentYear-01-01"
        val endOfYear = "$currentYear-12-31"

        val allEvents = calendarEventDao.getAll()
        return allEvents.count { event ->
            !event.isDeleted &&
                event.eventType == "shift" &&
                event.eventTypeId == shiftId &&
                event.startDay >= startOfYear &&
                event.startDay <= endOfYear
        }
    }

    /**
     * Confirms propagation: updates all affected current-year calendar events
     * with the new shift times and hoursWorked, then navigates back.
     *
     * Updates: startTime, endTime, totalHours, endDay (recomputed), modifiedAt = now, syncedAt = null.
     *
     * Validates: Requirements 6.3, 6.8
     */
    fun confirmPropagation() {
        val data = savedShiftData ?: return
        val navigateBack = pendingNavigateBack ?: return

        viewModelScope.launch {
            val currentYear = Year.now().value
            val startOfYear = "$currentYear-01-01"
            val endOfYear = "$currentYear-12-31"
            val now = System.currentTimeMillis()

            val allEvents = calendarEventDao.getAll()
            val affectedEvents = allEvents.filter { event ->
                !event.isDeleted &&
                    event.eventType == "shift" &&
                    event.eventTypeId == data.shiftId &&
                    event.startDay >= startOfYear &&
                    event.startDay <= endOfYear
            }

            for (event in affectedEvents) {
                val newEndDay = CalendarEventValidation.computeEndDayForShift(
                    event.startDay,
                    data.startTime,
                    data.endTime,
                )
                val updated = event.copy(
                    startTime = data.startTime,
                    endTime = data.endTime,
                    totalHours = data.hoursWorked,
                    endDay = newEndDay,
                    modifiedAt = now,
                    syncedAt = null,
                )
                calendarEventDao.update(updated)
            }

            _propagationState.update { PropagationUiState.Hidden }
            savedShiftData = null
            pendingNavigateBack = null
            navigateBack()
        }
    }

    /**
     * Declines propagation: the shift was already saved, just navigate back
     * without modifying any calendar events.
     *
     * Validates: Requirements 6.4
     */
    fun declinePropagation() {
        val navigateBack = pendingNavigateBack ?: return

        _propagationState.update { PropagationUiState.Hidden }
        savedShiftData = null
        pendingNavigateBack = null
        navigateBack()
    }

}

/**
 * Holds the shift data needed for propagation after a successful edit save.
 */
private data class SavedShiftData(
    val shiftId: String,
    val startTime: Int,
    val endTime: Int,
    val hoursWorked: Int,
)
