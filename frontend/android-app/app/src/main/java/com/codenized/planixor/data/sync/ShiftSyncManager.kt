package com.codenized.planixor.data.sync

import com.codenized.planixor.domain.model.Shift

/**
 * Result of merging pulled remote shifts with local shifts.
 *
 * @param toInsert Remote shifts that are new (no local match), with syncedAt set to now.
 * @param toUpdate Conflict winners for shifts that exist both locally and remotely.
 */
data class MergeResult(
    val toInsert: List<Shift>,
    val toUpdate: List<Shift>,
)

/**
 * Manages shift synchronization logic: push filtering, conflict resolution,
 * and pull merging. Pure Kotlin with no Android dependencies.
 */
class ShiftSyncManager(
    private val clock: () -> Long = { System.currentTimeMillis() },
) {

    /**
     * Selects shifts that need to be pushed to the remote server.
     * A shift is a push candidate if it has never been synced (syncedAt == null)
     * or has been modified since the last sync (modifiedAt > syncedAt).
     */
    fun getPushCandidates(shifts: List<Shift>): List<Shift> =
        shifts.filter { shift ->
            shift.syncedAt == null || shift.modifiedAt > shift.syncedAt
        }

    /**
     * Resolves a conflict between a local and remote shift with the same ID.
     * Uses last-writer-wins strategy: the record with the later modifiedAt wins.
     * On tie (identical modifiedAt), the remote record wins.
     */
    fun resolveConflict(local: Shift, remote: Shift): Shift =
        if (remote.modifiedAt >= local.modifiedAt) remote else local

    /**
     * Merges pulled remote shifts into the local store.
     *
     * - Remote shifts whose ID does not exist locally are inserted with syncedAt = now.
     * - Remote shifts whose ID exists locally go through conflict resolution;
     *   the winner is placed in toUpdate with syncedAt = now.
     */
    fun mergePulledShifts(localShifts: List<Shift>, remoteShifts: List<Shift>): MergeResult {
        val now = clock()
        val localById = localShifts.associateBy { it.id }

        val toInsert = mutableListOf<Shift>()
        val toUpdate = mutableListOf<Shift>()

        for (remote in remoteShifts) {
            val local = localById[remote.id]
            if (local == null) {
                toInsert.add(remote.copy(syncedAt = now))
            } else {
                val winner = resolveConflict(local, remote)
                toUpdate.add(winner.copy(syncedAt = now))
            }
        }

        return MergeResult(toInsert = toInsert, toUpdate = toUpdate)
    }
}
