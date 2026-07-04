package com.codenized.planixor.ui.reminders

/**
 * Represents the mode of the reminder form: creating a new reminder or editing an existing one.
 */
sealed interface ReminderFormMode {
    data object Create : ReminderFormMode
    data class Edit(val reminderId: String) : ReminderFormMode
}

/**
 * Immutable UI state for the reminder creation/edit form.
 * Tracks field values, validation errors, and submission state.
 */
data class ReminderFormUiState(
    val name: String = "",
    val icon: String = "",
    val backgroundColor: String = "",
    val nameError: String? = null,
    val iconError: String? = null,
    val backgroundColorError: String? = null,
    val fieldErrors: Map<String, Int> = emptyMap(),
    val hasAttemptedSubmit: Boolean = false,
    val isValid: Boolean = false,
    val isSaving: Boolean = false,
    val saveError: String? = null,
    val isLoading: Boolean = false,
    val mode: ReminderFormMode = ReminderFormMode.Create,
    val shouldNavigateBack: Boolean = false,
)
