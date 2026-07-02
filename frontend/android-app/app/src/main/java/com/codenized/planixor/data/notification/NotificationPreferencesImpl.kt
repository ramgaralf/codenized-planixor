package com.codenized.planixor.data.notification

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * DataStore-backed implementation of [NotificationPreferences].
 * Persists the notification channel preference as a string key in the shared DataStore.
 * Defaults to [NotificationChannel.APP] when no value is persisted.
 */
@Singleton
class NotificationPreferencesImpl @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) : NotificationPreferences {

    override val channelFlow: Flow<NotificationChannel> = dataStore.data.map { preferences ->
        val stored = preferences[KEY_NOTIFICATION_CHANNEL]
        stored?.let { parseChannel(it) } ?: NotificationChannel.APP
    }

    override suspend fun setChannel(channel: NotificationChannel) {
        dataStore.edit { preferences ->
            preferences[KEY_NOTIFICATION_CHANNEL] = channel.name
        }
    }

    private fun parseChannel(value: String): NotificationChannel {
        return try {
            NotificationChannel.valueOf(value)
        } catch (_: IllegalArgumentException) {
            NotificationChannel.APP
        }
    }

    companion object {
        private val KEY_NOTIFICATION_CHANNEL = stringPreferencesKey("notification_channel")
    }
}
