package com.codenized.planixor.ui.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.sync.ConnectionStatus
import com.codenized.planixor.data.sync.SyncConfig
import com.codenized.planixor.data.sync.SyncValidationService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
) : ViewModel() {

    private val _uiState = MutableStateFlow(SyncUiState())
    val uiState: StateFlow<SyncUiState> = _uiState.asStateFlow()

    init {
        loadConfig()
    }

    fun loadConfig() {
        viewModelScope.launch {
            preferencesRepository.syncConfigFlow.collect { config ->
                _uiState.update { state ->
                    state.copy(
                        config = config,
                        isPaused = config?.isPaused ?: false,
                        lastSyncedAt = config?.lastSyncedAt,
                        connectionStatus = when {
                            config == null -> ConnectionStatus.UNCONFIGURED
                            config.isPaused -> ConnectionStatus.PAUSED
                            else -> ConnectionStatus.ACTIVE
                        },
                    )
                }
            }
        }
    }

    fun validateAndSave(url: String, apiKey: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isValidating = true, validationError = null) }

            val result = syncValidationService.validate(url, apiKey)

            if (result.success && result.username != null) {
                val config = SyncConfig(
                    serverUrl = url.trim(),
                    apiKey = apiKey.trim(),
                    username = result.username,
                    isPaused = false,
                    lastSyncedAt = null,
                )
                preferencesRepository.saveSyncConfig(config)
                _uiState.update { it.copy(isValidating = false, validationError = null) }
            } else {
                _uiState.update {
                    it.copy(isValidating = false, validationError = result.error ?: "unknown_error")
                }
            }
        }
    }

    fun pause() {
        viewModelScope.launch {
            preferencesRepository.setSyncPaused(true)
        }
    }

    fun resume() {
        viewModelScope.launch {
            preferencesRepository.setSyncPaused(false)
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
}
