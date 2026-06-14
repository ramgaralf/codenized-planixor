package com.codenized.planixor.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for reading and writing user preferences via DataStore.
 * Manages theme, active calendar view, and locale preferences.
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

    companion object {
        private val KEY_THEME = stringPreferencesKey("planixor_theme")
        private val KEY_ACTIVE_VIEW = stringPreferencesKey("planixor_active_view")
        private val KEY_LOCALE = stringPreferencesKey("planixor_locale")
    }
}
