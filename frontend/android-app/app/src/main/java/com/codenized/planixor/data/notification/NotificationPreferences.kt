package com.codenized.planixor.data.notification

import kotlinx.coroutines.flow.Flow

/**
 * Device-local notification preferences for configuring the delivery channel.
 * Not synced across devices — this is purely device-specific behavior.
 */
interface NotificationPreferences {
    val channelFlow: Flow<NotificationChannel>
    suspend fun setChannel(channel: NotificationChannel)
}
