package com.codenized.planixor.ui.calendar

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.mutablePreferencesOf
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.updateAndGet

/**
 * In-memory DataStore implementation for unit testing.
 * Avoids needing a real file-backed DataStore in JVM tests.
 */
class FakeDataStore(
    initialPreferences: Preferences = mutablePreferencesOf(),
) : DataStore<Preferences> {

    private val _data = MutableStateFlow(initialPreferences)

    override val data: Flow<Preferences> = _data

    override suspend fun updateData(
        transform: suspend (t: Preferences) -> Preferences,
    ): Preferences {
        return _data.updateAndGet { current ->
            transform(current)
        }
    }
}
