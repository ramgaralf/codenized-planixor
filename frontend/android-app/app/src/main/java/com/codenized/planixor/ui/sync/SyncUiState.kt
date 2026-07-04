package com.codenized.planixor.ui.sync

import com.codenized.planixor.data.sync.ConnectionStatus
import com.codenized.planixor.data.sync.SyncConfig

/**
 * Holds pending username change data when a mismatch is detected during validation.
 * Used to trigger the confirmation dialog before wiping local data.
 */
data class PendingUsernameChange(
    val previousUsername: String,
    val newUsername: String,
    val pendingConfig: SyncConfig,
)

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
    val fieldErrors: Map<String, Int> = emptyMap(),
    val hasAttemptedSubmit: Boolean = false,
    val pendingUsernameChange: PendingUsernameChange? = null,
    val isDeletingData: Boolean = false,
)
