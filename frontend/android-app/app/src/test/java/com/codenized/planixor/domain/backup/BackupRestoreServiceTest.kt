package com.codenized.planixor.domain.backup

import androidx.room.withTransaction
import com.codenized.planixor.data.local.AnnualHoursConfigDao
import com.codenized.planixor.data.local.AnnualHoursConfigEntity
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.NotificationRecordEntity
import com.codenized.planixor.data.local.PlanixorDatabase
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ReminderEntity
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftEntity
import com.codenized.planixor.data.sync.SyncConfig
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkStatic
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [BackupRestoreService].
 * Validates LWW merge logic, dependency order, per-entity atomicity,
 * syncedAt reset, sync config handling, and orphaned FK preservation.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.9, 8.10
 */
class BackupRestoreServiceTest {

    private lateinit var shiftDao: ShiftDao
    private lateinit var reminderDao: ReminderDao
    private lateinit var calendarEventDao: CalendarEventDao
    private lateinit var notificationRecordDao: NotificationRecordDao
    private lateinit var annualHoursConfigDao: AnnualHoursConfigDao
    private lateinit var preferencesRepository: PreferencesRepository
    private lateinit var database: PlanixorDatabase
    private lateinit var service: BackupRestoreService

    @Before
    fun setup() {
        shiftDao = mockk(relaxed = true)
        reminderDao = mockk(relaxed = true)
        calendarEventDao = mockk(relaxed = true)
        notificationRecordDao = mockk(relaxed = true)
        annualHoursConfigDao = mockk(relaxed = true)
        preferencesRepository = mockk(relaxed = true)
        database = mockk(relaxed = true)

        // Mock the Room withTransaction extension function to simply execute the block.
        // withTransaction is defined in androidx.room.RoomDatabaseKt
        mockkStatic(
            "androidx.room.RoomDatabaseKt"
        )
        val dbSlot = slot<suspend () -> Any?>()
        coEvery {
            any<PlanixorDatabase>().withTransaction(capture(dbSlot))
        } coAnswers {
            dbSlot.captured.invoke()
        }

        service = BackupRestoreService(
            shiftDao = shiftDao,
            reminderDao = reminderDao,
            calendarEventDao = calendarEventDao,
            notificationRecordDao = notificationRecordDao,
            annualHoursConfigDao = annualHoursConfigDao,
            preferencesRepository = preferencesRepository,
            database = database,
        )
    }

    @After
    fun tearDown() {
        unmockkStatic("androidx.room.RoomDatabaseKt")
    }

    // --- Test 1: Fresh insert — all records inserted ---

