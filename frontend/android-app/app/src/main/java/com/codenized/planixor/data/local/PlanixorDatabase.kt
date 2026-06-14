package com.codenized.planixor.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * Room database for the Planixor application.
 */
@Database(
    entities = [CalendarEventEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class PlanixorDatabase : RoomDatabase() {
    abstract fun calendarEventDao(): CalendarEventDao
}
