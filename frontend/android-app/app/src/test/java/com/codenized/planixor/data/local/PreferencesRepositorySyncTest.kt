package com.codenized.planixor.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.preferencesOf
import androidx.datastore.preferences.core.stringPreferencesKey
import app.cash.turbine.test
import com.codenized.planixor.data.sync.SyncConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Fake in-memory DataStore for unit testing PreferencesRepository sync methods.
 * Replicates DataStore behavior without requiring Android context.
 */
class FakeDataStore : DataStore<Preferences> {
    private val state = MutableStateFlow(preferencesOf())

    override val data: Flow<Preferences> = state

    override suspend fun updateData(transform: suspend (t: Preferences) -> Preferences): Preferences {
        val current = state.value.toMutablePreferences()
        val result = transform(current)
        state.value = result
        return result
    }
}

/**
 * Unit tests for PreferencesRepository sync-related methods.
 * Tests config persistence, emission, clearing, and pause control via DataStore.
 *
 * Validates: Requirements 5.1, 6.1, 7.1
 */
class PreferencesRepositorySyncTest {

    private lateinit var fakeDataStore: FakeDataStore
    private lateinit var repository: PreferencesRepository

    @Before
    fun setUp() {
        fakeDataStore = FakeDataStore()
        repository = PreferencesRepository(fakeDataStore)
    }

    @Test
    fun `syncConfigFlow should emit null when no sync config is stored`() = runTest {
        val config = repository.syncConfigFlow.first()
        assertNull(config)
    }

    @Test
    fun `syncConfigFlow should emit SyncConfig when all required fields are present`() = runTest {
        repository.saveSyncConfig(
            SyncConfig(
                serverUrl = "https://backend.planixor.com",
                apiKey = "sk-test-key-123",
                username = "pepito",
                isPaused = false,
                lastSyncedAt = 1_700_000_000_000L,
            ),
        )

        val config = repository.syncConfigFlow.first()

        assertEquals("https://backend.planixor.com", config?.serverUrl)
        assertEquals("sk-test-key-123", config?.apiKey)
        assertEquals("pepito", config?.username)
        assertFalse(config!!.isPaused)
        assertEquals(1_700_000_000_000L, config.lastSyncedAt)
    }

    @Test
    fun `saveSyncConfig should persist all fields`() = runTest {
        val input = SyncConfig(
            serverUrl = "https://api.example.com",
            apiKey = "sk-key-456",
            username = "maria",
            isPaused = true,
            lastSyncedAt = 1_650_000_000_000L,
        )

        repository.saveSyncConfig(input)

        val config = repository.syncConfigFlow.first()
        assertEquals(input.serverUrl, config?.serverUrl)
        assertEquals(input.apiKey, config?.apiKey)
        assertEquals(input.username, config?.username)
        assertEquals(input.isPaused, config?.isPaused)
        assertEquals(input.lastSyncedAt, config?.lastSyncedAt)
    }

    @Test
    fun `clearSyncConfig should remove all sync fields`() = runTest {
        repository.saveSyncConfig(
            SyncConfig(
                serverUrl = "https://backend.planixor.com",
                apiKey = "sk-test-key",
                username = "pepito",
                isPaused = true,
                lastSyncedAt = 1_700_000_000_000L,
            ),
        )

        repository.clearSyncConfig()

        val config = repository.syncConfigFlow.first()
        assertNull(config)
    }

    @Test
    fun `setSyncPaused should update only the isPaused field`() = runTest {
        repository.saveSyncConfig(
            SyncConfig(
                serverUrl = "https://backend.planixor.com",
                apiKey = "sk-test-key",
                username = "pepito",
                isPaused = false,
                lastSyncedAt = null,
            ),
        )

        repository.setSyncPaused(true)

        val config = repository.syncConfigFlow.first()
        assertTrue(config!!.isPaused)
        assertEquals("https://backend.planixor.com", config.serverUrl)
        assertEquals("sk-test-key", config.apiKey)
        assertEquals("pepito", config.username)
    }
}
