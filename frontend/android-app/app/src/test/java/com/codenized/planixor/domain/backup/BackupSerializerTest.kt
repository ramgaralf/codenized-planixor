package com.codenized.planixor.domain.backup

import com.codenized.planixor.data.local.AnnualHoursConfigDao
import com.codenized.planixor.data.local.AnnualHoursConfigEntity
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.NotificationRecordEntity
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ReminderEntity
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftEntity
import com.codenized.planixor.data.sync.SyncConfig
import com.google.gson.JsonParser
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for BackupSerializer.
 * Validates: Requirements 3.1, 3.2, 3.4, 9.1
 */
class BackupSerializerTest {

    private lateinit var shiftDao: ShiftDao
    private lateinit var reminderDao: ReminderDao
    private lateinit var calendarEventDao: CalendarEventDao
    private lateinit var notificationRecordDao: NotificationRecordDao
    private lateinit var annualHoursConfigDao: AnnualHoursConfigDao
    private lateinit var preferencesRepository: PreferencesRepository
    private lateinit var serializer: BackupSerializer

    @Before
    fun setUp() {
        shiftDao = mockk()
        reminderDao = mockk()
        calendarEventDao = mockk()
        notificationRecordDao = mockk()
        annualHoursConfigDao = mockk()
        preferencesRepository = mockk()

        serializer = BackupSerializer(
            shiftDao = shiftDao,
            reminderDao = reminderDao,
            calendarEventDao = calendarEventDao,
            notificationRecordDao = notificationRecordDao,
            annualHoursConfigDao = annualHoursConfigDao,
            preferencesRepository = preferencesRepository,
        )
    }

