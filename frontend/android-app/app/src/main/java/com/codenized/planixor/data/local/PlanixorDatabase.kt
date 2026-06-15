package com.codenized.planixor.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * Room database for the Planixor application.
 */
@Database(
    entities = [CalendarEventEntity::class, ShiftEntity::class],
    version = 2,
    exportSchema = false,
)
abstract class PlanixorDatabase : RoomDatabase() {
    abstract fun calendarEventDao(): CalendarEventDao
    abstract fun shiftDao(): ShiftDao
}
