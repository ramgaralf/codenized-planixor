package com.codenized.planixor.ui.sync

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.R
import com.codenized.planixor.data.local.AnnualHoursConfigDao
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.sync.ConnectionStatus
import com.codenized.planixor.data.sync.SyncConfig
import com.codenized.planixor.data.sync.SyncValidationService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel managing sync configuration state, validation, and pause/resume operations.
 * Exposes a single [SyncUiState] flow consumed by SyncConfigScreen and SyncScreen.
 */
@HiltViewModel
class SyncViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
    private val syncValidationService: SyncValidationService,
    private val calendarEventDao: CalendarEventDao,
    private val shiftDao: ShiftDao,
    private val reminderDao: ReminderDao,
    private val notificationRecordDao: NotificationRecordDao,
    private val annualHoursConfigDao: AnnualHoursConfigDao,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SyncUiState())
    val uiState: StateFlow<SyncUiState> = _uiState.asStateFlow()

    init {
        loadConfig()
    }

    fun loadConfig() {
        viewModelScope.launch {
            combine(
                preferencesRepository.syncConfigFlow,
                preferencesRepository.connectionStatusFlow,
            ) { config, persistedStatus ->
                Pair(config, persistedStatus)
            }.collect { (config, persistedStatus) ->
                _uiState.update { state ->
                    state.copy(
                        config = config,
                        isPaused = config?.isPaused ?: false,
                        lastSyncedAt = config?.lastSyncedAt,
                        connectionStatus = when {
                            config == null -> ConnectionStatus.UNCONFIGURED
                            config.isPaused -> ConnectionStatus.PAUSED
                            else -> persistedStatus
                        },
                    )
                }
            }
        }
    }

    fun validateAndSave(url: String, apiKey: String, apiBasePath: String = "/api", syncIntervalMinutes: Int = 5) {
        _uiState.update { it.copy(hasAttemptedSubmit = true) }

        // Validate mandatory fields
        val fieldErrors = mutableMapOf<String, Int>()
        if (url.isBlank()) {
            fieldErrors["serverUrl"] = R.string.sync_validation_url_required
        }
        if (apiKey.isBlank()) {
            fieldErrors["apiKey"] = R.string.sync_validation_api_key_required
        }
        if (fieldErrors.isNotEmpty()) {
            _uiState.update { it.copy(fieldErrors = fieldErrors, validationError = "invalid_input") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isValidating = true, validationError = null, fieldErrors = emptyMap()) }

            val result = syncValidationService.validate(url, apiKey)

            if (result.success && result.username != null) {
                val newConfig = SyncConfig(
                    serverUrl = url.trim(),
                    apiKey = apiKey.trim(),
                    username = result.username,
                    apiBasePath = apiBasePath,
                    syncIntervalMinutes = syncIntervalMinutes,
                    isPaused = false,
                    lastSyncedAt = null,
                )

                val existingConfig = _uiState.value.config

                when {
                    existingConfig == null -> {
                        // First-time config: save directly
                        preferencesRepository.saveSyncConfig(newConfig)
                        _uiState.update { it.copy(isValidating = false, validationError = null) }
                    }
                    existingConfig.username == result.username -> {
                        // Same username: save directly, preserve lastSyncedAt
                        val configToSave = newConfig.copy(lastSyncedAt = existingConfig.lastSyncedAt)
                        preferencesRepository.saveSyncConfig(configToSave)
                        _uiState.update { it.copy(isValidating = false, validationError = null) }
                    }
                    else -> {
                        // Username changed: trigger confirmation dialog
                        _uiState.update {
                            it.copy(
                                isValidating = false,
                                validationError = null,
                                pendingUsernameChange = PendingUsernameChange(
                                    previousUsername = existingConfig.username,
                                    newUsername = result.username,
                                    pendingConfig = newConfig,
                                ),
                            )
                        }
                    }
                }
            } else {
                _uiState.update {
                    it.copy(isValidating = false, validationError = result.error ?: "unknown_error")
                }
            }
        }
    }

    /**
     * Confirms the username change: wipes all local syncable data atomically,
     * resets lastSyncedAt, and saves the new configuration.
     * If deletion fails, aborts the operation and retains existing data/config.
     */
    fun confirmUsernameChange() {
        val pending = _uiState.value.pendingUsernameChange ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isDeletingData = true) }

            try {
                calendarEventDao.deleteAll()
                shiftDao.deleteAll()
                reminderDao.deleteAll()
                notificationRecordDao.deleteAll()
                annualHoursConfigDao.deleteAll()

                // Save new config with null lastSyncedAt (already set in pendingConfig)
                preferencesRepository.saveSyncConfig(pending.pendingConfig)

                _uiState.update { it.copy(pendingUsernameChange = null, isDeletingData = false) }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to wipe local data during username change", e)
                _uiState.update {
                    it.copy(
                        pendingUsernameChange = null,
                        isDeletingData = false,
                        validationError = "data_reset_failed",
                    )
                }
            }
        }
    }

    /**
     * Cancels the username change: discards the pending configuration and
     * clears the dialog state. Current config remains unchanged.
     */
    fun cancelUsernameChange() {
        _uiState.update { it.copy(pendingUsernameChange = null) }
    }

    fun pause() {
        viewModelScope.launch {
            preferencesRepository.setSyncPaused(true)
            preferencesRepository.saveConnectionStatus(ConnectionStatus.PAUSED)
            _uiState.update { it.copy(connectionStatus = ConnectionStatus.PAUSED) }
        }
    }

    fun resume() {
        viewModelScope.launch {
            preferencesRepository.setSyncPaused(false)
            preferencesRepository.saveConnectionStatus(ConnectionStatus.ACTIVE)
            _uiState.update { it.copy(connectionStatus = ConnectionStatus.ACTIVE) }
        }
    }

    fun clearConfig() {
        viewModelScope.launch {
            preferencesRepository.clearSyncConfig()
        }
    }

    fun clearValidationError() {
        _uiState.update { it.copy(validationError = null) }
    }

    fun clearFieldError(field: String) {
        _uiState.update { it.copy(fieldErrors = it.fieldErrors - field) }
    }

    companion object {
        private const val TAG = "SyncViewModel"
    }
}
