package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.NotificationRecordEntity
import javax.inject.Inject

/**
 * Manages notification record synchronization: push local changes to the API,
 * pull remote changes, and merge with LWW conflict resolution.
 *
 * Data Isolation:
 * This adapter only runs for authenticated users with an active subscription.
 * The caller (SyncService/WorkManager) gates invocation on auth + subscription status.
 * Foreign/rejected records returned by the API are discarded — rejected IDs increment
 * totalRejected but are never stored locally. For free (anonymous) users, this adapter
 * is never invoked — all data remains local-only.
 *
 * Follows the same pattern as CalendarEventSyncAdapter:
 * pure sync logic with injected dependencies for testability.
 *
 * Integrates with the existing SyncService (WorkManager) by exposing
 * suspend functions that can be called from the sync worker.
 *
 * Sync order within a cycle:
 * 1. Push CalendarEvents → 2. Push NotificationRecords → 3. Pull CalendarEvents → 4. Pull NotificationRecords
 */
class NotificationRecordSyncAdapter @Inject constructor(
    private val notificationRecordDao: NotificationRecordDao,
    private val syncApiService: NotificationRecordSyncApiService,
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
     * Pushes locally modified notification records to the API in batches of 100.
     * Sets syncedAt on acknowledged records. Discards rejected records.
     * On network failure, leaves syncedAt unchanged (records remain candidates for next push).
     */
    suspend fun push(): SyncResult {
        return try {
            val candidates = notificationRecordDao.getUnsynced()

            if (candidates.isEmpty()) {
                return SyncResult(pushed = 0)
            }

            val batches = candidates.chunked(MAX_BATCH_SIZE)
            var totalPushed = 0
            var totalRejected = 0

            for (batch in batches) {
                val records = batch.map { it.toSyncRecord() }
                val request = NotificationRecordSyncPushRequest(records = records)
                val response = syncApiService.push(request)

                if (!response.isSuccessful) {
                    return SyncResult(
                        pushed = totalPushed,
                        rejected = totalRejected,
                        success = false,
                        error = "Push failed with HTTP ${response.code()}",
                    )
                }

                val body = response.body()?.data ?: return SyncResult(
                    pushed = totalPushed,
                    rejected = totalRejected,
                    success = false,
                    error = "Push response body is null",
                )

                // Mark acknowledged records as synced
                if (body.acknowledgedIds.isNotEmpty()) {
                    val now = System.currentTimeMillis()
                    for (id in body.acknowledgedIds) {
                        val record = notificationRecordDao.getById(id)
                        if (record != null) {
                            notificationRecordDao.update(record.copy(syncedAt = now))
                        }
                    }
                    totalPushed += body.acknowledgedIds.size
                }

                totalRejected += body.rejectedIds.size
            }

            SyncResult(pushed = totalPushed, rejected = totalRejected)
        } catch (e: Exception) {
            // Network failure: leave syncedAt unchanged, don't crash
            SyncResult(success = false, error = e.message ?: "Push failed unexpectedly")
        }
    }

    /**
     * Pulls remote notification records modified after lastSyncedAt, paginated with cursor.
     * Applies merge logic: insert new, overwrite unmodified, LWW for conflicts.
     * On network failure, leaves syncedAt unchanged and returns error result.
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

                cursor = body.cursor
            } while (cursor != null)

            SyncResult(inserted = totalInserted, updated = totalUpdated)
        } catch (e: Exception) {
            // Network failure: leave syncedAt unchanged, don't crash
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
     * - Remote isDeleted=true → mark local as deleted or insert as deleted
     */
    private suspend fun mergeRemoteRecords(remoteRecords: List<NotificationRecordSyncRecord>): NotificationMergeStats {
        val now = System.currentTimeMillis()
        var inserted = 0
        var updated = 0

        for (record in remoteRecords) {
            val remoteEntity = record.toEntity(syncedAt = now)
            val local = notificationRecordDao.getById(record.id)

            if (local == null) {
                // New remote record — insert with syncedAt set to now
                notificationRecordDao.insert(remoteEntity)
                inserted++
            } else if (local.syncedAt != null && local.modifiedAt <= local.syncedAt) {
                // Local record has no modifications since last sync — overwrite with remote
                notificationRecordDao.update(remoteEntity)
                updated++
            } else {
                // Local record has modifications — apply LWW conflict resolution
                val remoteModifiedAt = parseIsoToTimestamp(record.modifiedAt)
                val winner = resolveConflict(local, remoteEntity, remoteModifiedAt)

                if (winner.id == remoteEntity.id && winner.modifiedAt == remoteEntity.modifiedAt) {
                    // Remote won — overwrite local
                    notificationRecordDao.update(remoteEntity)
                    updated++
                }
                // If local won — do nothing (local stays as is)
            }
        }

        return NotificationMergeStats(inserted = inserted, updated = updated)
    }

    /**
     * Resolves a conflict between a local and remote record with the same ID.
     * Uses last-writer-wins based on modifiedAt. Remote wins on tie.
     */
    private fun resolveConflict(
        local: NotificationRecordEntity,
        remote: NotificationRecordEntity,
        remoteModifiedAt: Long,
    ): NotificationRecordEntity {
        return if (local.modifiedAt > remoteModifiedAt) local else remote
    }

    /**
     * Converts a NotificationRecordEntity to a NotificationRecordSyncRecord for transmission.
     */
    private fun NotificationRecordEntity.toSyncRecord(): NotificationRecordSyncRecord =
        NotificationRecordSyncRecord(
            id = id,
            calendarEventId = calendarEventId,
            alertOffset = alertOffset,
            triggerTime = formatTimestampToIso(triggerTime),
            isDelivered = isDelivered,
            isRead = isRead,
            modifiedAt = formatTimestampToIso(modifiedAt),
            isDeleted = isDeleted,
        )

    /**
     * Converts a NotificationRecordSyncRecord to a NotificationRecordEntity for local storage.
     */
    private fun NotificationRecordSyncRecord.toEntity(syncedAt: Long): NotificationRecordEntity =
        NotificationRecordEntity(
            id = id,
            calendarEventId = calendarEventId,
            alertOffset = alertOffset,
            triggerTime = parseIsoToTimestamp(triggerTime),
            isDelivered = isDelivered,
            isRead = isRead,
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
private data class NotificationMergeStats(
    val inserted: Int = 0,
    val updated: Int = 0,
)
