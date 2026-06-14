package com.codenized.planixor.data.local

import androidx.room.Dao
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for calendar events.
 */
@Dao
interface CalendarEventDao {

    @Query("SELECT * FROM calendar_events WHERE startAt >= :startMs AND startAt <= :endMs AND isDeleted = 0")
    fun getByDateRange(startMs: Long, endMs: Long): Flow<List<CalendarEventEntity>>

    @Query("SELECT * FROM calendar_events WHERE isDeleted = 0")
    fun getAll(): Flow<List<CalendarEventEntity>>
}
