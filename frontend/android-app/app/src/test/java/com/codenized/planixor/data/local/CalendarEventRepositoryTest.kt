package com.codenized.planixor.data.local

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Fake in-memory CalendarEventDao for unit testing the repository.
 * Replicates Room query behavior without requiring Android context.
 */
class FakeCalendarEventDao : CalendarEventDao {
    private val store = mutableMapOf<String, CalendarEventEntity>()
    private val flow = MutableStateFlow<List<CalendarEventEntity>>(emptyList())

    private fun emitUpdate() {
        flow.value = store.values.toList()
    }

    override suspend fun insert(event: CalendarEventEntity) {
        store[event.id] = event
        emitUpdate()
    }

    override suspend fun insertAll(events: List<CalendarEventEntity>) {
        events.forEach { store[it.id] = it }
        emitUpdate()
    }

    override suspend fun update(event: CalendarEventEntity) {
        store[event.id] = event
        emitUpdate()
    }

    override fun getByDateRange(startDate: String, endDate: String): Flow<List<CalendarEventEntity>> {
        return flow.map { events ->
            events.filter { it.startDay <= endDate && it.endDay >= startDate && !it.isDeleted }
        }
    }

    override fun getByDate(day: String): Flow<List<CalendarEventEntity>> {
        return flow.map { events ->
            events.filter { it.startDay <= day && it.endDay >= day && !it.isDeleted }
        }
    }

    override suspend fun getShiftsForDate(startDay: String, excludeId: String): List<CalendarEventEntity> {
        return store.values.filter {
            it.startDay == startDay && it.eventType == "shift" && !it.isDeleted && it.id != excludeId
        }
    }

    override suspend fun getUnsynced(): List<CalendarEventEntity> {
        return store.values.filter {
            it.syncedAt == null || it.modifiedAt > it.syncedAt
        }
    }

    override suspend fun getById(id: String): CalendarEventEntity? {
        return store[id]
    }

    override suspend fun getAll(): List<CalendarEventEntity> {
        return store.values.toList()
    }

    override suspend fun deleteAll() {
        store.clear()
        emitUpdate()
    }

    fun clear() {
        store.clear()
        emitUpdate()
    }
}

/**
 * Unit tests for CalendarEventRepository CRUD operations with change tracking.
 * Tests new multi-day model with startDay/endDay, totalHours, conditional time validation,
 * and crossing midnight auto-set for shifts.
 *
 * Validates: Requirements 1.1, 1.6, 2.1, 7.2, 11.4, 11.5, 11.6, 11.7
 */
class CalendarEventRepositoryTest {

    private lateinit var fakeDao: FakeCalendarEventDao
    private lateinit var repository: CalendarEventRepository

    @Before
    fun setUp() {
        fakeDao = FakeCalendarEventDao()
        repository = CalendarEventRepository(fakeDao)
    }

    // --- Create: generates UUID, sets modifiedAt, sets syncedAt=null, sets isDeleted=false ---

