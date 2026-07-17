package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.ShiftModeSettingDao
import com.codenized.planixor.data.local.ShiftModeSettingEntity
import javax.inject.Inject

/**
 * Manages shift mode setting synchronization: push local changes to the API,
 * pull remote changes, and merge with LWW conflict resolution.
 *
 * Data Isolation:
 * This adapter only runs for authenticated users with an active subscription.
 * The caller (SyncServiceController) gates invocation on auth + subscription status.
 * For free (anonymous) users, this adapter is never invoked — all data remains local-only.
 *
 * Single-row entity: at most one ShiftModeSetting record exists per device.
 * Follows the same pattern as ReminderSyncAdapter and ShiftSyncAdapter.
 */
class ShiftModeSettingSyncAdapter @Inject constructor(
    private val shiftModeSettingDao: ShiftModeSettingDao,
    private val syncApiService: ShiftModeSettingSyncApiService,
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
     * Pushes locally modified shift mode setting records to the API.
     * Single-row entity safety: if multiple records exist locally (corrupt state),
     * keeps only the most recently modified one and deletes the rest before pushing.
     * At most 1 record will ever be pushed.
     */
    suspend fun push(): SyncResult {
        return try {
            val allRecords = shiftModeSettingDao.getAll()

            // Deduplication safety: if multiple records exist, keep only the most recent
            if (allRecords.size > 1) {
                val sorted = allRecords.sortedByDescending { it.modifiedAt }
                val keep = sorted.first()
                shiftModeSettingDao.deleteAllExcept(keep.id)
            }

            val candidates = shiftModeSettingDao.getUnsyncedRecords()

            if (candidates.isEmpty()) {
                return SyncResult(pushed = 0)
            }

            // Only push the single most recent record (guaranteed by dedup above)
            val recordToPush = candidates.maxByOrNull { it.modifiedAt } ?: return SyncResult(pushed = 0)
            val records = listOf(recordToPush.toSyncRecord())
            val request = ShiftModeSettingSyncPushRequest(records = records)
            val response = syncApiService.push(request)

            if (!response.isSuccessful) {
                return SyncResult(
                    pushed = 0,
                    success = false,
                    error = "Push failed with HTTP ${response.code()}",
                )
            }

            val body = response.body()?.data ?: return SyncResult(
                pushed = 0,
                success = false,
                error = "Push response body is null",
            )

            // Mark the pushed record as synced
            val now = System.currentTimeMillis()
            shiftModeSettingDao.upsert(recordToPush.copy(syncedAt = now))

            SyncResult(pushed = body.syncedCount)
        } catch (e: Exception) {
            SyncResult(success = false, error = e.message ?: "Push failed unexpectedly")
        }
    }

    /**
     * Pulls remote shift mode setting records modified after lastSyncedAt, paginated with cursor.
     * Applies LWW merge logic: remote modifiedAt > local modifiedAt → overwrite local.
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

                if (body.records.isNotEmpty()) {
                    val mergeResult = mergeRemoteRecords(body.records)
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
     * Single-row entity constraint: at most 1 ShiftModeSetting record should exist locally.
     * If the remote record has a different ID than the existing local record, we apply LWW
     * between them and keep only the winner — preventing duplication across devices.
     *
     * LWW merge logic:
     * - If remote modifiedAt > local modifiedAt → overwrite local
     * - Otherwise → skip (keep local)
     * - If no local record exists → insert
     * - If local exists with different ID → LWW across IDs, keep winner only
     */
    private suspend fun mergeRemoteRecords(remoteRecords: List<ShiftModeSettingSyncRecord>): ShiftModeSettingMergeStats {
        val now = System.currentTimeMillis()
        var inserted = 0
        var updated = 0

        // Load all local records (should be at most 1) for lookup
        val localRecords = shiftModeSettingDao.getAll()
        val localMap = localRecords.associateBy { it.id }

        for (record in remoteRecords) {
            val remoteModifiedAt = parseIsoToTimestamp(record.modifiedAt)
            val remoteEntity = record.toEntity(syncedAt = now, modifiedAtMillis = remoteModifiedAt)
            val localById = localMap[record.id]

            if (localById != null) {
                // Same ID — standard LWW merge
                if (remoteModifiedAt > localById.modifiedAt) {
                    shiftModeSettingDao.upsert(remoteEntity)
                    updated++
                }
                // Otherwise → skip (keep local)
            } else if (localRecords.isEmpty()) {
                // No local records at all — insert the remote
                shiftModeSettingDao.upsert(remoteEntity)
                inserted++
            } else {
                // A local record exists with a DIFFERENT ID — apply LWW across IDs
                val existingLocal = localRecords.first()
                if (remoteModifiedAt > existingLocal.modifiedAt) {
                    // Remote wins — delete the old local record and insert the remote
                    shiftModeSettingDao.deleteById(existingLocal.id)
                    shiftModeSettingDao.upsert(remoteEntity)
                    updated++
                }
                // Otherwise local wins — skip the remote (don't insert a duplicate)
            }
        }

        return ShiftModeSettingMergeStats(inserted = inserted, updated = updated)
    }

    /**
     * Converts a ShiftModeSettingEntity to a ShiftModeSettingSyncRecord for transmission.
     */
    private fun ShiftModeSettingEntity.toSyncRecord(): ShiftModeSettingSyncRecord =
        ShiftModeSettingSyncRecord(
            id = id,
            enabled = enabled,
            modifiedAt = formatTimestampToIso(modifiedAt),
            isDeleted = isDeleted,
        )

    /**
     * Converts a ShiftModeSettingSyncRecord to a ShiftModeSettingEntity for local storage.
     */
    private fun ShiftModeSettingSyncRecord.toEntity(syncedAt: Long, modifiedAtMillis: Long): ShiftModeSettingEntity =
        ShiftModeSettingEntity(
            id = id,
            enabled = enabled,
            modifiedAt = modifiedAtMillis,
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
private data class ShiftModeSettingMergeStats(
    val inserted: Int = 0,
    val updated: Int = 0,
)
