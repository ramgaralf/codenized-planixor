package com.codenized.planixor.data.sync

/**
 * Represents the current state of the synchronization connection.
 */
enum class ConnectionStatus {
    UNCONFIGURED,
    ACTIVE,
    FAILING,
    PAUSED,
}
