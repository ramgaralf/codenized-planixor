package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.CalendarEventEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for CalendarEventSyncManager conflict resolution logic.
 * Tests LWW (Last-Writer-Wins) with remote preference on ties.
 *
 * Validates: Requirements 10.3, 11.4, 11.5
 */
class CalendarEventSyncManagerTest {

    private val fixedClock = 1_700_000_000_000L
    private val manager = CalendarEventSyncManager(clock = { fixedClock })

    private fun makeEvent(
        id: String = "event-1",
        eventType: String = "shift",
        eventTypeId: String = "shift-type-1",
        startDay: String = "2024-01-15",
        endDay: String = "2024-01-15",
        startTime: Int = 480,
        endTime: Int = 1020,
        totalHours: Int = 540,
        notes: String? = null,
        modifiedAt: Long = 1_600_000_000_000L,
        syncedAt: Long? = null,
        isDeleted: Boolean = false,
    ) = CalendarEventEntity(
        id = id,
        eventType = eventType,
        eventTypeId = eventTypeId,
        startDay = startDay,
        endDay = endDay,
        startTime = startTime,
        endTime = endTime,
        totalHours = totalHours,
        notes = notes,
        modifiedAt = modifiedAt,
        syncedAt = syncedAt,
        isDeleted = isDeleted,
    )

    // --- resolveConflict: LWW with remote preference on ties ---

    @Test
    fun `resolveConflict should return remote when remote modifiedAt is greater`() {
        val local = makeEvent(modifiedAt = 1_500_000_000_000L)
        val remote = makeEvent(modifiedAt = 1_600_000_000_000L)

        val winner = manager.resolveConflict(local, remote)
        assertEquals(remote, winner)
    }

    @Test
    fun `resolveConflict should return local when local modifiedAt is greater`() {
        val local = makeEvent(modifiedAt = 1_600_000_000_000L)
        val remote = makeEvent(modifiedAt = 1_500_000_000_000L)

        val winner = manager.resolveConflict(local, remote)
        assertEquals(local, winner)
    }

    @Test
    fun `resolveConflict should return remote on tie when modifiedAt values are equal`() {
        val local = makeEvent(modifiedAt = 1_600_000_000_000L, notes = "local version")
        val remote = makeEvent(modifiedAt = 1_600_000_000_000L, notes = "remote version")

        val winner = manager.resolveConflict(local, remote)
        assertEquals(remote, winner)
    }

    // --- getPushCandidates ---

    @Test
    fun `getPushCandidates should return events where syncedAt is null`() {
        val events = listOf(
            makeEvent(id = "e1", syncedAt = null, modifiedAt = 1_600_000_000_000L),
            makeEvent(id = "e2", syncedAt = 1_650_000_000_000L, modifiedAt = 1_600_000_000_000L),
        )

        val candidates = manager.getPushCandidates(events)
        assertEquals(1, candidates.size)
        assertEquals("e1", candidates[0].id)
    }

    @Test
    fun `getPushCandidates should return events where modifiedAt is greater than syncedAt`() {
        val events = listOf(
            makeEvent(id = "e1", syncedAt = 1_500_000_000_000L, modifiedAt = 1_600_000_000_000L),
            makeEvent(id = "e2", syncedAt = 1_600_000_000_000L, modifiedAt = 1_600_000_000_000L),
        )

        val candidates = manager.getPushCandidates(events)
        assertEquals(1, candidates.size)
        assertEquals("e1", candidates[0].id)
    }

    @Test
    fun `getPushCandidates should return empty list when all events are synced`() {
        val events = listOf(
            makeEvent(id = "e1", syncedAt = 1_700_000_000_000L, modifiedAt = 1_600_000_000_000L),
            makeEvent(id = "e2", syncedAt = 1_700_000_000_000L, modifiedAt = 1_650_000_000_000L),
        )

        val candidates = manager.getPushCandidates(events)
        assertTrue(candidates.isEmpty())
    }

    // --- mergePulledEvents ---

