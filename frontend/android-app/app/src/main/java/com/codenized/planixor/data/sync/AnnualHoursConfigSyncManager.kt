package com.codenized.planixor.data.sync

import com.codenized.planixor.domain.model.AnnualHoursConfig

/**
 * Result of merging pulled remote annual hours configs with local records.
 *
 * @param toInsert Remote records that are new (no local match), with syncedAt set to now.
 * @param toUpdate Conflict winners for records that exist both locally and remotely.
 */
data class AnnualHoursConfigMergeResult(
    val toInsert: List<AnnualHoursConfig>,
    val toUpdate: List<AnnualHoursConfig>,
)

/**
 * Manages annual hours config synchronization logic: push filtering, conflict resolution,
 * and pull merging. Pure Kotlin with no Android dependencies.
 *
 * Mirrors ReminderSyncManager/ShiftSyncManager patterns — implements the same sync adapter
 * contract for the cross-cutting sync service.
 */
class AnnualHoursConfigSyncManager(
    private val clock: () -> Long = { System.currentTimeMillis() },
) {

    companion object {
        const val MAX_BATCH_SIZE = 100
    }

    /**
     * Selects records that need to be pushed to the remote server.
     * A record is a push candidate if it has never been synced (syncedAt == null)
     * or has been modified since the last sync (modifiedAt > syncedAt).
     */
    fun getPushCandidates(records: List<AnnualHoursConfig>): List<AnnualHoursConfig> =
        records.filter { record ->
            record.syncedAt == null || record.modifiedAt > record.syncedAt
        }

    /**
     * Splits push candidates into batches of at most [MAX_BATCH_SIZE] records.
     */
    fun batchForPush(candidates: List<AnnualHoursConfig>): List<List<AnnualHoursConfig>> =
        candidates.chunked(MAX_BATCH_SIZE)

    /**
     * Resolves a conflict between a local and remote record with the same ID.
     * Uses last-writer-wins strategy: the record with the later modifiedAt wins.
     * On tie (identical modifiedAt), the remote record wins.
     */
    fun resolveConflict(local: AnnualHoursConfig, remote: AnnualHoursConfig): AnnualHoursConfig =
        if (remote.modifiedAt >= local.modifiedAt) remote else local

    /**
     * Merges pulled remote records into the local store.
     *
     * - Remote records whose ID does not exist locally are inserted with syncedAt = now.
     * - Remote records whose ID exists locally go through conflict resolution;
     *   the winner is placed in toUpdate with syncedAt = now.
     */
    fun mergePulledRecords(
        localRecords: List<AnnualHoursConfig>,
        remoteRecords: List<AnnualHoursConfig>,
    ): AnnualHoursConfigMergeResult {
        val now = clock()
        val localById = localRecords.associateBy { it.id }

        val toInsert = mutableListOf<AnnualHoursConfig>()
        val toUpdate = mutableListOf<AnnualHoursConfig>()

        for (remote in remoteRecords) {
            val local = localById[remote.id]
            if (local == null) {
                toInsert.add(remote.copy(syncedAt = now))
            } else {
                val winner = resolveConflict(local, remote)
                toUpdate.add(winner.copy(syncedAt = now))
            }
        }

        return AnnualHoursConfigMergeResult(toInsert = toInsert, toUpdate = toUpdate)
    }

    /**
     * Marks successfully pushed records as synced by setting syncedAt to now.
     */
    fun markAsSynced(records: List<AnnualHoursConfig>): List<AnnualHoursConfig> {
        val now = clock()
        return records.map { it.copy(syncedAt = now) }
    }
}
