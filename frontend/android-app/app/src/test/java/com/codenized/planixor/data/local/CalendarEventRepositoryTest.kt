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

    override suspend fun update(event: CalendarEventEntity) {
        store[event.id] = event
        emitUpdate()
    }

    override fun getByDateRange(startDate: String, endDate: String): Flow<List<CalendarEventEntity>> {
        return flow.map { events ->
            events.filter { it.day in startDate..endDate && !it.isDeleted }
        }
    }

    override fun getByDate(day: String): Flow<List<CalendarEventEntity>> {
        return flow.map { events ->
            events.filter { it.day == day && !it.isDeleted }
        }
    }

    override suspend fun getShiftsForDate(day: String, excludeId: String): List<CalendarEventEntity> {
        return store.values.filter {
            it.day == day && it.eventType == "shift" && !it.isDeleted && it.id != excludeId
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

    fun clear() {
        store.clear()
        emitUpdate()
    }
}

/**
 * Unit tests for CalendarEventRepository CRUD operations with change tracking.
 *
 * Validates: Requirements 1.8, 2.1, 11.4, 11.5
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val event = (result as CalendarEventResult.Success).event
        assertNull(event.syncedAt)
    }

    @Test
    fun `create should set isDeleted to false`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val event = (result as CalendarEventResult.Success).event
        assertFalse(event.isDeleted)
    }

    // --- Create: rejects when endTime <= startTime ---

    @Test
    fun `create should reject when endTime equals startTime`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 480,
            notes = null,
        )
        assertTrue(result is CalendarEventResult.ValidationError)
        assertEquals(
            "End time must be after start time",
            (result as CalendarEventResult.ValidationError).message,
        )
    }

    @Test
    fun `create should reject when endTime is less than startTime`() = runTest {
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 1020,
            endTime = 480,
            notes = null,
        )
        assertTrue(result is CalendarEventResult.ValidationError)
    }

    // --- Create: rejects shift when another shift exists on same day ---

    @Test
    fun `create should reject shift when another shift exists on same day`() = runTest {
        // First shift creation succeeds
        repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )

        // Second shift on same day fails
        val result = repository.create(
            eventType = "shift",
            eventTypeId = "shift-2",
            day = "2024-01-15",
            startTime = 1080,
            endTime = 1200,
            notes = null,
        )
        assertTrue(result is CalendarEventResult.ValidationError)
        assertEquals(
            "Only one shift per day is allowed",
            (result as CalendarEventResult.ValidationError).message,
        )
    }

    @Test
    fun `create should allow reminder when shift exists on same day`() = runTest {
        repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )

        val result = repository.create(
            eventType = "reminder",
            eventTypeId = "reminder-1",
            day = "2024-01-15",
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val before = System.currentTimeMillis()
        val updateResult = repository.update(
            id = created.id,
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1080,
            notes = "Updated notes",
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1080,
            notes = null,
        )
        val updated = (updateResult as CalendarEventResult.Success).event
        assertNull(updated.syncedAt)
    }

    // --- Update: validates time range ---

    @Test
    fun `update should reject when endTime is not greater than startTime`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 1020,
            endTime = 480,
            notes = null,
        )
        assertTrue(updateResult is CalendarEventResult.ValidationError)
        assertEquals(
            "End time must be after start time",
            (updateResult as CalendarEventResult.ValidationError).message,
        )
    }

    // --- Update: validates one-shift-per-day (excluding self) ---

    @Test
    fun `update should allow updating a shift on the same day when it is the only shift`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val created = (createResult as CalendarEventResult.Success).event

        val updateResult = repository.update(
            id = created.id,
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 540,
            endTime = 1080,
            notes = "Updated",
        )
        assertTrue(updateResult is CalendarEventResult.Success)
    }

    @Test
    fun `update should reject shift move to day with existing shift`() = runTest {
        // Create shift on day A
        repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )

        // Create shift on day B
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-2",
            day = "2024-01-16",
            startTime = 480,
            endTime = 1020,
            notes = null,
        )
        val shiftB = (createResult as CalendarEventResult.Success).event

        // Try to move shift B to day A (which already has a shift)
        val updateResult = repository.update(
            id = shiftB.id,
            eventType = "shift",
            eventTypeId = "shift-2",
            day = "2024-01-15",
            startTime = 1080,
            endTime = 1200,
            notes = null,
        )
        assertTrue(updateResult is CalendarEventResult.ValidationError)
        assertEquals(
            "Only one shift per day is allowed",
            (updateResult as CalendarEventResult.ValidationError).message,
        )
    }

    // --- SoftDelete: sets isDeleted=true, updates modifiedAt, resets syncedAt ---

    @Test
    fun `softDelete should set isDeleted to true`() = runTest {
        val createResult = repository.create(
            eventType = "shift",
            eventTypeId = "shift-1",
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
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
            day = "2024-01-15",
            startTime = 480,
            endTime = 1020,
            notes = null,
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
