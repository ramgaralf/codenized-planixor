package com.codenized.planixor.ui.sync

import com.codenized.planixor.data.sync.ConnectionStatus
import com.codenized.planixor.data.sync.SyncConfig

/**
 * Immutable UI state for sync configuration and management screens.
 */
data class SyncUiState(
    val config: SyncConfig? = null,
    val connectionStatus: ConnectionStatus = ConnectionStatus.UNCONFIGURED,
    val isPaused: Boolean = false,
    val lastSyncedAt: Long? = null,
    val isValidating: Boolean = false,
    val validationError: String? = null,
)
