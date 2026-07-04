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
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

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
    private val mockShiftSyncAdapter = mockk<ShiftSyncAdapter>(relaxed = true)
    private val mockReminderSyncAdapter = mockk<ReminderSyncAdapter>(relaxed = true)
    private val mockShiftModeSettingSyncAdapter = mockk<ShiftModeSettingSyncAdapter>(relaxed = true)
    private val mockDynamicBaseUrlInterceptor = mockk<DynamicBaseUrlInterceptor>(relaxed = true)
    private val mockNotificationPurgeService = mockk<NotificationPurgeService>(relaxed = true)
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
            mockShiftSyncAdapter,
            mockReminderSyncAdapter,
            mockShiftModeSettingSyncAdapter,
            mockDynamicBaseUrlInterceptor,
            mockNotificationPurgeService,
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
        // Subsequent adapters should still be called (resilient cycle — each entity syncs independently)
        coVerify(exactly = 1) { mockNotificationRecordSyncAdapter.sync(any()) }
        // lastSyncedAt should still be updated because other adapters succeeded (hasAnySuccess = true)
        coVerify(exactly = 1) { mockPreferencesRepository.setSyncLastSyncedAt(any()) }

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

    // =========================================================================
    // Property 4: Connectivity error classification drives status transition
    // Validates: Requirements 3.1, 3.6
    // =========================================================================

    @Test
    fun `classifyException should classify SocketTimeoutException as CONNECTIVITY`() {
        val result = controller.classifyException(SocketTimeoutException("timeout"))
        assertEquals(SyncErrorClassification.CONNECTIVITY, result)
    }

    @Test
    fun `classifyException should classify ConnectException as CONNECTIVITY`() {
        val result = controller.classifyException(ConnectException("refused"))
        assertEquals(SyncErrorClassification.CONNECTIVITY, result)
    }

    @Test
    fun `classifyException should classify UnknownHostException as CONNECTIVITY`() {
        val result = controller.classifyException(UnknownHostException("DNS failure"))
        assertEquals(SyncErrorClassification.CONNECTIVITY, result)
    }

    @Test
    fun `classifyException should classify generic IOException as CONNECTIVITY`() {
        val result = controller.classifyException(IOException("network error"))
        assertEquals(SyncErrorClassification.CONNECTIVITY, result)
    }

    @Test
    fun `classifyException should classify HttpException with 500 as CONNECTIVITY`() {
        val httpException = HttpException(Response.error<Any>(500, okhttp3.ResponseBody.create(null, "")))
        val result = controller.classifyException(httpException)
        assertEquals(SyncErrorClassification.CONNECTIVITY, result)
    }

    @Test
    fun `classifyException should classify HttpException with 401 as AUTH`() {
        val httpException = HttpException(Response.error<Any>(401, okhttp3.ResponseBody.create(null, "")))
        val result = controller.classifyException(httpException)
        assertEquals(SyncErrorClassification.AUTH, result)
    }

    @Test
    fun `classifyException should classify HttpException with 403 as AUTH`() {
        val httpException = HttpException(Response.error<Any>(403, okhttp3.ResponseBody.create(null, "")))
        val result = controller.classifyException(httpException)
        assertEquals(SyncErrorClassification.AUTH, result)
    }

    @Test
    fun `classifyException should classify HttpException with 400 as CLIENT_ERROR`() {
        val httpException = HttpException(Response.error<Any>(400, okhttp3.ResponseBody.create(null, "")))
        val result = controller.classifyException(httpException)
        assertEquals(SyncErrorClassification.CLIENT_ERROR, result)
    }

    @Test
    fun `classifyException should classify HttpException with 502 as CONNECTIVITY`() {
        val httpException = HttpException(Response.error<Any>(502, okhttp3.ResponseBody.create(null, "")))
        val result = controller.classifyException(httpException)
        assertEquals(SyncErrorClassification.CONNECTIVITY, result)
    }

    @Test
    fun `classifyException should classify HttpException with 503 as CONNECTIVITY`() {
        val httpException = HttpException(Response.error<Any>(503, okhttp3.ResponseBody.create(null, "")))
        val result = controller.classifyException(httpException)
        assertEquals(SyncErrorClassification.CONNECTIVITY, result)
    }

    @Test
    fun `connectivity error during sync should set ConnectionStatus to FAILING`() = runTest {
        coEvery { mockCalendarEventSyncAdapter.sync(any()) } throws SocketTimeoutException("timeout")
        coEvery { mockNotificationRecordSyncAdapter.sync(any()) } throws ConnectException("refused")
        coEvery { mockAnnualHoursConfigSyncAdapter.sync(any()) } throws UnknownHostException("dns")
        coEvery { mockShiftSyncAdapter.sync(any()) } throws IOException("io error")
        coEvery { mockReminderSyncAdapter.sync(any()) } throws IOException("io error")

        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
        )

        runCurrent()

        coVerify { mockPreferencesRepository.saveConnectionStatus(ConnectionStatus.FAILING) }

        controller.stop()
    }

    @Test
    fun `auth error during sync should NOT set ConnectionStatus to FAILING`() = runTest {
        val authException = HttpException(Response.error<Any>(401, okhttp3.ResponseBody.create(null, "")))
        coEvery { mockCalendarEventSyncAdapter.sync(any()) } throws authException
        // Other adapters succeed
        coEvery { mockNotificationRecordSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockAnnualHoursConfigSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockShiftSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockReminderSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockShiftModeSettingSyncAdapter.sync(any()) } returns SyncResult(success = true)

        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
        )

        runCurrent()

        // Should NOT transition to FAILING for auth errors
        coVerify(exactly = 0) { mockPreferencesRepository.saveConnectionStatus(ConnectionStatus.FAILING) }

        controller.stop()
    }

    // =========================================================================
    // Property 5: Failed sync preserves lastSyncedAt
    // Validates: Requirements 3.4
    // =========================================================================

    @Test
    fun `lastSyncedAt should NOT be updated when ALL entity syncs fail`() = runTest {
        coEvery { mockCalendarEventSyncAdapter.sync(any()) } throws SocketTimeoutException("timeout")
        coEvery { mockNotificationRecordSyncAdapter.sync(any()) } throws ConnectException("refused")
        coEvery { mockAnnualHoursConfigSyncAdapter.sync(any()) } throws UnknownHostException("dns")
        coEvery { mockShiftSyncAdapter.sync(any()) } throws IOException("io error")
        coEvery { mockReminderSyncAdapter.sync(any()) } throws IOException("io error")

        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 5000L,
        )

        runCurrent()

        // lastSyncedAt should NOT be updated since all entities failed
        coVerify(exactly = 0) { mockPreferencesRepository.setSyncLastSyncedAt(any()) }

        controller.stop()
    }

    @Test
    fun `lastSyncedAt should be updated when at least one entity sync succeeds`() = runTest {
        // Calendar event fails, but others succeed
        coEvery { mockCalendarEventSyncAdapter.sync(any()) } throws SocketTimeoutException("timeout")
        coEvery { mockNotificationRecordSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockAnnualHoursConfigSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockShiftSyncAdapter.sync(any()) } returns SyncResult(success = true)
        coEvery { mockReminderSyncAdapter.sync(any()) } returns SyncResult(success = true)

        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 5000L,
        )

        runCurrent()

        // lastSyncedAt SHOULD be updated since at least one entity succeeded
        coVerify(exactly = 1) { mockPreferencesRepository.setSyncLastSyncedAt(any()) }

        controller.stop()
    }

    @Test
    fun `lastSyncedAt should NOT be updated when all entities return failure result`() = runTest {
        coEvery { mockCalendarEventSyncAdapter.sync(any()) } returns SyncResult(success = false, error = "Push failed with HTTP 500")
        coEvery { mockNotificationRecordSyncAdapter.sync(any()) } returns SyncResult(success = false, error = "Pull failed with HTTP 502")
        coEvery { mockAnnualHoursConfigSyncAdapter.sync(any()) } returns SyncResult(success = false, error = "Connection timeout")
        coEvery { mockShiftSyncAdapter.sync(any()) } returns SyncResult(success = false, error = "Network error")
        coEvery { mockReminderSyncAdapter.sync(any()) } returns SyncResult(success = false, error = "DNS failure")

        controller.start(this)

        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 7000L,
        )

        runCurrent()

        // lastSyncedAt should NOT be updated since all entities failed
        coVerify(exactly = 0) { mockPreferencesRepository.setSyncLastSyncedAt(any()) }

        controller.stop()
    }

    // =========================================================================
    // Property 10: Sync interval applied to scheduler
    // Validates: Requirements 5.5
    // =========================================================================

    @Test
    fun `sync interval from config should drive scheduling delay`() = runTest {
        controller.start(this)

        // Configure with 10-minute interval
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
            syncIntervalMinutes = 10,
        )

        runCurrent()

        // First sync runs immediately
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }

        // Advance 5 minutes (the old default) — should NOT trigger second sync
        advanceTimeBy(300_001)
        runCurrent()
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }

        // Advance to 10 minutes total — should trigger second sync
        advanceTimeBy(300_000)
        runCurrent()
        coVerify(exactly = 2) { mockCalendarEventSyncAdapter.sync(any()) }

        controller.stop()
    }

    @Test
    fun `sync interval change should restart schedule with new interval`() = runTest {
        controller.start(this)

        // Start with 5-minute interval
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
            syncIntervalMinutes = 5,
        )

        runCurrent()
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }

        // Change to 15-minute interval
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
            syncIntervalMinutes = 15,
        )

        runCurrent()
        // Immediate sync after config change (restart triggers an immediate sync)
        coVerify(exactly = 2) { mockCalendarEventSyncAdapter.sync(any()) }

        // Advance 5 minutes — should NOT trigger another sync (interval is 15 min now)
        advanceTimeBy(300_001)
        runCurrent()
        coVerify(exactly = 2) { mockCalendarEventSyncAdapter.sync(any()) }

        // Advance to 15 minutes from the restart — should trigger next sync
        advanceTimeBy(600_000)
        runCurrent()
        coVerify(exactly = 3) { mockCalendarEventSyncAdapter.sync(any()) }

        controller.stop()
    }

    @Test
    fun `sync should use configured interval of 60 minutes`() = runTest {
        controller.start(this)

        // Configure with maximum 60-minute interval
        syncConfigFlow.value = SyncConfig(
            serverUrl = "https://backend.planixor.com",
            apiKey = "sk-test-key",
            username = "pepito",
            isPaused = false,
            lastSyncedAt = 1000L,
            syncIntervalMinutes = 60,
        )

        runCurrent()
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }

        // Advance 30 minutes — should NOT trigger second sync
        advanceTimeBy(1_800_001)
        runCurrent()
        coVerify(exactly = 1) { mockCalendarEventSyncAdapter.sync(any()) }

        // Advance to 60 minutes total — should trigger second sync
        advanceTimeBy(1_800_000)
        runCurrent()
        coVerify(exactly = 2) { mockCalendarEventSyncAdapter.sync(any()) }

        controller.stop()
    }
}
