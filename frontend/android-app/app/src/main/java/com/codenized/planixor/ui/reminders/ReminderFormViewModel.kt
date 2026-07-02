package com.codenized.planixor.ui.reminders

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.ReminderRepository
import com.codenized.planixor.domain.validation.ReminderValidator
import com.codenized.planixor.ui.shifts.PropagationUiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Year
import javax.inject.Inject

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

    private var validationJob: Job? = null

    /** Stores the reminder ID needed if the user confirms propagation */
    private var savedReminderId: String? = null

    /** Callback to navigate back after propagation is confirmed/declined */
    private var pendingNavigateBack: (() -> Unit)? = null

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
                        )
                        _uiState.update { it.copy(isSaving = false) }

                        // Check for affected calendar events in the current year
                        val affectedCount = countAffectedEvents(mode.reminderId)
                        if (affectedCount > 0) {
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
