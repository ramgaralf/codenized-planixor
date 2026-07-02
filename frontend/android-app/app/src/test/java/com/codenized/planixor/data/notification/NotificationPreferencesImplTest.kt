package com.codenized.planixor.data.notification

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import app.cash.turbine.test
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationPreferencesImplTest {

    @get:Rule
    val tmpFolder = TemporaryFolder()

    private val testDispatcher = UnconfinedTestDispatcher()
    private val testScope = TestScope(testDispatcher + Job())

    private fun createDataStore(): DataStore<Preferences> {
        return PreferenceDataStoreFactory.create(
            scope = testScope,
            produceFile = { tmpFolder.newFile("test_preferences.preferences_pb") },
        )
    }

    @Test
    fun `channelFlow should default to APP when no value is persisted`() = runTest {
        val dataStore = createDataStore()
        val preferences = NotificationPreferencesImpl(dataStore)

        preferences.channelFlow.test {
            assertEquals(NotificationChannel.APP, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `setChannel should persist APP and emit it`() = runTest {
        val dataStore = createDataStore()
        val preferences = NotificationPreferencesImpl(dataStore)

        preferences.setChannel(NotificationChannel.APP)

        preferences.channelFlow.test {
            assertEquals(NotificationChannel.APP, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `setChannel should persist SYSTEM and emit it`() = runTest {
        val dataStore = createDataStore()
        val preferences = NotificationPreferencesImpl(dataStore)

        preferences.setChannel(NotificationChannel.SYSTEM)

        preferences.channelFlow.test {
            assertEquals(NotificationChannel.SYSTEM, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `setChannel should persist BOTH and emit it`() = runTest {
        val dataStore = createDataStore()
        val preferences = NotificationPreferencesImpl(dataStore)

        preferences.setChannel(NotificationChannel.BOTH)

        preferences.channelFlow.test {
            assertEquals(NotificationChannel.BOTH, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `channelFlow should emit updated value when channel changes`() = runTest {
        val dataStore = createDataStore()
        val preferences = NotificationPreferencesImpl(dataStore)

        preferences.channelFlow.test {
            assertEquals(NotificationChannel.APP, awaitItem())

            preferences.setChannel(NotificationChannel.SYSTEM)
            assertEquals(NotificationChannel.SYSTEM, awaitItem())

            preferences.setChannel(NotificationChannel.APP)
            assertEquals(NotificationChannel.APP, awaitItem())

            cancelAndIgnoreRemainingEvents()
        }
    }
}