    @Test
    fun `create should generate a UUID id`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        assertTrue(result is CalendarEventResult.Success)
        val event = (result as CalendarEventResult.Success).event
        assertNotNull(event.id)
        assertTrue(event.id.isNotEmpty())
    }

    @Test
    fun `create should set modifiedAt to current time`() = runTest {
        val before = System.currentTimeMillis()
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val after = System.currentTimeMillis()
        val event = (result as CalendarEventResult.Success).event
        assertTrue(event.modifiedAt in before..after)
    }

    @Test
    fun `create should set syncedAt to null`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val event = (result as CalendarEventResult.Success).event
        assertNull(event.syncedAt)
    }

    @Test
    fun `create should set isDeleted to false`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val event = (result as CalendarEventResult.Success).event
        assertFalse(event.isDeleted)
    }

    @Test
    fun `create should compute totalHours from shiftHoursWorked for shift events`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val event = (result as CalendarEventResult.Success).event
        assertEquals(540, event.totalHours)
    }

    @Test
    fun `create should compute totalHours from day and time difference for reminders`() = runTest {
        val result = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val event = (result as CalendarEventResult.Success).event
        assertEquals(540, event.totalHours)
    }

    // --- Create: day range validation ---

    @Test
    fun `create should reject when endDay is before startDay`() = runTest {
        val result = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-16",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        assertTrue(result is CalendarEventResult.ValidationError)
        assertEquals(
            "End day must be on or after start day",
            (result as CalendarEventResult.ValidationError).message,
        )
    }

    // --- Create: time validation for reminders (same day only) ---

    @Test
    fun `create should accept reminder when endTime equals startTime on same day`() = runTest {
        val result = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 480,
            notes = null,
        )
        assertTrue(result is CalendarEventResult.Success)
    }

    @Test
    fun `create should reject reminder when endTime is less than startTime on same day`() = runTest {
        val result = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 1020,
            endTime = 480,
            notes = null,
        )
        assertTrue(result is CalendarEventResult.ValidationError)
    }

    @Test
    fun `create should allow reminder when endTime less than startTime on different days`() = runTest {
        val result = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-16",
            startTime = 1020,
            endTime = 480,
            notes = null,
        )
        assertTrue(result is CalendarEventResult.Success)
    }

    @Test
    fun `create should not apply time validation to shift events`() = runTest {
        // Shifts with endTime < startTime should be allowed (crossing midnight)
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 1320,
            endTime = 360,
            notes = null,
            shiftHoursWorked = 480,
        )
        assertTrue(result is CalendarEventResult.Success)
        // Crossing midnight auto-sets endDay = startDay + 1
        val event = (result as CalendarEventResult.Success).event
        assertEquals("2024-01-16", event.endDay)
    }

    // --- Create: crossing midnight auto-sets endDay ---

    @Test
    fun `create should auto-set endDay to startDay plus 1 for crossing midnight shift`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 1320,
            endTime = 360,
            notes = null,
            shiftHoursWorked = 480,
        )
        val event = (result as CalendarEventResult.Success).event
        assertEquals("2024-01-16", event.endDay)
    }

    @Test
    fun `create should keep endDay as startDay when shift does not cross midnight`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val event = (result as CalendarEventResult.Success).event
        assertEquals("2024-01-15", event.endDay)
    }

    // --- Create: rejects shift when another shift exists on same startDay ---

    @Test
    fun `create should reject shift when another shift exists on same startDay`() = runTest {
        repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )

        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-2",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 1080,
            endTime = 1200,
            notes = null,
            shiftHoursWorked = 120,
        )
        assertTrue(result is CalendarEventResult.ValidationError)
        assertEquals(
            "Only one shift per day is allowed",
            (result as CalendarEventResult.ValidationError).message,
        )
    }

    @Test
    fun `create should allow reminder when shift exists on same startDay`() = runTest {
        repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )

        val result = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 600,
            endTime = 660,
            notes = null,
        )
        assertTrue(result is CalendarEventResult.Success)
    }

    // --- Update: sets modifiedAt to now, resets syncedAt to null ---

    @Test
    fun `update should set modifiedAt to current time`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val before = System.currentTimeMillis()
        val updateResult = repository.update(
            id = created.id,
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1080,
            notes = "Updated notes",
            shiftHoursWorked = 600,
        )
        val after = System.currentTimeMillis()

        val updated = (updateResult as CalendarEventResult.Success).event
        assertTrue(updated.modifiedAt in before..after)
    }

    @Test
    fun `update should reset syncedAt to null`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1080,
            notes = null,
            shiftHoursWorked = 600,
        )
        val updated = (updateResult as CalendarEventResult.Success).event
        assertNull(updated.syncedAt)
    }

    // --- Update: validates day range ---

    @Test
    fun `update should reject when endDay is before startDay`() = runTest {
        val createResult = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-16",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        assertTrue(updateResult is CalendarEventResult.ValidationError)
        assertEquals(
            "End day must be on or after start day",
            (updateResult as CalendarEventResult.ValidationError).message,
        )
    }

    // --- Update: validates time for reminders (same day only) ---

    @Test
    fun `update should reject reminder when endTime less than startTime on same day`() = runTest {
        val createResult = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 1020,
            endTime = 480,
            notes = null,
        )
        assertTrue(updateResult is CalendarEventResult.ValidationError)
        assertEquals(
            "End time must be on or after start time for same-day reminders",
            (updateResult as CalendarEventResult.ValidationError).message,
        )
    }

    // --- Update: validates one-shift-per-day (excluding self) ---

    @Test
    fun `update should allow updating a shift on the same startDay when it is the only shift`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 540,
            endTime = 1080,
            notes = "Updated",
            shiftHoursWorked = 540,
        )
        assertTrue(updateResult is CalendarEventResult.Success)
    }

    @Test
    fun `update should reject shift move to startDay with existing shift`() = runTest {
        repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )

        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-2",
            startDay = "2024-01-16",
            endDay = "2024-01-16",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val shiftB = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = shiftB.id,
            eventType = "shift",
            eventTypeId = "shift-2",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 1080,
            endTime = 1200,
            notes = null,
            shiftHoursWorked = 120,
        )
        assertTrue(updateResult is CalendarEventResult.ValidationError)
        assertEquals(
            "Only one shift per day is allowed",
            (updateResult as CalendarEventResult.ValidationError).message,
        )
    }

    // --- Update: recomputes totalHours ---

    @Test
    fun `update should recompute totalHours for shift from shiftHoursWorked`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 480,
        )
        val updated = (updateResult as CalendarEventResult.Success).event
        assertEquals(480, updated.totalHours)
    }

    @Test
    fun `update should recompute totalHours for reminder from time difference`() = runTest {
        val createResult = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "reminder",
            eventTypeId = "reminder-1",
            startDay = "2024-01-15",
            endDay = "2024-01-16",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val updated = (updateResult as CalendarEventResult.Success).event
        // 1 day difference + (1020 - 480) = 1440 + 540 = 1980
        assertEquals(1980, updated.totalHours)
    }

    // --- SoftDelete: sets isDeleted=true, updates modifiedAt, resets syncedAt ---

    @Test
    fun `softDelete should set isDeleted to true`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val deleteResult = repository.softDelete(created.id)
        val deleted = (deleteResult as CalendarEventResult.Success).event
        assertTrue(deleted.isDeleted)
    }

    @Test
    fun `softDelete should update modifiedAt to current time`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val before = System.currentTimeMillis()
        val deleteResult = repository.softDelete(created.id)
        val after = System.currentTimeMillis()

        val deleted = (deleteResult as CalendarEventResult.Success).event
        assertTrue(deleted.modifiedAt in before..after)
    }

    @Test
    fun `softDelete should reset syncedAt to null`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            startDay = "2024-01-15",
            endDay = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
            shiftHoursWorked = 540,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val deleteResult = repository.softDelete(created.id)
        val deleted = (deleteResult as CalendarEventResult.Success).event
        assertNull(deleted.syncedAt)
    }

    @Test
    fun `softDelete should return validation error for nonexistent event`() = runTest {
        val result = repository.softDelete("nonexistent-id")
        assertTrue(result is CalendarEventResult.ValidationError)
        assertEquals(
            "Event not found",
            (result as CalendarEventResult.ValidationError).message,
        )
    }
}