    @Test
    fun `mergePulledEvents should insert new remote events with syncedAt set to clock time`() {
        val remoteEvents = listOf(
            makeEvent(id = "remote-1", modifiedAt = 1_650_000_000_000L),
            makeEvent(id = "remote-2", modifiedAt = 1_660_000_000_000L),
        )

        val result = manager.mergePulledEvents(localEvents = emptyList(), remoteEvents = remoteEvents)

        assertEquals(2, result.toInsert.size)
        assertEquals(0, result.toUpdate.size)
        result.toInsert.forEach { inserted ->
            assertEquals(fixedClock, inserted.syncedAt)
        }
    }

    @Test
    fun `mergePulledEvents should place existing local conflicts in toUpdate`() {
        val local = makeEvent(id = "event-1", modifiedAt = 1_500_000_000_000L)
        val remote = makeEvent(id = "event-1", modifiedAt = 1_600_000_000_000L)

        val result = manager.mergePulledEvents(
            localEvents = listOf(local),
            remoteEvents = listOf(remote),
        )

        assertEquals(0, result.toInsert.size)
        assertEquals(1, result.toUpdate.size)
        assertEquals(fixedClock, result.toUpdate[0].syncedAt)
    }

    @Test
    fun `mergePulledEvents should use LWW for conflict and remote wins when newer`() {
        val local = makeEvent(id = "event-1", modifiedAt = 1_500_000_000_000L, notes = "local")
        val remote = makeEvent(id = "event-1", modifiedAt = 1_600_000_000_000L, notes = "remote")

        val result = manager.mergePulledEvents(
            localEvents = listOf(local),
            remoteEvents = listOf(remote),
        )

        assertEquals("remote", result.toUpdate[0].notes)
        assertEquals(fixedClock, result.toUpdate[0].syncedAt)
    }

    @Test
    fun `mergePulledEvents should use LWW for conflict and local wins when newer`() {
        val local = makeEvent(id = "event-1", modifiedAt = 1_600_000_000_000L, notes = "local")
        val remote = makeEvent(id = "event-1", modifiedAt = 1_500_000_000_000L, notes = "remote")

        val result = manager.mergePulledEvents(
            localEvents = listOf(local),
            remoteEvents = listOf(remote),
        )

        assertEquals("local", result.toUpdate[0].notes)
        assertEquals(fixedClock, result.toUpdate[0].syncedAt)
    }

    @Test
    fun `mergePulledEvents should prefer remote on tie`() {
        val local = makeEvent(id = "event-1", modifiedAt = 1_600_000_000_000L, notes = "local")
        val remote = makeEvent(id = "event-1", modifiedAt = 1_600_000_000_000L, notes = "remote")

        val result = manager.mergePulledEvents(
            localEvents = listOf(local),
            remoteEvents = listOf(remote),
        )

        assertEquals("remote", result.toUpdate[0].notes)
    }

    @Test
    fun `mergePulledEvents should preserve all fields from winner except syncedAt`() {
        val remote = makeEvent(
            id = "event-1",
            eventType = "reminder",
            eventTypeId = "reminder-type-1",
            startDay = "2024-03-20",
            endDay = "2024-03-21",
            startTime = 600,
            endTime = 660,
            totalHours = 1500,
            notes = "Important meeting",
            modifiedAt = 1_650_000_000_000L,
            isDeleted = false,
        )

        val result = manager.mergePulledEvents(localEvents = emptyList(), remoteEvents = listOf(remote))
        val inserted = result.toInsert[0]

        assertEquals("event-1", inserted.id)
        assertEquals("reminder", inserted.eventType)
        assertEquals("reminder-type-1", inserted.eventTypeId)
        assertEquals("2024-03-20", inserted.startDay)
        assertEquals("2024-03-21", inserted.endDay)
        assertEquals(600, inserted.startTime)
        assertEquals(660, inserted.endTime)
        assertEquals(1500, inserted.totalHours)
        assertEquals("Important meeting", inserted.notes)
        assertEquals(1_650_000_000_000L, inserted.modifiedAt)
        assertEquals(false, inserted.isDeleted)
        assertEquals(fixedClock, inserted.syncedAt)
    }
}
