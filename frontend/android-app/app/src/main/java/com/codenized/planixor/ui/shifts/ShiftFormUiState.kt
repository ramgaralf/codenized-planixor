package com.codenized.planixor.ui.shifts

/**
 * Represents the mode of the shift form: creating a new shift or editing an existing one.
 */
sealed interface ShiftFormMode {
    data object Create : ShiftFormMode
    data class Edit(val shiftId: String) : ShiftFormMode
}

/**
 * Immutable UI state for the shift creation/edit form.
 * All field values are nullable to represent unset/cleared state.
 */
data class ShiftFormUiState(
    val name: String = "",
    val icon: String = "",
    val backgroundColor: String = "",
    val startTimeHours: Int? = null,
    val startTimeMinutes: Int? = null,
    val endTimeHours: Int? = null,
    val endTimeMinutes: Int? = null,
    val hoursWorked: Int? = null,
    val errors: Map<String, String> = emptyMap(),
    val fieldErrors: Map<String, Int> = emptyMap(),
    val hasAttemptedSubmit: Boolean = false,
    val isSubmitting: Boolean = false,
    val isLoading: Boolean = false,
    val mode: ShiftFormMode = ShiftFormMode.Create,
)
