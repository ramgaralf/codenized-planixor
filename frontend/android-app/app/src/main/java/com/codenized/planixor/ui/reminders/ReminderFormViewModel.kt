package com.codenized.planixor.ui.reminders

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.ReminderRepository
import com.codenized.planixor.domain.validation.ReminderValidator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ReminderFormViewModel @Inject constructor(
    private val reminderRepository: ReminderRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReminderFormUiState())
    val uiState: StateFlow<ReminderFormUiState> = _uiState.asStateFlow()

    private var validationJob: Job? = null

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
        }
        scheduleDebouncedValidation()
    }

    fun onSubmit(onSuccess: () -> Unit) {
        val state = _uiState.value
        val validationResult = ReminderValidator.validate(
            name = state.name,
            icon = state.icon,
            backgroundColor = state.backgroundColor,
        )

        if (!validationResult.isValid) {
            _uiState.update {
                it.copy(
                    nameError = validationResult.nameError,
                    iconError = validationResult.iconError,
                    backgroundColorError = validationResult.backgroundColorError,
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
                        )
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
                        )
                    }
                }
                _uiState.update { it.copy(isSaving = false) }
                onSuccess()
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

    private fun scheduleDebouncedValidation() {
        validationJob?.cancel()
        validationJob = viewModelScope.launch {
            delay(VALIDATION_DEBOUNCE_MS)
            validateAllFields()
        }
    }

    private fun validateAllFields() {
        val state = _uiState.value
        val result = ReminderValidator.validate(
            name = state.name,
            icon = state.icon,
            backgroundColor = state.backgroundColor,
        )
        _uiState.update {
            it.copy(
                nameError = result.nameError,
                iconError = result.iconError,
                backgroundColorError = result.backgroundColorError,
                isValid = result.isValid,
            )
        }
    }

    private fun loadReminder(reminderId: String) {
        viewModelScope.launch {
            val reminder = reminderRepository.getById(reminderId)
            if (reminder == null || reminder.isDeleted) {
                _uiState.update { it.copy(isLoading = false, shouldNavigateBack = true) }
                return@launch
            }

            _uiState.update {
                it.copy(
                    name = reminder.name,
                    icon = reminder.icon,
                    backgroundColor = reminder.backgroundColor,
                    isLoading = false,
                    isValid = true,
                )
            }
        }
    }

    companion object {
        private const val VALIDATION_DEBOUNCE_MS = 1000L
    }
}
