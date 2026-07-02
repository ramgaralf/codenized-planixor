package com.codenized.planixor.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for reminders.
 */
@Dao
interface ReminderDao {

    @Query("SELECT * FROM reminders WHERE isDeleted = 0 ORDER BY createdAt ASC")
    fun getAllActive(): Flow<List<ReminderEntity>>

    @Query("SELECT * FROM reminders WHERE id = :id")
    suspend fun getById(id: String): ReminderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(reminder: ReminderEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(reminders: List<ReminderEntity>)

    @Query("UPDATE reminders SET isDeleted = 1, modifiedAt = :now, syncedAt = NULL WHERE id = :id")
    suspend fun softDelete(id: String, now: Long)

    @Query("UPDATE reminders SET isActive = :isActive, modifiedAt = :now WHERE id = :id")
    suspend fun setActive(id: String, isActive: Boolean, now: Long)

    /**
     * Returns all reminders that need to be pushed to the remote server.
     * A reminder is unsynced if syncedAt is null or modifiedAt > syncedAt.
     */
    @Query("SELECT * FROM reminders WHERE syncedAt IS NULL OR modifiedAt > syncedAt")
    suspend fun getUnsynced(): List<ReminderEntity>

    /**
     * Returns all reminders including soft-deleted ones. Used for sync merging.
     */
    @Query("SELECT * FROM reminders")
    suspend fun getAll(): List<ReminderEntity>

    /**
     * Returns all active, non-deleted reminders for calendar event selection.
     * Only reminders with isActive = true and isDeleted = false are included.
     * Ordered by createdAt ASC (oldest first).
     */
    @Query("SELECT * FROM reminders WHERE isDeleted = 0 AND isActive = 1 ORDER BY createdAt ASC")
    fun getActiveForCalendarSelection(): Flow<List<ReminderEntity>>

    /**
     * Physically deletes all reminders from local storage.
     * Used during username change to wipe all syncable data.
     */
    @Query("DELETE FROM reminders")
    suspend fun deleteAll()
}
