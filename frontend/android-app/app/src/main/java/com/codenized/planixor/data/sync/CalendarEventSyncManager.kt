package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.CalendarEventEntity

/**
 * Result of merging pulled remote calendar events with local events.
 *
 * @param toInsert Remote events that are new (no local match), with syncedAt set to now.
 * @param toUpdate Conflict winners for events that exist both locally and remotely.
 */
data class CalendarEventMergeResult(
    val toInsert: List<CalendarEventEntity>,
    val toUpdate: List<CalendarEventEntity>,
)

/**
 * Manages calendar event synchronization logic: push filtering, conflict resolution,
 * and pull merging. Pure Kotlin with no Android dependencies.
 *
 * Follows the global sync strategy:
 * - Last-writer-wins (LWW) based on modifiedAt
 * - Remote preference on ties (identical modifiedAt)
 */
class CalendarEventSyncManager(
    private val clock: () -> Long = { System.currentTimeMillis() },
) {

    /**
     * Selects calendar events that need to be pushed to the remote server.
     * An event is a push candidate if it has never been synced (syncedAt == null)
     * or has been modified since the last sync (modifiedAt > syncedAt).
     */
    fun getPushCandidates(events: List<CalendarEventEntity>): List<CalendarEventEntity> =
        events.filter { event ->
            event.syncedAt == null || event.modifiedAt > event.syncedAt
        }

    /**
     * Resolves a conflict between a local and remote calendar event with the same ID.
     * Uses last-writer-wins strategy: the record with the later modifiedAt wins.
     * On tie (identical modifiedAt), the remote record wins.
     */
    fun resolveConflict(local: CalendarEventEntity, remote: CalendarEventEntity): CalendarEventEntity =
        if (remote.modifiedAt >= local.modifiedAt) remote else local

    /**
     * Merges pulled remote calendar events into the local store.
     *
     * - Remote events whose ID does not exist locally are inserted with syncedAt = now.
     * - Remote events whose ID exists locally go through conflict resolution;
     *   the winner is placed in toUpdate with syncedAt = now.
     */
    fun mergePulledEvents(
        localEvents: List<CalendarEventEntity>,
        remoteEvents: List<CalendarEventEntity>,
    ): CalendarEventMergeResult {
        val now = clock()
        val localById = localEvents.associateBy { it.id }

        val toInsert = mutableListOf<CalendarEventEntity>()
        val toUpdate = mutableListOf<CalendarEventEntity>()

        for (remote in remoteEvents) {
            val local = localById[remote.id]
            if (local == null) {
                toInsert.add(remote.copy(syncedAt = now))
            } else {
                val winner = resolveConflict(local, remote)
                toUpdate.add(winner.copy(syncedAt = now))
            }
        }

        return CalendarEventMergeResult(toInsert = toInsert, toUpdate = toUpdate)
    }
}
