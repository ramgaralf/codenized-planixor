package com.codenized.planixor.data.sync

import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import javax.inject.Inject

/**
 * Result of a sync operation (push, pull, or full sync).
 */
data class SyncResult(
    val pushed: Int = 0,
    val inserted: Int = 0,
    val updated: Int = 0,
    val rejected: Int = 0,
    val success: Boolean = true,
    val error: String? = null,
)

/**
 * Manages calendar event synchronization: push local changes to the API,
 * pull remote changes, and merge with LWW conflict resolution.
 *
 * Data Isolation (Req 13.3, 13.7):
 * This adapter only runs for authenticated users with an active subscription.
 * The caller (SyncService/WorkManager) gates invocation on auth + subscription status.
 * Foreign/rejected records returned by the API are discarded — rejected IDs increment
 * totalRejected but are never stored locally. For free (anonymous) users, this adapter
 * is never invoked — all data remains local-only.
 *
 * Follows the same pattern as ShiftSyncManager and ReminderSyncManager:
 * pure sync logic with injected dependencies for testability.
 *
 * Integrates with the existing SyncService (WorkManager) by exposing
 * suspend functions that can be called from the sync worker.
 */
class CalendarEventSyncAdapter @Inject constructor(
    private val calendarEventDao: CalendarEventDao,
    private val syncApiService: CalendarEventSyncApiService,
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
     * Pushes locally modified calendar events to the API in batches of 100.
     * Sets syncedAt on acknowledged records. Discards rejected records.
     */
    suspend fun push(): SyncResult {
        return try {
            val candidates = calendarEventDao.getUnsynced()

            if (candidates.isEmpty()) {
                return SyncResult(pushed = 0)
            }

            val batches = candidates.chunked(MAX_BATCH_SIZE)
            var totalPushed = 0
            var totalRejected = 0

            for (batch in batches) {
                val records = batch.map { it.toSyncRecord() }
                val request = CalendarEventSyncPushRequest(records = records)
                val response = syncApiService.push(request)

                if (!response.isSuccessful) {
                    return SyncResult(
                        pushed = totalPushed,
                        rejected = totalRejected,
                        success = false,
                        error = "Push failed with HTTP ${response.code()}",
                    )
                }

                val body = response.body() ?: return SyncResult(
                    pushed = totalPushed,
                    rejected = totalRejected,
                    success = false,
                    error = "Push response body is null",
                )

                // Mark acknowledged records as synced
                if (body.acknowledgedIds.isNotEmpty()) {
                    val now = System.currentTimeMillis()
                    for (id in body.acknowledgedIds) {
                        val event = calendarEventDao.getById(id)
                        if (event != null) {
                            calendarEventDao.update(event.copy(syncedAt = now))
                        }
                    }
                    totalPushed += body.acknowledgedIds.size
                }

                totalRejected += body.rejectedIds.size
            }

            SyncResult(pushed = totalPushed, rejected = totalRejected)
        } catch (e: Exception) {
            SyncResult(success = false, error = e.message ?: "Push failed unexpectedly")
        }
    }

    /**
     * Pulls remote calendar events modified after lastSyncedAt, paginated with cursor.
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
                    val mergeResult = mergeRemoteRecords(body.records)
                    totalInserted += mergeResult.inserted
                    totalUpdated += mergeResult.updated
                }

                cursor = body.cursor
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
     * - Remote isDeleted=true → mark local as deleted or insert as deleted
     */
    private suspend fun mergeRemoteRecords(remoteRecords: List<CalendarEventSyncRecord>): MergeStats {
        val now = System.currentTimeMillis()
        var inserted = 0
        var updated = 0

        for (record in remoteRecords) {
            val remoteEntity = record.toEntity(syncedAt = now)
            val local = calendarEventDao.getById(record.id)

            if (local == null) {
                // New remote record — insert with syncedAt set to now
                calendarEventDao.insert(remoteEntity)
                inserted++
            } else if (local.syncedAt != null && local.modifiedAt <= local.syncedAt) {
                // Local record has no modifications since last sync — overwrite with remote
                calendarEventDao.update(remoteEntity)
                updated++
            } else {
                // Local record has modifications — apply LWW conflict resolution
                val remoteModifiedAt = parseIsoToTimestamp(record.modifiedAt)
                val winner = resolveConflict(local, remoteEntity, remoteModifiedAt)

                if (winner.id == remoteEntity.id && winner.modifiedAt == remoteEntity.modifiedAt) {
                    // Remote won — overwrite local
                    calendarEventDao.update(remoteEntity)
                    updated++
                }
                // If local won — do nothing (local stays as is)
            }
        }

        return MergeStats(inserted = inserted, updated = updated)
    }

    /**
     * Resolves a conflict between a local and remote record with the same ID.
     * Uses last-writer-wins based on modifiedAt. Remote wins on tie.
     */
    private fun resolveConflict(
        local: CalendarEventEntity,
        remote: CalendarEventEntity,
        remoteModifiedAt: Long,
    ): CalendarEventEntity {
        return if (local.modifiedAt > remoteModifiedAt) local else remote
    }

    /**
     * Converts a CalendarEventEntity to a CalendarEventSyncRecord for transmission.
     */
    private fun CalendarEventEntity.toSyncRecord(): CalendarEventSyncRecord =
        CalendarEventSyncRecord(
            id = id,
            eventType = eventType,
            eventTypeId = eventTypeId,
            day = day,
            startTime = startTime,
            endTime = endTime,
            notes = notes,
            modifiedAt = formatTimestampToIso(modifiedAt),
            isDeleted = isDeleted,
        )

    /**
     * Converts a CalendarEventSyncRecord to a CalendarEventEntity for local storage.
     */
    private fun CalendarEventSyncRecord.toEntity(syncedAt: Long): CalendarEventEntity =
        CalendarEventEntity(
            id = id,
            eventType = eventType,
            eventTypeId = eventTypeId,
            day = day,
            startTime = startTime,
            endTime = endTime,
            notes = notes,
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
     */
    private fun parseIsoToTimestamp(iso: String): Long {
        val instant = java.time.Instant.parse(iso)
        return instant.toEpochMilli()
    }
}

/**
 * Internal tracking for merge operation statistics.
 */
private data class MergeStats(
    val inserted: Int = 0,
    val updated: Int = 0,
)
