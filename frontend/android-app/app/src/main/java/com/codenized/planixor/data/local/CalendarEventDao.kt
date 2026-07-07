package com.codenized.planixor.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for calendar events.
 * Provides queries for CRUD, date-based filtering, and sync support.
 */
@Dao
interface CalendarEventDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: CalendarEventEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(events: List<CalendarEventEntity>)

    @Update
    suspend fun update(event: CalendarEventEntity)

    /**
     * Returns non-deleted events whose [startDay, endDay] range intersects with the
     * given date range [startDate, endDate].
     * Used by Week, Month, and Year views.
     */
    @Query("SELECT * FROM calendar_events WHERE startDay <= :endDate AND endDay >= :startDate AND isDeleted = 0")
    fun getByDateRange(startDate: String, endDate: String): Flow<List<CalendarEventEntity>>

    /**
     * Returns non-deleted events that span a specific day.
     * An event spans a day if startDay <= day <= endDay.
     * Used by Day view.
     */
    @Query("SELECT * FROM calendar_events WHERE startDay <= :day AND endDay >= :day AND isDeleted = 0")
    fun getByDate(day: String): Flow<List<CalendarEventEntity>>

    /**
     * Returns non-deleted shift events for a specific startDay, excluding a given event ID.
     * Used for one-shift-per-day constraint validation.
     */
    @Query("SELECT * FROM calendar_events WHERE startDay = :startDay AND eventType = 'shift' AND isDeleted = 0 AND id != :excludeId")
    suspend fun getShiftsForDate(startDay: String, excludeId: String = ""): List<CalendarEventEntity>

    /**
     * Returns all events that need to be pushed to the remote server.
     * An event is unsynced if syncedAt is null or modifiedAt > syncedAt.
     */
    @Query("SELECT * FROM calendar_events WHERE syncedAt IS NULL OR modifiedAt > syncedAt")
    suspend fun getUnsynced(): List<CalendarEventEntity>

    /**
     * Returns an event by its ID, including soft-deleted events.
     * Used for update operations.
     */
    @Query("SELECT * FROM calendar_events WHERE id = :id")
    suspend fun getById(id: String): CalendarEventEntity?

    /**
     * Returns all events including soft-deleted ones. Used for sync merging.
     */
    @Query("SELECT * FROM calendar_events")
    suspend fun getAll(): List<CalendarEventEntity>

    /**
     * Physically deletes all calendar events from local storage.
     * Used during username change to wipe all syncable data.
     */
    @Query("DELETE FROM calendar_events")
    suspend fun deleteAll()
}
