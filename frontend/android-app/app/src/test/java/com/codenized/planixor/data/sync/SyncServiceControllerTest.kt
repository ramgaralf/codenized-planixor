package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.PreferencesRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for SyncServiceController.
 * Verifies pause/resume bridge logic, observer lifecycle management,
 * and periodic sync scheduling with adapters.
 *
 * Validates: Requirements 10.3, 10.4
 */
@OptIn(ExperimentalCoroutinesApi::class)
class SyncServiceControllerTest {

    private val mockPreferencesRepository = mockk<PreferencesRepository>(relaxed = true)
    private val mockCalendarEventSyncAdapter = mockk<CalendarEventSyncAdapter>(relaxed = true)
    private val mockNotificationRecordSyncAdapter = mockk<NotificationRecordSyncAdapter>(relaxed = true)
    private val mockAnnualHoursConfigSyncAdapter = mockk<AnnualHoursConfigSyncAdapter>(relaxed = true)
    private val syncConfigFlow = MutableStateFlow<SyncConfig?>(null)
    private lateinit var controller: SyncServiceController

    @Before
    fun setup() {
        every { mockPreferencesRepository.syncConfigFlow } returns syncConfigFlow
        coEvery { mockCalendarEventSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockNotificationRecordSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockAnnualHoursConfigSyncAdapter.sync(any()) } returns SyncResult(success = true)
        controller = SyncServiceController(
            mockPreferencesRepository,
            mockCalendarEventSyncAdapter,
            mockNotificationRecordSyncAdapter,
            mockAnnualHoursConfigSyncAdapter,
        )
    }

    @Test
    fun `isSyncAllowed should return false when config is null`() {
        assertFalse(controller.isSyncAllowed(null))
    }

    @Test
    fun `isSyncAllowed should return false when config isPaused is true`() {
        val pausedConfig = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = true,
        )
        assertFalse(controller.isSyncAllowed(pausedConfig))
    }

    @Test
    fun `isSyncAllowed should return true when config is present and not paused`() {
        val activeConfig = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
        )
        assertTrue(controller.isSyncAllowed(activeConfig))
    }

    @Test
    fun `start should observe syncConfigFlow and trigger sync when config is active`() = runTest {
        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
        )

        runCurrent()

        coVerify { mockCalendarEventSyncAdapter.sync(1000L) }
        coVerify { mockNotificationRecordSyncAdapter.sync(1000L) }
        coVerify { mockAnnualHoursConfigSyncAdapter.sync(1000L) }

        controller.stop()
    }

    @Test
    fun `start should not create duplicate observers when called multiple times`() = runTest {
        controller.start(this)
        controller.start(this)
        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = true,
        )

        runCurrent()

        // When paused, no sync adapters should be called
        coVerify(exactly = 0) { mockCalendarEventSyncAdapter.sync(any()) }

        controller.stop()
    }

    @Test
    fun `stop should cancel the observer and sync jobs`() = runTest {
        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 100L,
        )

        runCurrent()

        // Verify first sync ran
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(100L) }

        controller.stop()

        // Advance past the interval — no additional syncs should happen
        advanceTimeBy(400_000)
        runCurrent()

        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }
    }

    @Test
    fun `scheduleSyncWorker should run immediate sync cycle when config is active`() = runTest {
        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
        )

        runCurrent()

        coVerify { mockCalendarEventSyncAdapter.sync(1000L) }
        coVerify { mockNotificationRecordSyncAdapter.sync(1000L) }
        coVerify { mockAnnualHoursConfigSyncAdapter.sync(1000L) }
        coVerify { mockPreferencesRepository.setSyncLastSyncedAt(any()) }

        controller.stop()
    }

    @Test
    fun `scheduleSyncWorker should run periodic sync after interval`() = runTest {
        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
        )

        runCurrent()

        // First sync ran immediately
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }

        // Advance past the 5-minute interval
        advanceTimeBy(300_001)
        runCurrent()

        // Second sync should have run
        coVerify(exactly = 2) { mockCalendarEventSyncAdapter.sync(any()) }

        controller.stop()
    }

    @Test
    fun `cancelSyncSchedule should stop periodic sync when config becomes paused`() = runTest {
        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 2000L,
        )

        runCurrent()

        // First sync ran
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(2000L) }

        // Now pause
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = true,
        )

        runCurrent()

        // Advance past what would be the next sync interval
        advanceTimeBy(400_000)
        runCurrent()

        // Only one sync cycle should have run total
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }

        controller.stop()
    }

    @Test
    fun `performSyncCycle should not crash when adapter throws exception`() = runTest {
        coEvery { mockCalendarEventSyncAdapter.sync(any()) } throws RuntimeException("Network error")

        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 500L,
        )

        runCurrent()

        // Should not crash — error is caught and logged
        coVerify { mockCalendarEventSyncAdapter.sync(500L) }
        // Subsequent adapters should not be called since first threw
        coVerify(exactly = 0) { mockNotificationRecordSyncAdapter.sync(any()) }
        // lastSyncedAt should not be updated on failure
        coVerify(exactly = 0) { mockPreferencesRepository.setSyncLastSyncedAt(any()) }

        controller.stop()
    }

    @Test
    fun `cancelSyncSchedule should stop sync when config becomes null`() = runTest {
        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 3000L,
        )

        runCurrent()

        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(3000L) }

        // Set config to null (user cleared config)
        syncConfigFlow.value = null
        runCurrent()

        // Advance past interval
        advanceTimeBy(400_000)
        runCurrent()

        // No additional sync should have run
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }

        controller.stop()
    }
}
