package com.codenized.planixor.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.codenized.planixor.data.sync.SyncConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for reading and writing user preferences via DataStore.
 * Manages theme, active calendar view, locale, and sync configuration preferences.
 */
@Singleton
class PreferencesRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {

    val themeFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[KEY_THEME]
    }

    val activeViewFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[KEY_ACTIVE_VIEW]
    }

    val localeFlow: Flow<String?> = dataStore.data.map { preferences ->
        preferences[KEY_LOCALE]
    }

    /**
     * Emits the current SyncConfig if all required fields (serverUrl, apiKey, username)
     * are present, or null if sync has not been configured.
     */
    val syncConfigFlow: Flow<SyncConfig?> = dataStore.data.map { preferences ->
        val serverUrl = preferences[KEY_SYNC_SERVER_URL]
        val apiKey = preferences[KEY_SYNC_API_KEY]
        val username = preferences[KEY_SYNC_USERNAME]

        if (serverUrl != null && apiKey != null && username != null) {
            SyncConfig(
                serverUrl = serverUrl,
                apiKey = apiKey,
                username = username,
                isPaused = preferences[KEY_SYNC_IS_PAUSED] ?: false,
                lastSyncedAt = preferences[KEY_SYNC_LAST_SYNCED_AT],
            )
        } else {
            null
        }
    }

    suspend fun setTheme(value: String) {
        dataStore.edit { preferences ->
            preferences[KEY_THEME] = value
        }
    }

    suspend fun setActiveView(value: String) {
        dataStore.edit { preferences ->
            preferences[KEY_ACTIVE_VIEW] = value
        }
    }

    suspend fun setLocale(value: String) {
        dataStore.edit { preferences ->
            preferences[KEY_LOCALE] = value
        }
    }

    /**
     * Persists the sync configuration to local DataStore.
     * This data is device-local only and never synchronized.
     */
    suspend fun saveSyncConfig(config: SyncConfig) {
        dataStore.edit { preferences ->
            preferences[KEY_SYNC_SERVER_URL] = config.serverUrl
            preferences[KEY_SYNC_API_KEY] = config.apiKey
            preferences[KEY_SYNC_USERNAME] = config.username
            preferences[KEY_SYNC_IS_PAUSED] = config.isPaused
            if (config.lastSyncedAt != null) {
                preferences[KEY_SYNC_LAST_SYNCED_AT] = config.lastSyncedAt
            } else {
                preferences.remove(KEY_SYNC_LAST_SYNCED_AT)
            }
        }
    }

    /**
     * Removes all sync configuration from local DataStore.
     * Returns the device to an unconfigured sync state.
     */
    suspend fun clearSyncConfig() {
        dataStore.edit { preferences ->
            preferences.remove(KEY_SYNC_SERVER_URL)
            preferences.remove(KEY_SYNC_API_KEY)
            preferences.remove(KEY_SYNC_USERNAME)
            preferences.remove(KEY_SYNC_IS_PAUSED)
            preferences.remove(KEY_SYNC_LAST_SYNCED_AT)
        }
    }

    /**
     * Updates the isPaused flag for sync configuration.
     */
    suspend fun setSyncPaused(isPaused: Boolean) {
        dataStore.edit { preferences ->
            preferences[KEY_SYNC_IS_PAUSED] = isPaused
        }
    }

    /**
     * Updates the lastSyncedAt timestamp for sync configuration.
     */
    suspend fun setSyncLastSyncedAt(timestamp: Long) {
        dataStore.edit { preferences ->
            preferences[KEY_SYNC_LAST_SYNCED_AT] = timestamp
        }
    }

    /**
     * Clears all preferences from the DataStore.
     * Used during application reset to wipe all local configuration.
     */
    suspend fun clearAll() {
        dataStore.edit { it.clear() }
    }

    companion object {
        private val KEY_THEME = stringPreferencesKey("planixor_theme")
        private val KEY_ACTIVE_VIEW = stringPreferencesKey("planixor_active_view")
        private val KEY_LOCALE = stringPreferencesKey("planixor_locale")

        private val KEY_SYNC_SERVER_URL = stringPreferencesKey("sync_server_url")
        private val KEY_SYNC_API_KEY = stringPreferencesKey("sync_api_key")
        private val KEY_SYNC_USERNAME = stringPreferencesKey("sync_username")
        private val KEY_SYNC_IS_PAUSED = booleanPreferencesKey("sync_is_paused")
        private val KEY_SYNC_LAST_SYNCED_AT = longPreferencesKey("sync_last_synced_at")
    }
}
