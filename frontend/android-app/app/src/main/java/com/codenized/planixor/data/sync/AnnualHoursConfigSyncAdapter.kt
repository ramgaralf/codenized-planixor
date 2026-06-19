package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.AnnualHoursConfigRepository
import com.codenized.planixor.domain.model.AnnualHoursConfig
import javax.inject.Inject

/**
 * Manages annual hours config synchronization: push local changes to the API,
 * pull remote changes, and merge with LWW conflict resolution.
 *
 * This adapter only runs for authenticated users with an active subscription.
 * The caller (SyncService/WorkManager) gates invocation on auth + subscription status.
 *
 * Integrates with the existing SyncService (WorkManager) by exposing
 * suspend functions that can be called from the sync worker.
 *
 * Uses [AnnualHoursConfigSyncManager] for pure sync logic (batching, conflict resolution,
 * merging) and [AnnualHoursConfigRepository] for local persistence.
 */
class AnnualHoursConfigSyncAdapter @Inject constructor(
    private val repository: AnnualHoursConfigRepository,
    private val syncApiService: AnnualHoursConfigSyncApiService,
    private val syncManager: AnnualHoursConfigSyncManager,
) {

    /**
     * Performs a full sync cycle: push local changes then pull remote changes.
     */
    suspend fun sync(lastSyncedAt: Long?): SyncResult {
        val pushResult = push()
        if (!pushResult.success) {
            return pushResult
        }

        val pullResult = pull(lastSyncedAt)

        return SyncResult(
            pushed = pushResult.pushed,
            inserted = pullResult.inserted,
            updated = pullResult.updated,
            rejected = pushResult.rejected + pullResult.rejected,
            success = pullResult.success,
            error = pullResult.error,
        )
    }

    /**
     * Pushes locally modified annual hours configs to the API in batches of 100.
     * Sets syncedAt on acknowledged records.
     *
     * Error handling:
     * - 5xx: stop push cycle, return error (records remain eligible for next sync)
     * - 4xx: mark records as synced, continue (server rejected them)
     */
    suspend fun push(): SyncResult {
        return try {
            val allRecords = repository.getPendingSync()
            val candidates = syncManager.getPushCandidates(allRecords)

            if (candidates.isEmpty()) {
                return SyncResult(pushed = 0)
            }

            val batches = syncManager.batchForPush(candidates)
            var totalPushed = 0
            var totalRejected = 0

            for (batch in batches) {
                val records = batch.map { it.toSyncRecord() }
                val request = AnnualHoursConfigSyncPushRequest(records = records)
                val response = syncApiService.push(request)

                if (!response.isSuccessful) {
                    val code = response.code()
                    if (code in 500..599) {
                        // 5xx: stop push cycle, leave records unsynced for retry
                        return SyncResult(
                            pushed = totalPushed,
                            rejected = totalRejected,
                            success = false,
                            error = "Push failed with HTTP $code (server error)",
                        )
                    } else {
                        // 4xx: mark records as synced (server rejected them), continue
                        val synced = syncManager.markAsSynced(batch)
                        repository.upsertFromSync(synced)
                        totalRejected += batch.size
                        continue
                    }
                }

                // Successful push — mark records as synced
                val synced = syncManager.markAsSynced(batch)
                repository.upsertFromSync(synced)
                totalPushed += batch.size
            }

            SyncResult(pushed = totalPushed, rejected = totalRejected)
        } catch (e: Exception) {
            SyncResult(success = false, error = e.message ?: "Push failed unexpectedly")
        }
    }

    /**
     * Pulls remote annual hours configs modified after lastSyncedAt, paginated with cursor.
     * Applies merge logic: insert new, overwrite unmodified, LWW for conflicts.
     */
    suspend fun pull(lastSyncedAt: Long?): SyncResult {
        return try {
            val lastSyncedAtIso = lastSyncedAt?.let { formatTimestampToIso(it) }
            var cursor: String? = null
            var totalInserted = 0
            var totalUpdated = 0

            do {
                val response = syncApiService.pull(lastSyncedAtIso, cursor)

                if (!response.isSuccessful) {
                    return SyncResult(
                        inserted = totalInserted,
                        updated = totalUpdated,
                        success = false,
                        error = "Pull failed with HTTP ${response.code()}",
                    )
                }

                val body = response.body() ?: return SyncResult(
                    inserted = totalInserted,
                    updated = totalUpdated,
                    success = false,
                    error = "Pull response body is null",
                )

                if (body.records.isNotEmpty()) {
                    val mergeStats = mergeRemoteRecords(body.records)
                    totalInserted += mergeStats.inserted
                    totalUpdated += mergeStats.updated
                }

                cursor = body.nextCursor
            } while (cursor != null)

            SyncResult(inserted = totalInserted, updated = totalUpdated)
        } catch (e: Exception) {
            SyncResult(success = false, error = e.message ?: "Pull failed unexpectedly")
        }
    }

    /**
     * Merges a page of remote records into the local store.
     *
     * Merge logic:
     * - New remote record → insert with syncedAt = now
     * - Existing local unmodified (modifiedAt <= syncedAt) → overwrite with remote
     * - Existing local modified → LWW conflict resolution (remote wins on tie)
     * - Remote isDeleted=true → mark local as deleted or insert as deleted
     */
    private suspend fun mergeRemoteRecords(
        remoteRecords: List<AnnualHoursConfigSyncRecord>,
    ): AnnualHoursConfigMergeStats {
        val now = System.currentTimeMillis()
        var inserted = 0
        var updated = 0

        for (record in remoteRecords) {
            val remoteDomain = record.toDomain().copy(syncedAt = now)
            val local = repository.getById(record.id)

            if (local == null) {
                // New remote record — insert with syncedAt set to now
                repository.upsertFromSync(listOf(remoteDomain))
                inserted++
            } else if (local.syncedAt != null && local.modifiedAt <= local.syncedAt) {
                // Local record has no modifications since last sync — overwrite with remote
                repository.upsertFromSync(listOf(remoteDomain))
                updated++
            } else {
                // Local record has modifications — apply LWW conflict resolution
                val winner = syncManager.resolveConflict(local, remoteDomain)
                repository.upsertFromSync(listOf(winner.copy(syncedAt = now)))
                updated++
            }
        }

        return AnnualHoursConfigMergeStats(inserted = inserted, updated = updated)
    }

    /**
     * Converts an AnnualHoursConfig domain model to a sync record for transmission.
     */
    private fun AnnualHoursConfig.toSyncRecord(): AnnualHoursConfigSyncRecord =
        AnnualHoursConfigSyncRecord(
            id = id,
            year = year,
            configuredHours = configuredHours,
            modifiedAt = formatTimestampToIso(modifiedAt),
            syncedAt = syncedAt?.let { formatTimestampToIso(it) },
            isDeleted = isDeleted,
        )

    /**
     * Converts an AnnualHoursConfigSyncRecord to an AnnualHoursConfig domain model.
     */
    private fun AnnualHoursConfigSyncRecord.toDomain(): AnnualHoursConfig =
        AnnualHoursConfig(
            id = id,
            year = year,
            configuredHours = configuredHours,
            modifiedAt = parseIsoToTimestamp(modifiedAt),
            syncedAt = syncedAt?.let { parseIsoToTimestamp(it) },
            isDeleted = isDeleted,
        )

    /**
     * Formats a UTC timestamp (millis) to ISO 8601 string.
     */
    private fun formatTimestampToIso(timestamp: Long): String {
        val instant = java.time.Instant.ofEpochMilli(timestamp)
        return instant.toString()
    }

    /**
     * Parses an ISO 8601 datetime string to UTC timestamp (millis).
     */
    private fun parseIsoToTimestamp(iso: String): Long {
        val instant = java.time.Instant.parse(iso)
        return instant.toEpochMilli()
    }
}

/**
 * Internal tracking for merge operation statistics.
 */
private data class AnnualHoursConfigMergeStats(
    val inserted: Int = 0,
    val updated: Int = 0,
)