    @Test
    fun `restore should insert all records when no existing data`() = runTest {
        coEvery { shiftDao.getById(any()) } returns null
        coEvery { reminderDao.getById(any()) } returns null
        coEvery { calendarEventDao.getById(any()) } returns null
        coEvery { notificationRecordDao.getById(any()) } returns null
        coEvery { annualHoursConfigDao.getById(any()) } returns null
        coEvery { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val backup = createBackupWithOneOfEach()

        val result = service.restore(backup, hasExistingData = false)

        assertTrue(result.success)
        assertEquals(6, result.restoredCount)
        coVerify(exactly = 1) { shiftDao.upsert(any()) }
        coVerify(exactly = 1) { reminderDao.upsert(any()) }
        coVerify(exactly = 1) { calendarEventDao.insert(any()) }
        coVerify(exactly = 1) { notificationRecordDao.insert(any()) }
        coVerify(exactly = 1) { annualHoursConfigDao.upsert(any()) }
        coVerify(exactly = 1) { preferencesRepository.saveSyncConfig(any()) }
    }

    // --- Test 2: LWW merge — backup wins ---

    @Test
    fun `restore should update when backup modifiedAt is newer than local`() = runTest {
        val localModifiedAt = 1000L
        val backupModifiedAt = "2025-01-01T00:00:02Z" // 1735689602000ms - newer

        coEvery { shiftDao.getById("shift-1") } returns ShiftEntity(
            id = "shift-1", name = "Old", icon = "\u2600\uFE0F", backgroundColor = "#EF4444",
            startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
            createdAt = 500L, modifiedAt = localModifiedAt, syncedAt = 500L, isDeleted = false,
        )

        val backup = createMinimalBackup(
            shifts = listOf(
                BackupShift(
                    id = "shift-1", name = "Updated", icon = "\uD83C\uDF19", backgroundColor = "#2563EB",
                    startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
                    createdAt = "2025-01-01T00:00:00Z", modifiedAt = backupModifiedAt,
                    syncedAt = null, isDeleted = false,
                )
            )
        )

        val result = service.restore(backup, hasExistingData = true)

        assertTrue(result.success)
        assertEquals(1, result.restoredCount)
        val shiftSlot = slot<ShiftEntity>()
        coVerify { shiftDao.upsert(capture(shiftSlot)) }
        assertEquals("Updated", shiftSlot.captured.name)
    }

    // --- Test 3: LWW merge — local wins ---

    @Test
    fun `restore should skip when local modifiedAt is newer than backup`() = runTest {
        val localModifiedAt = 1735689610000L // 2025-01-01T00:00:10Z - newer
        val backupModifiedAt = "2025-01-01T00:00:02Z" // 1735689602000ms - older

        coEvery { shiftDao.getById("shift-1") } returns ShiftEntity(
            id = "shift-1", name = "Local", icon = "\u2600\uFE0F", backgroundColor = "#EF4444",
            startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
            createdAt = 500L, modifiedAt = localModifiedAt, syncedAt = 1000L, isDeleted = false,
        )

        val backup = createMinimalBackup(
            shifts = listOf(
                BackupShift(
                    id = "shift-1", name = "Backup", icon = "\uD83C\uDF19", backgroundColor = "#2563EB",
                    startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
                    createdAt = "2025-01-01T00:00:00Z", modifiedAt = backupModifiedAt,
                    syncedAt = null, isDeleted = false,
                )
            )
        )

        val result = service.restore(backup, hasExistingData = true)

        assertTrue(result.success)
        assertEquals(0, result.restoredCount)
        coVerify(exactly = 0) { shiftDao.upsert(any()) }
    }

    // --- Test 4: LWW merge — equal timestamps, local wins ---

    @Test
    fun `restore should skip when timestamps are equal`() = runTest {
        val epochMillis = 1735689602000L // 2025-01-01T00:00:02Z
        val backupModifiedAt = "2025-01-01T00:00:02Z" // same

        coEvery { shiftDao.getById("shift-1") } returns ShiftEntity(
            id = "shift-1", name = "Local", icon = "\u2600\uFE0F", backgroundColor = "#EF4444",
            startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
            createdAt = 500L, modifiedAt = epochMillis, syncedAt = 1000L, isDeleted = false,
        )

        val backup = createMinimalBackup(
            shifts = listOf(
                BackupShift(
                    id = "shift-1", name = "Backup", icon = "\uD83C\uDF19", backgroundColor = "#2563EB",
                    startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
                    createdAt = "2025-01-01T00:00:00Z", modifiedAt = backupModifiedAt,
                    syncedAt = null, isDeleted = false,
                )
            )
        )

        val result = service.restore(backup, hasExistingData = true)

        assertTrue(result.success)
        assertEquals(0, result.restoredCount)
        coVerify(exactly = 0) { shiftDao.upsert(any()) }
    }

    // --- Test 5: Soft-deleted record merge ---

    @Test
    fun `restore should merge soft-deleted backup record when newer`() = runTest {
        coEvery { shiftDao.getById("shift-del") } returns ShiftEntity(
            id = "shift-del", name = "Active", icon = "\u2600\uFE0F", backgroundColor = "#EF4444",
            startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
            createdAt = 500L, modifiedAt = 1000L, syncedAt = 500L, isDeleted = false,
        )

        val backup = createMinimalBackup(
            shifts = listOf(
                BackupShift(
                    id = "shift-del", name = "Deleted", icon = "\u2600\uFE0F", backgroundColor = "#EF4444",
                    startTime = 480, endTime = 960, hoursWorked = 480, isActive = false,
                    createdAt = "1970-01-01T00:00:00Z", modifiedAt = "2025-01-01T00:00:00Z",
                    syncedAt = null, isDeleted = true,
                )
            )
        )

        val result = service.restore(backup, hasExistingData = true)

        assertTrue(result.success)
        assertEquals(1, result.restoredCount)
        val shiftSlot = slot<ShiftEntity>()
        coVerify { shiftDao.upsert(capture(shiftSlot)) }
        assertTrue(shiftSlot.captured.isDeleted)
    }

    // --- Test 6: Sync config — local exists, skip ---

    @Test
    fun `restore should skip sync config when local config exists`() = runTest {
        coEvery { shiftDao.getById(any()) } returns null
        coEvery { reminderDao.getById(any()) } returns null
        coEvery { calendarEventDao.getById(any()) } returns null
        coEvery { notificationRecordDao.getById(any()) } returns null
        coEvery { annualHoursConfigDao.getById(any()) } returns null
        coEvery { preferencesRepository.syncConfigFlow } returns flowOf(
            SyncConfig(
                serverUrl = "https://existing.com",
                apiKey = "existing-key",
                username = "user",
            )
        )

        val backup = createMinimalBackup(
            syncConfig = listOf(
                BackupSyncConfig(
                    serverUrl = "https://backup.com",
                    apiKey = "backup-key",
                    username = "backupuser",
                    apiBasePath = "/api",
                    syncIntervalMinutes = 10,
                    isPaused = false,
                    lastSyncedAt = null,
                )
            )
        )

        val result = service.restore(backup, hasExistingData = true)

        assertTrue(result.success)
        coVerify(exactly = 0) { preferencesRepository.saveSyncConfig(any()) }
    }

    // --- Test 7: Sync config — no local, insert ---

    @Test
    fun `restore should insert sync config when no local config exists`() = runTest {
        coEvery { shiftDao.getById(any()) } returns null
        coEvery { reminderDao.getById(any()) } returns null
        coEvery { calendarEventDao.getById(any()) } returns null
        coEvery { notificationRecordDao.getById(any()) } returns null
        coEvery { annualHoursConfigDao.getById(any()) } returns null
        coEvery { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val backup = createMinimalBackup(
            syncConfig = listOf(
                BackupSyncConfig(
                    serverUrl = "https://backup.com",
                    apiKey = "backup-key",
                    username = "backupuser",
                    apiBasePath = "/api",
                    syncIntervalMinutes = 10,
                    isPaused = false,
                    lastSyncedAt = null,
                )
            )
        )

        val result = service.restore(backup, hasExistingData = false)

        assertTrue(result.success)
        val configSlot = slot<SyncConfig>()
        coVerify(exactly = 1) { preferencesRepository.saveSyncConfig(capture(configSlot)) }
        assertEquals("https://backup.com", configSlot.captured.serverUrl)
        assertEquals("backup-key", configSlot.captured.apiKey)
        assertEquals("backupuser", configSlot.captured.username)
    }

    // --- Test 8: Per-entity atomicity — one table fails, others succeed ---

    @Test
    fun `restore should continue with other entities when one fails`() = runTest {
        coEvery { shiftDao.getById(any()) } throws RuntimeException("DB error")
        coEvery { reminderDao.getById(any()) } returns null
        coEvery { calendarEventDao.getById(any()) } returns null
        coEvery { notificationRecordDao.getById(any()) } returns null
        coEvery { annualHoursConfigDao.getById(any()) } returns null
        coEvery { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val backup = createBackupWithOneOfEach()

        val result = service.restore(backup, hasExistingData = false)

        assertEquals(false, result.success)
        assertTrue(result.failedEntities.contains("shifts"))
        assertTrue(result.succeededEntities.contains("reminders"))
        assertTrue(result.succeededEntities.contains("calendarEvents"))
        assertTrue(result.succeededEntities.contains("notificationRecords"))
        assertTrue(result.succeededEntities.contains("annualHoursConfig"))
        assertTrue(result.succeededEntities.contains("syncConfig"))
    }

    // --- Test 9: SyncedAt reset to null ---

    @Test
    fun `restore should set syncedAt to null on inserted records`() = runTest {
        coEvery { shiftDao.getById(any()) } returns null
        coEvery { reminderDao.getById(any()) } returns null
        coEvery { calendarEventDao.getById(any()) } returns null
        coEvery { notificationRecordDao.getById(any()) } returns null
        coEvery { annualHoursConfigDao.getById(any()) } returns null
        coEvery { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val backup = createBackupWithOneOfEach()

        service.restore(backup, hasExistingData = false)

        val shiftSlot = slot<ShiftEntity>()
        coVerify { shiftDao.upsert(capture(shiftSlot)) }
        assertNull(shiftSlot.captured.syncedAt)

        val reminderSlot = slot<ReminderEntity>()
        coVerify { reminderDao.upsert(capture(reminderSlot)) }
        assertNull(reminderSlot.captured.syncedAt)

        val calEventSlot = slot<CalendarEventEntity>()
        coVerify { calendarEventDao.insert(capture(calEventSlot)) }
        assertNull(calEventSlot.captured.syncedAt)

        val notifSlot = slot<NotificationRecordEntity>()
        coVerify { notificationRecordDao.insert(capture(notifSlot)) }
        assertNull(notifSlot.captured.syncedAt)

        val annualSlot = slot<AnnualHoursConfigEntity>()
        coVerify { annualHoursConfigDao.upsert(capture(annualSlot)) }
        assertNull(annualSlot.captured.syncedAt)
    }

    @Test
    fun `restore should set syncedAt to null on updated records`() = runTest {
        coEvery { shiftDao.getById("shift-1") } returns ShiftEntity(
            id = "shift-1", name = "Local", icon = "\u2600\uFE0F", backgroundColor = "#EF4444",
            startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
            createdAt = 500L, modifiedAt = 1000L, syncedAt = 900L, isDeleted = false,
        )

        val backup = createMinimalBackup(
            shifts = listOf(
                BackupShift(
                    id = "shift-1", name = "Newer", icon = "\uD83C\uDF19", backgroundColor = "#2563EB",
                    startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
                    createdAt = "1970-01-01T00:00:00Z", modifiedAt = "2025-01-01T00:00:00Z",
                    syncedAt = "2025-01-01T00:00:00Z", isDeleted = false,
                )
            )
        )

        service.restore(backup, hasExistingData = true)

        val shiftSlot = slot<ShiftEntity>()
        coVerify { shiftDao.upsert(capture(shiftSlot)) }
        assertNull(shiftSlot.captured.syncedAt)
    }

    // --- Test 10: Orphaned FK — calendar event with missing shift ---

    @Test
    fun `restore should insert calendar event referencing non-existent shift`() = runTest {
        coEvery { calendarEventDao.getById(any()) } returns null
        coEvery { shiftDao.getById(any()) } returns null
        coEvery { reminderDao.getById(any()) } returns null
        coEvery { notificationRecordDao.getById(any()) } returns null
        coEvery { annualHoursConfigDao.getById(any()) } returns null
        coEvery { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val backup = createMinimalBackup(
            calendarEvents = listOf(
                BackupCalendarEvent(
                    id = "event-orphan",
                    eventType = "shift",
                    eventTypeId = "non-existent-shift-id",
                    startDay = "2025-01-15",
                    endDay = "2025-01-15",
                    startTime = 480,
                    endTime = 960,
                    totalHours = 480,
                    notes = null,
                    alertOffsets = emptyList(),
                    modifiedAt = "2025-01-01T00:00:01Z",
                    syncedAt = null,
                    isDeleted = false,
                )
            )
        )

        val result = service.restore(backup, hasExistingData = false)

        assertTrue(result.success)
        val eventSlot = slot<CalendarEventEntity>()
        coVerify { calendarEventDao.insert(capture(eventSlot)) }
        assertEquals("non-existent-shift-id", eventSlot.captured.eventTypeId)
    }

    // --- Test: Dependency order ---

    @Test
    fun `restore should process entities in dependency order`() = runTest {
        val callOrder = mutableListOf<String>()

        coEvery { shiftDao.getById(any()) } coAnswers {
            callOrder.add("shifts")
            null
        }
        coEvery { reminderDao.getById(any()) } coAnswers {
            callOrder.add("reminders")
            null
        }
        coEvery { calendarEventDao.getById(any()) } coAnswers {
            callOrder.add("calendarEvents")
            null
        }
        coEvery { notificationRecordDao.getById(any()) } coAnswers {
            callOrder.add("notificationRecords")
            null
        }
        coEvery { annualHoursConfigDao.getById(any()) } coAnswers {
            callOrder.add("annualHoursConfig")
            null
        }
        coEvery { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val backup = createBackupWithOneOfEach()

        service.restore(backup, hasExistingData = false)

        val shiftIdx = callOrder.indexOf("shifts")
        val reminderIdx = callOrder.indexOf("reminders")
        val calEventIdx = callOrder.indexOf("calendarEvents")
        val notifIdx = callOrder.indexOf("notificationRecords")
        val annualIdx = callOrder.indexOf("annualHoursConfig")

        assertTrue("Shifts should be processed before reminders", shiftIdx < reminderIdx)
        assertTrue("Reminders should be processed before calendarEvents", reminderIdx < calEventIdx)
        assertTrue("CalendarEvents should be processed before notificationRecords", calEventIdx < notifIdx)
        assertTrue("NotificationRecords should be processed before annualHoursConfig", notifIdx < annualIdx)
    }

    // --- Helper methods ---

    private fun createBackupWithOneOfEach(): BackupFile = BackupFile(
        metadata = BackupMetadata(
            createdAt = "2025-01-01T00:00:00Z",
            appVersion = "1.0.0",
            platform = "android",
            schemaVersion = 1,
        ),
        data = BackupData(
            shifts = listOf(
                BackupShift(
                    id = "shift-1", name = "Morning", icon = "\u2600\uFE0F", backgroundColor = "#10B981",
                    startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
                    createdAt = "2025-01-01T00:00:00Z", modifiedAt = "2025-01-01T00:00:01Z",
                    syncedAt = null, isDeleted = false,
                )
            ),
            reminders = listOf(
                BackupReminder(
                    id = "reminder-1", name = "Take meds", icon = "\uD83D\uDC8A", backgroundColor = "#2563EB",
                    isActive = true, createdAt = "2025-01-01T00:00:00Z",
                    modifiedAt = "2025-01-01T00:00:01Z", syncedAt = null, isDeleted = false,
                )
            ),
            calendarEvents = listOf(
                BackupCalendarEvent(
                    id = "event-1", eventType = "shift", eventTypeId = "shift-1",
                    startDay = "2025-01-15", endDay = "2025-01-15", startTime = 480,
                    endTime = 960, totalHours = 480, notes = null, alertOffsets = listOf(10),
                    modifiedAt = "2025-01-01T00:00:01Z", syncedAt = null, isDeleted = false,
                )
            ),
            notificationRecords = listOf(
                BackupNotificationRecord(
                    id = "notif-1", calendarEventId = "event-1", alertOffset = 10,
                    triggerTime = "2025-01-15T07:50:00Z", isDelivered = false, isRead = false,
                    modifiedAt = "2025-01-01T00:00:01Z", syncedAt = null, isDeleted = false,
                )
            ),
            annualHoursConfig = listOf(
                BackupAnnualHoursConfig(
                    id = "ahc-1", year = 2025, configuredHours = 1800,
                    modifiedAt = "2025-01-01T00:00:01Z", syncedAt = null, isDeleted = false,
                )
            ),
            syncConfig = listOf(
                BackupSyncConfig(
                    serverUrl = "https://sync.planixor.com",
                    apiKey = "test-key",
                    username = "testuser",
                    apiBasePath = "/api",
                    syncIntervalMinutes = 5,
                    isPaused = false,
                    lastSyncedAt = null,
                )
            ),
        ),
    )

    private fun createMinimalBackup(
        shifts: List<BackupShift> = emptyList(),
        reminders: List<BackupReminder> = emptyList(),
        calendarEvents: List<BackupCalendarEvent> = emptyList(),
        notificationRecords: List<BackupNotificationRecord> = emptyList(),
        annualHoursConfig: List<BackupAnnualHoursConfig> = emptyList(),
        syncConfig: List<BackupSyncConfig> = emptyList(),
    ): BackupFile = BackupFile(
        metadata = BackupMetadata(
            createdAt = "2025-01-01T00:00:00Z",
            appVersion = "1.0.0",
            platform = "android",
            schemaVersion = 1,
        ),
        data = BackupData(
            shifts = shifts,
            reminders = reminders,
            calendarEvents = calendarEvents,
            notificationRecords = notificationRecords,
            annualHoursConfig = annualHoursConfig,
            syncConfig = syncConfig,
        ),
    )
}
