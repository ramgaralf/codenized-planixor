package com.codenized.planixor.data.sync

import com.codenized.planixor.domain.model.Reminder

/**
 * Result of merging pulled remote reminders with local reminders.
 *
 * @param toInsert Remote reminders that are new (no local match), with syncedAt set to now.
 * @param toUpdate Conflict winners for reminders that exist both locally and remotely.
 */
data class ReminderMergeResult(
    val toInsert: List<Reminder>,
    val toUpdate: List<Reminder>,
)

/**
 * Manages reminder synchronization logic: push filtering, conflict resolution,
 * and pull merging. Pure Kotlin with no Android dependencies.
 *
 * Mirrors ShiftSyncManager patterns — implements the same sync adapter contract
 * for the cross-cutting sync service.
 */
class ReminderSyncManager(
    private val clock: () -> Long = { System.currentTimeMillis() },
) {

    companion object {
        const val MAX_BATCH_SIZE = 100
    }

    /**
     * Selects reminders that need to be pushed to the remote server.
     * A reminder is a push candidate if it has never been synced (syncedAt == null)
     * or has been modified since the last sync (modifiedAt > syncedAt).
     */
    fun getPushCandidates(reminders: List<Reminder>): List<Reminder> =
        reminders.filter { reminder ->
            reminder.syncedAt == null || reminder.modifiedAt > reminder.syncedAt
        }

    /**
     * Splits push candidates into batches of at most [MAX_BATCH_SIZE] records.
     */
    fun batchForPush(candidates: List<Reminder>): List<List<Reminder>> =
        candidates.chunked(MAX_BATCH_SIZE)

    /**
     * Resolves a conflict between a local and remote reminder with the same ID.
     * Uses last-writer-wins strategy: the record with the later modifiedAt wins.
     * On tie (identical modifiedAt), the remote record wins.
     */
    fun resolveConflict(local: Reminder, remote: Reminder): Reminder =
        if (remote.modifiedAt >= local.modifiedAt) remote else local

    /**
     * Merges pulled remote reminders into the local store.
     *
     * - Remote reminders whose ID does not exist locally are inserted with syncedAt = now.
     * - Remote reminders whose ID exists locally go through conflict resolution;
     *   the winner is placed in toUpdate with syncedAt = now.
     */
    fun mergePulledReminders(localReminders: List<Reminder>, remoteReminders: List<Reminder>): ReminderMergeResult {
        val now = clock()
        val localById = localReminders.associateBy { it.id }

        val toInsert = mutableListOf<Reminder>()
        val toUpdate = mutableListOf<Reminder>()

        for (remote in remoteReminders) {
            val local = localById[remote.id]
            if (local == null) {
                toInsert.add(remote.copy(syncedAt = now))
            } else {
                val winner = resolveConflict(local, remote)
                toUpdate.add(winner.copy(syncedAt = now))
            }
        }

        return ReminderMergeResult(toInsert = toInsert, toUpdate = toUpdate)
    }

    /**
     * Marks successfully pushed reminders as synced by setting syncedAt to now.
     */
    fun markAsSynced(reminders: List<Reminder>): List<Reminder> {
        val now = clock()
        return reminders.map { it.copy(syncedAt = now) }
    }
}
