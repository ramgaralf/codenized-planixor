package com.codenized.planixor.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * Room database for the Planixor application.
 */
@Database(
    entities = [CalendarEventEntity::class, ShiftEntity::class, ReminderEntity::class],
    version = 3,
    exportSchema = false,
)
abstract class PlanixorDatabase : RoomDatabase() {
    abstract fun calendarEventDao(): CalendarEventDao
    abstract fun shiftDao(): ShiftDao
    abstract fun reminderDao(): ReminderDao
}
