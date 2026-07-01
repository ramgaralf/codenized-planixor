package com.codenized.planixor.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for notification records.
 * Provides queries for due notifications, delivery state, sync support, and CRUD operations.
 */
@Dao
interface NotificationRecordDao {

    /**
     * Returns notifications that are due for delivery.
     * A notification is due if triggerTime <= nowMillis, not yet delivered, and not deleted.
     * Ordered by triggerTime ASC (oldest due first).
     */
    @Query("SELECT * FROM notification_records WHERE triggerTime <= :nowMillis AND isDelivered = 0 AND isDeleted = 0 ORDER BY triggerTime ASC")
    suspend fun getDueNotifications(nowMillis: Long): List<NotificationRecordEntity>

    /**
     * Returns unread delivered notifications for the notification view.
     * Filtered to non-deleted, delivered, unread records.
     * Ordered by triggerTime DESC (most recent first), limited to 100.
     */
    @Query("SELECT * FROM notification_records WHERE isRead = 0 AND isDelivered = 1 AND isDeleted = 0 ORDER BY triggerTime DESC LIMIT 100")
    fun getUnreadDelivered(): Flow<List<NotificationRecordEntity>>

    /**
     * Returns the count of unread delivered notifications for the badge.
     */
    @Query("SELECT COUNT(*) FROM notification_records WHERE isRead = 0 AND isDelivered = 1 AND isDeleted = 0")
    fun getUnreadCount(): Flow<Int>

    /**
     * Returns all non-deleted notification records for a given calendar event.
     * Used for reconciliation and cascade delete operations.
     */
    @Query("SELECT * FROM notification_records WHERE calendarEventId = :calendarEventId AND isDeleted = 0")
    suspend fun getByCalendarEventId(calendarEventId: String): List<NotificationRecordEntity>

    /**
     * Returns a single notification record matching calendarEventId and alertOffset.
     * Used for uniqueness checks during reconciliation.
     */
    @Query("SELECT * FROM notification_records WHERE calendarEventId = :calendarEventId AND alertOffset = :alertOffset AND isDeleted = 0 LIMIT 1")
    suspend fun getByCalendarEventIdAndOffset(calendarEventId: String, alertOffset: Int): NotificationRecordEntity?

    /**
     * Returns all records for a calendar event including delivered ones (for cascade delete).
     * Does not filter by isDelivered — returns all non-deleted records.
     */
    @Query("SELECT * FROM notification_records WHERE calendarEventId = :calendarEventId AND isDeleted = 0")
    suspend fun getAllByCalendarEventId(calendarEventId: String): List<NotificationRecordEntity>

    /**
     * Returns unread delivered notifications as a suspend list (non-reactive).
     * Used for batch operations like "mark all as read".
     */
    @Query("SELECT * FROM notification_records WHERE isRead = 0 AND isDelivered = 1 AND isDeleted = 0 ORDER BY triggerTime DESC LIMIT 100")
    suspend fun getUnreadDeliveredList(): List<NotificationRecordEntity>

    /**
     * Returns a single notification record by ID.
     */
    @Query("SELECT * FROM notification_records WHERE id = :id")
    suspend fun getById(id: String): NotificationRecordEntity?

    /**
     * Returns all notification records that need to be pushed to the remote server.
     * A record is unsynced if syncedAt is null or modifiedAt > syncedAt.
     */
    @Query("SELECT * FROM notification_records WHERE syncedAt IS NULL OR modifiedAt > syncedAt")
    suspend fun getUnsynced(): List<NotificationRecordEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: NotificationRecordEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(records: List<NotificationRecordEntity>)

    /**
     * Returns all non-delivered, non-deleted notification records (for rescheduling after boot).
     */
    @Query("SELECT * FROM notification_records WHERE isDelivered = 0 AND isDeleted = 0")
    suspend fun getPendingRecords(): List<NotificationRecordEntity>

    @Update
    suspend fun update(record: NotificationRecordEntity)

    @Update
    suspend fun updateAll(records: List<NotificationRecordEntity>)

    /**
     * Returns all notification records (including soft-deleted).
     * Used by the purge service to identify past/orphaned records.
     */
    @Query("SELECT * FROM notification_records")
    suspend fun getAll(): List<NotificationRecordEntity>

    /**
     * Physically deletes notification records by their IDs.
     * Used by the purge service to permanently remove past/orphaned records.
     */
    @Query("DELETE FROM notification_records WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<String>)

    /**
     * Physically deletes all notification records from local storage.
     * Used during username change to wipe all syncable data.
     */
    @Query("DELETE FROM notification_records")
    suspend fun deleteAll()
}
