package com.codenized.planixor.ui.reminders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.ReminderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel managing reminder list loading, deactivation, reactivation, and deletion.
 * Collects the getAllActive() flow from ReminderRepository and maps emissions to RemindersUiState.
 * Manages confirmation dialog state for deactivate and delete operations.
 */
@HiltViewModel
class RemindersViewModel @Inject constructor(
    private val reminderRepository: ReminderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RemindersUiState())
    val uiState: StateFlow<RemindersUiState> = _uiState.asStateFlow()

    init {
        observeReminders()
    }

    private fun observeReminders() {
        viewModelScope.launch {
            reminderRepository.getAllActive()
                .catch { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "Could not load reminders",
                        )
                    }
                }
                .collect { reminders ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            reminders = reminders,
                            error = null,
                        )
                    }
                }
        }
    }

    /**
     * Shows the deactivation confirmation dialog for the given reminder.
     */
    fun requestDeactivate(id: String) {
        _uiState.update { it.copy(confirmDeactivateId = id) }
    }

    /**
     * Confirms deactivation: sets isActive=false and dismisses the dialog.
     */
    fun confirmDeactivate() {
        val id = _uiState.value.confirmDeactivateId ?: return
        _uiState.update { it.copy(confirmDeactivateId = null) }
        viewModelScope.launch {
            reminderRepository.deactivate(id)
        }
    }

    /**
     * Dismisses the deactivation confirmation dialog without making changes.
     */
    fun dismissDeactivate() {
        _uiState.update { it.copy(confirmDeactivateId = null) }
    }

    /**
     * Activates a reminder immediately without confirmation.
     */
    fun activate(id: String) {
        viewModelScope.launch {
            reminderRepository.activate(id)
        }
    }

    /**
     * Shows the delete confirmation dialog for the given reminder.
     */
    fun requestDelete(id: String) {
        _uiState.update { it.copy(confirmDeleteId = id) }
    }

    /**
     * Confirms deletion: soft-deletes the reminder and dismisses the dialog.
     */
    fun confirmDelete() {
        val id = _uiState.value.confirmDeleteId ?: return
        _uiState.update { it.copy(confirmDeleteId = null) }
        viewModelScope.launch {
            reminderRepository.softDelete(id)
        }
    }

    /**
     * Dismisses the delete confirmation dialog without making changes.
     */
    fun dismissDelete() {
        _uiState.update { it.copy(confirmDeleteId = null) }
    }
}
