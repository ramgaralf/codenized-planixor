package com.codenized.planixor.ui.reminders

import com.codenized.planixor.domain.model.Reminder

/**
 * Immutable UI state for the Reminders screen.
 * Uses a data class with defaults to manage loading, error, reminders list,
 * and confirmation dialog states for deactivation and deletion.
 */
data class RemindersUiState(
    val isLoading: Boolean = true,
    val reminders: List<Reminder> = emptyList(),
    val error: String? = null,
    val confirmDeactivateId: String? = null,
    val confirmDeleteId: String? = null,
)