    private fun setupEmptyDaos() {
        coEvery { shiftDao.getAll() } returns emptyList()
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns emptyList()
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)
    }

    // --- Test: Serializes shifts correctly ---

    @Test
    fun `serialize should produce correct shift fields in JSON output`() = runTest {
        val shift = ShiftEntity(
            id = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
            name = "Morning",
            icon = "☀️",
            backgroundColor = "#10B981",
            startTime = 480,
            endTime = 960,
            hoursWorked = 480,
            isActive = true,
            createdAt = 1718884079878L,
            modifiedAt = 1718884079878L,
            syncedAt = 1718884080000L,
            isDeleted = false,
        )
        coEvery { shiftDao.getAll() } returns listOf(shift)
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns emptyList()
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val shifts = root.getAsJsonObject("data").getAsJsonArray("shifts")

        assertEquals(1, shifts.size())
        val s = shifts[0].asJsonObject
        assertEquals("a1b2c3d4-e5f6-7890-abcd-ef1234567890", s.get("id").asString)
        assertEquals("Morning", s.get("name").asString)
        assertEquals("☀️", s.get("icon").asString)
        assertEquals("#10B981", s.get("backgroundColor").asString)
        assertEquals(480, s.get("startTime").asInt)
        assertEquals(960, s.get("endTime").asInt)
        assertEquals(480, s.get("hoursWorked").asInt)
        assertEquals(true, s.get("isActive").asBoolean)
        assertEquals(false, s.get("isDeleted").asBoolean)
    }

    // --- Test: Converts Long to ISO 8601 ---

    @Test
    fun `serialize should convert epoch millis to ISO 8601 UTC strings with Z suffix`() = runTest {
        val shift = ShiftEntity(
            id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            name = "Night",
            icon = "🌙",
            backgroundColor = "#2563EB",
            startTime = 1320,
            endTime = 360,
            hoursWorked = 480,
            isActive = true,
            createdAt = 1718884079878L,  // 2024-06-20T11:47:59.878Z
            modifiedAt = 1718884079878L,
            syncedAt = 1718884080000L,   // 2024-06-20T11:48:00Z
            isDeleted = false,
        )
        coEvery { shiftDao.getAll() } returns listOf(shift)
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns emptyList()
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val s = root.getAsJsonObject("data").getAsJsonArray("shifts")[0].asJsonObject

        val createdAt = s.get("createdAt").asString
        val modifiedAt = s.get("modifiedAt").asString
        val syncedAt = s.get("syncedAt").asString

        assertTrue("createdAt should end with Z", createdAt.endsWith("Z"))
        assertTrue("modifiedAt should end with Z", modifiedAt.endsWith("Z"))
        assertTrue("syncedAt should end with Z", syncedAt.endsWith("Z"))
        assertEquals("2024-06-20T11:47:59.878Z", createdAt)
        assertEquals("2024-06-20T11:47:59.878Z", modifiedAt)
        assertEquals("2024-06-20T11:48:00Z", syncedAt)
    }

    @Test
    fun `serialize should produce null for syncedAt when entity syncedAt is null`() = runTest {
        val shift = ShiftEntity(
            id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            name = "Test",
            icon = "⭐",
            backgroundColor = "#7C3AED",
            startTime = 0,
            endTime = 480,
            hoursWorked = 480,
            isActive = true,
            createdAt = 1718884079878L,
            modifiedAt = 1718884079878L,
            syncedAt = null,
            isDeleted = false,
        )
        coEvery { shiftDao.getAll() } returns listOf(shift)
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns emptyList()
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val s = root.getAsJsonObject("data").getAsJsonArray("shifts")[0].asJsonObject

        assertTrue("syncedAt should be null", s.get("syncedAt").isJsonNull)
    }

    // --- Test: Includes soft-deleted records ---

    @Test
    fun `serialize should include soft-deleted records in output`() = runTest {
        val activeShift = ShiftEntity(
            id = "11111111-1111-1111-1111-111111111111",
            name = "Active",
            icon = "☀️",
            backgroundColor = "#10B981",
            startTime = 480,
            endTime = 960,
            hoursWorked = 480,
            isActive = true,
            createdAt = 1718884079878L,
            modifiedAt = 1718884079878L,
            syncedAt = null,
            isDeleted = false,
        )
        val deletedShift = ShiftEntity(
            id = "22222222-2222-2222-2222-222222222222",
            name = "Deleted",
            icon = "🌙",
            backgroundColor = "#2563EB",
            startTime = 1320,
            endTime = 360,
            hoursWorked = 480,
            isActive = false,
            createdAt = 1718884079878L,
            modifiedAt = 1718884079878L,
            syncedAt = null,
            isDeleted = true,
        )
        coEvery { shiftDao.getAll() } returns listOf(activeShift, deletedShift)
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns emptyList()
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val shifts = root.getAsJsonObject("data").getAsJsonArray("shifts")

        assertEquals(2, shifts.size())
        val deletedItem = shifts.firstOrNull {
            it.asJsonObject.get("id").asString == "22222222-2222-2222-2222-222222222222"
        }
        assertNotNull("Soft-deleted shift should be present", deletedItem)
        assertEquals(true, deletedItem!!.asJsonObject.get("isDeleted").asBoolean)
    }

    // --- Test: Empty entity tables produce empty arrays ---

    @Test
    fun `serialize should produce empty arrays for all entity types when no data exists`() = runTest {
        setupEmptyDaos()

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val data = root.getAsJsonObject("data")

        assertEquals(0, data.getAsJsonArray("shifts").size())
        assertEquals(0, data.getAsJsonArray("reminders").size())
        assertEquals(0, data.getAsJsonArray("calendarEvents").size())
        assertEquals(0, data.getAsJsonArray("notificationRecords").size())
        assertEquals(0, data.getAsJsonArray("annualHoursConfig").size())
        assertEquals(0, data.getAsJsonArray("syncConfig").size())
    }

    // --- Test: Serializes all entity types ---

    @Test
    fun `serialize should include all entity types in output`() = runTest {
        coEvery { shiftDao.getAll() } returns listOf(
            ShiftEntity(
                id = "s1", name = "S", icon = "☀️", backgroundColor = "#10B981",
                startTime = 480, endTime = 960, hoursWorked = 480, isActive = true,
                createdAt = 1718884079878L, modifiedAt = 1718884079878L,
                syncedAt = null, isDeleted = false,
            )
        )
        coEvery { reminderDao.getAll() } returns listOf(
            ReminderEntity(
                id = "r1", name = "R", icon = "⏰", backgroundColor = "#7C3AED",
                isActive = true, createdAt = 1718884079878L, modifiedAt = 1718884079878L,
                syncedAt = null, isDeleted = false,
            )
        )
        coEvery { calendarEventDao.getAll() } returns listOf(
            CalendarEventEntity(
                id = "ce1", eventType = "shift", eventTypeId = "s1",
                startDay = "2025-06-20", endDay = "2025-06-20",
                startTime = 480, endTime = 960, totalHours = 480,
                notes = null, modifiedAt = 1718884079878L,
                syncedAt = null, isDeleted = false, alertOffsets = "[0,10,60]",
            )
        )
        coEvery { notificationRecordDao.getAll() } returns listOf(
            NotificationRecordEntity(
                id = "nr1", calendarEventId = "ce1", alertOffset = 10,
                triggerTime = 1718884079878L, isDelivered = false, isRead = false,
                modifiedAt = 1718884079878L, syncedAt = null, isDeleted = false,
            )
        )
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns listOf(
            AnnualHoursConfigEntity(
                id = "ahc1", year = 2025, configuredHours = 1800,
                modifiedAt = 1718884079878L, syncedAt = null, isDeleted = false,
            )
        )
        every { preferencesRepository.syncConfigFlow } returns flowOf(
            SyncConfig(
                serverUrl = "https://api.planixor.com",
                apiKey = "test-key-123",
                username = "testuser",
                apiBasePath = "/api",
                syncIntervalMinutes = 5,
                isPaused = false,
                lastSyncedAt = 1718884080000L,
            )
        )

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val data = root.getAsJsonObject("data")

        assertEquals(1, data.getAsJsonArray("shifts").size())
        assertEquals(1, data.getAsJsonArray("reminders").size())
        assertEquals(1, data.getAsJsonArray("calendarEvents").size())
        assertEquals(1, data.getAsJsonArray("notificationRecords").size())
        assertEquals(1, data.getAsJsonArray("annualHoursConfig").size())
        assertEquals(1, data.getAsJsonArray("syncConfig").size())
    }

    // --- Test: alertOffsets JSON string is parsed correctly ---

    @Test
    fun `serialize should parse alertOffsets JSON string into integer array`() = runTest {
        coEvery { shiftDao.getAll() } returns emptyList()
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns listOf(
            CalendarEventEntity(
                id = "ce1", eventType = "shift", eventTypeId = "s1",
                startDay = "2025-06-20", endDay = "2025-06-20",
                startTime = 480, endTime = 960, totalHours = 480,
                notes = "Test note", modifiedAt = 1718884079878L,
                syncedAt = null, isDeleted = false, alertOffsets = "[0,10,60]",
            )
        )
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val ce = root.getAsJsonObject("data")
            .getAsJsonArray("calendarEvents")[0].asJsonObject
        val alertOffsets = ce.getAsJsonArray("alertOffsets")

        assertEquals(3, alertOffsets.size())
        assertEquals(0, alertOffsets[0].asInt)
        assertEquals(10, alertOffsets[1].asInt)
        assertEquals(60, alertOffsets[2].asInt)
    }

    @Test
    fun `serialize should produce empty array for empty alertOffsets string`() = runTest {
        coEvery { shiftDao.getAll() } returns emptyList()
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns listOf(
            CalendarEventEntity(
                id = "ce1", eventType = "reminder", eventTypeId = "r1",
                startDay = "2025-06-20", endDay = "2025-06-20",
                startTime = 600, endTime = 660, totalHours = 60,
                notes = null, modifiedAt = 1718884079878L,
                syncedAt = null, isDeleted = false, alertOffsets = "[]",
            )
        )
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val ce = root.getAsJsonObject("data")
            .getAsJsonArray("calendarEvents")[0].asJsonObject
        val alertOffsets = ce.getAsJsonArray("alertOffsets")

        assertEquals(0, alertOffsets.size())
    }

    // --- Test: Sync config is included when present ---

    @Test
    fun `serialize should include sync config when configured`() = runTest {
        coEvery { shiftDao.getAll() } returns emptyList()
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns emptyList()
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(
            SyncConfig(
                serverUrl = "https://sync.planixor.com",
                apiKey = "key-abc-123",
                username = "john",
                apiBasePath = "/custom/api",
                syncIntervalMinutes = 15,
                isPaused = true,
                lastSyncedAt = 1718884080000L,
            )
        )

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val syncConfigs = root.getAsJsonObject("data").getAsJsonArray("syncConfig")

        assertEquals(1, syncConfigs.size())
        val sc = syncConfigs[0].asJsonObject
        assertEquals("https://sync.planixor.com", sc.get("serverUrl").asString)
        assertEquals("key-abc-123", sc.get("apiKey").asString)
        assertEquals("john", sc.get("username").asString)
        assertEquals("/custom/api", sc.get("apiBasePath").asString)
        assertEquals(15, sc.get("syncIntervalMinutes").asInt)
        assertEquals(true, sc.get("isPaused").asBoolean)
        assertTrue("lastSyncedAt should end with Z", sc.get("lastSyncedAt").asString.endsWith("Z"))
    }

    // --- Test: Sync config is empty array when not configured ---

    @Test
    fun `serialize should produce empty syncConfig array when not configured`() = runTest {
        setupEmptyDaos()

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val syncConfigs = root.getAsJsonObject("data").getAsJsonArray("syncConfig")

        assertEquals(0, syncConfigs.size())
    }

    // --- Test: Metadata is correct ---

    @Test
    fun `serialize should produce correct metadata fields`() = runTest {
        setupEmptyDaos()

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val metadata = root.getAsJsonObject("metadata")

        assertNotNull("metadata.createdAt should be present", metadata.get("createdAt"))
        assertTrue(
            "createdAt should end with Z",
            metadata.get("createdAt").asString.endsWith("Z"),
        )
        assertEquals("1.0.0", metadata.get("appVersion").asString)
        assertEquals("android", metadata.get("platform").asString)
        assertEquals(1, metadata.get("schemaVersion").asInt)
    }

    // --- Test: Reminders serialization ---

    @Test
    fun `serialize should produce correct reminder fields`() = runTest {
        coEvery { shiftDao.getAll() } returns emptyList()
        coEvery { reminderDao.getAll() } returns listOf(
            ReminderEntity(
                id = "R1R1R1R1-R1R1-R1R1-R1R1-R1R1R1R1R1R1",
                name = "Take Medicine",
                icon = "💊",
                backgroundColor = "#EC4899",
                isActive = true,
                createdAt = 1718884079878L,
                modifiedAt = 1718884079878L,
                syncedAt = null,
                isDeleted = false,
            )
        )
        coEvery { calendarEventDao.getAll() } returns emptyList()
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val reminders = root.getAsJsonObject("data").getAsJsonArray("reminders")

        assertEquals(1, reminders.size())
        val r = reminders[0].asJsonObject
        assertEquals("r1r1r1r1-r1r1-r1r1-r1r1-r1r1r1r1r1r1", r.get("id").asString)
        assertEquals("Take Medicine", r.get("name").asString)
        assertEquals("💊", r.get("icon").asString)
        assertEquals("#EC4899", r.get("backgroundColor").asString)
        assertEquals(true, r.get("isActive").asBoolean)
        assertTrue("syncedAt should be null", r.get("syncedAt").isJsonNull)
    }

    // --- Test: UUID lowercasing ---

    @Test
    fun `serialize should lowercase all UUID fields`() = runTest {
        coEvery { shiftDao.getAll() } returns emptyList()
        coEvery { reminderDao.getAll() } returns emptyList()
        coEvery { calendarEventDao.getAll() } returns listOf(
            CalendarEventEntity(
                id = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE",
                eventType = "shift",
                eventTypeId = "FFFFFFFF-1111-2222-3333-444444444444",
                startDay = "2025-06-20", endDay = "2025-06-20",
                startTime = 480, endTime = 960, totalHours = 480,
                notes = null, modifiedAt = 1718884079878L,
                syncedAt = null, isDeleted = false, alertOffsets = "[]",
            )
        )
        coEvery { notificationRecordDao.getAll() } returns emptyList()
        coEvery { annualHoursConfigDao.getAllIncludingDeleted() } returns emptyList()
        every { preferencesRepository.syncConfigFlow } returns flowOf(null)

        val json = serializer.serialize()
        val root = JsonParser.parseString(json).asJsonObject
        val ce = root.getAsJsonObject("data")
            .getAsJsonArray("calendarEvents")[0].asJsonObject

        assertEquals("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", ce.get("id").asString)
        assertEquals("ffffffff-1111-2222-3333-444444444444", ce.get("eventTypeId").asString)
    }
}
