package com.codenized.planixor.data.notification

/**
 * Represents the user's preferred notification delivery channel.
 * Stored device-locally via DataStore preferences (not synced).
 */
enum class NotificationChannel {
    APP,
    SYSTEM,
    BOTH,
}
