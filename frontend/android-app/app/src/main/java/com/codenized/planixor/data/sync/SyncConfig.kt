package com.codenized.planixor.data.sync

/**
 * Device-local synchronization configuration.
 * Contains credentials and state needed to communicate with the sync server.
 * This data is NEVER synchronized — it remains exclusive to the device.
 */
data class SyncConfig(
    val serverUrl: String,
    val apiKey: String,
    val username: String,
    val isPaused: Boolean = false,
    val lastSyncedAt: Long? = null,
)
