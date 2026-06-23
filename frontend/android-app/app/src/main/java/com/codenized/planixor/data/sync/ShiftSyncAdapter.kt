package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftEntity
import javax.inject.Inject

/**
 * Manages shift synchronization: push local changes to the API,
 * pull remote changes, and merge with LWW conflict resolution.
 *
 * Data Isolation:
 * This adapter only runs for authenticated users with an active subscription.
 * The caller (SyncServiceController) gates invocation on auth + subscription status.
 * For free (anonymous) users, this adapter is never invoked — all data remains local-only.
 *
 * Follows the same pattern as CalendarEventSyncAdapter and NotificationRecordSyncAdapter.
 */
class ShiftSyncAdapter @Inject constructor(
    private val shiftDao: ShiftDao,
    private val syncApiService: ShiftSyncApiService,
) {

    companion object {
        const val MAX_BATCH_SIZE = 100
    }

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
     * Pushes locally modified shifts to the API in batches of 100.
     * Marks all records in a successful batch as synced (API returns syncedCount, not individual IDs).
     */
    suspend fun push(): SyncResult {
        return try {
            val candidates = shiftDao.getUnsynced()

            if (candidates.isEmpty()) {
                return SyncResult(pushed = 0)
            }

            val batches = candidates.chunked(MAX_BATCH_SIZE)
            var totalPushed = 0

            for (batch in batches) {
                val records = batch.map { it.toSyncRecord() }
                val request = ShiftSyncPushRequest(shifts = records)
                val response = syncApiService.push(request)

                if (!response.isSuccessful) {
                    return SyncResult(
                        pushed = totalPushed,
                        success = false,
                        error = "Push failed with HTTP ${response.code()}",
                    )
                }

                val body = response.body()?.data ?: return SyncResult(
                    pushed = totalPushed,
                    success = false,
                    error = "Push response body is null",
                )

                // Mark all batch records as synced
                val now = System.currentTimeMillis()
                val syncedEntities = batch.map { it.copy(syncedAt = now) }
                shiftDao.upsertAll(syncedEntities)
                totalPushed += body.syncedCount
            }

            SyncResult(pushed = totalPushed)
        } catch (e: Exception) {
            SyncResult(success = false, error = e.message ?: "Push failed unexpectedly")
        }
    }

    /**
     * Pulls remote shifts modified after lastSyncedAt, paginated with cursor.
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

                val body = response.body()?.data ?: return SyncResult(
                    inserted = totalInserted,
                    updated = totalUpdated,
                    success = false,
                    error = "Pull response body is null",
                )

                if (body.shifts.isNotEmpty()) {
                    val mergeResult = mergeRemoteRecords(body.shifts)
                    totalInserted += mergeResult.inserted
                    totalUpdated += mergeResult.updated
                }

                cursor = if (body.hasMore) body.cursor else null
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
     * - New remote → insert with syncedAt = now
     * - Existing local unmodified (modifiedAt <= syncedAt) → overwrite with remote
     * - Existing local modified → LWW (remote wins on tie)
     */
    private suspend fun mergeRemoteRecords(remoteRecords: List<ShiftSyncRecord>): ShiftMergeStats {
        val now = System.currentTimeMillis()
        var inserted = 0
        var updated = 0

        for (record in remoteRecords) {
            val remoteEntity = record.toEntity(syncedAt = now)
            val local = shiftDao.getById(record.id)

            if (local == null) {
                shiftDao.upsert(remoteEntity)
                inserted++
            } else if (local.syncedAt != null && local.modifiedAt <= local.syncedAt) {
                shiftDao.upsert(remoteEntity)
                updated++
            } else {
                val remoteModifiedAt = parseIsoToTimestamp(record.modifiedAt)
                val winner = resolveConflict(local, remoteEntity, remoteModifiedAt)

                if (winner.id == remoteEntity.id && winner.modifiedAt == remoteEntity.modifiedAt) {
                    shiftDao.upsert(remoteEntity)
                    updated++
                }
            }
        }

        return ShiftMergeStats(inserted = inserted, updated = updated)
    }

    /**
     * Resolves a conflict between a local and remote record with the same ID.
     * Uses last-writer-wins based on modifiedAt. Remote wins on tie.
     */
    private fun resolveConflict(
        local: ShiftEntity,
        remote: ShiftEntity,
        remoteModifiedAt: Long,
    ): ShiftEntity {
        return if (local.modifiedAt > remoteModifiedAt) local else remote
    }

    /**
     * Converts a ShiftEntity to a ShiftSyncRecord for transmission.
     */
    private fun ShiftEntity.toSyncRecord(): ShiftSyncRecord =
        ShiftSyncRecord(
            id = id,
            name = name,
            icon = icon,
            backgroundColor = backgroundColor,
            startTime = startTime,
            endTime = endTime,
            hoursWorked = hoursWorked,
            isActive = isActive,
            createdAt = formatTimestampToIso(createdAt),
            modifiedAt = formatTimestampToIso(modifiedAt),
            isDeleted = isDeleted,
        )

    /**
     * Converts a ShiftSyncRecord to a ShiftEntity for local storage.
     */
    private fun ShiftSyncRecord.toEntity(syncedAt: Long): ShiftEntity =
        ShiftEntity(
            id = id,
            name = name,
            icon = icon,
            backgroundColor = backgroundColor,
            startTime = startTime,
            endTime = endTime,
            hoursWorked = hoursWorked,
            isActive = isActive,
            createdAt = parseIsoToTimestamp(createdAt),
            modifiedAt = parseIsoToTimestamp(modifiedAt),
            syncedAt = syncedAt,
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
     * Handles both "Z" suffix and no-suffix formats from the backend.
     */
    private fun parseIsoToTimestamp(iso: String): Long {
        val normalized = if (iso.endsWith("Z") || iso.contains("+") || iso.indexOf('-', 10) >= 0) {
            iso
        } else {
            "${iso}Z"
        }
        val instant = java.time.Instant.parse(normalized)
        return instant.toEpochMilli()
    }
}

/**
 * Internal tracking for merge operation statistics.
 */
private data class ShiftMergeStats(
    val inserted: Int = 0,
    val updated: Int = 0,
)
