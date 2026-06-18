package com.codenized.planixor.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * Room database for the Planixor application.
 *
 * Data Isolation (Req 13.1, 13.5, 13.7):
 * - Ownership is implicit: all records belong to the current device session.
 * - No userId is stored per record — the authenticated session determines ownership.
 * - Sign-out/sign-in: the auth module is responsible for clearing or scoping the
 *   database on account switch so the previous user's data is inaccessible to the
 *   new user. Data is retained for restoration when the original account signs back in.
 * - Free (anonymous) users: sync is inactive; all data remains local-only on this device.
 */
@Database(
    entities = [CalendarEventEntity::class, ShiftEntity::class, ReminderEntity::class],
    version = 5,
    exportSchema = false,
)
abstract class PlanixorDatabase : RoomDatabase() {
    abstract fun calendarEventDao(): CalendarEventDao
    abstract fun shiftDao(): ShiftDao
    abstract fun reminderDao(): ReminderDao

    companion object {
        /**
         * Migration from version 3 to 4:
         * Drops the old calendar_events table (which had a different schema)
         * and recreates it with the new fields matching the calendar event data model.
         */
        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Drop old table with incompatible schema
                db.execSQL("DROP TABLE IF EXISTS `calendar_events`")

                // Create new table with correct schema
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `calendar_events` (
                        `id` TEXT NOT NULL,
                        `eventType` TEXT NOT NULL,
                        `eventTypeId` TEXT NOT NULL,
                        `day` TEXT NOT NULL,
                        `startTime` INTEGER NOT NULL,
                        `endTime` INTEGER NOT NULL,
                        `notes` TEXT,
                        `modifiedAt` INTEGER NOT NULL,
                        `syncedAt` INTEGER,
                        `isDeleted` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )

                // Create indexes
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_day_eventType_isDeleted` ON `calendar_events` (`day`, `eventType`, `isDeleted`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_day` ON `calendar_events` (`day`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_isDeleted` ON `calendar_events` (`isDeleted`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_eventType` ON `calendar_events` (`eventType`)"
                )
            }
        }

        /**
         * Migration from version 4 to 5:
         * Migrates calendar_events from single-day model (day) to multi-day model
         * (startDay, endDay, totalHours).
         *
         * No user data exists in any deployed environment, so we drop and recreate
         * the table with the new schema rather than performing data transformation.
         *
         * Schema changes:
         * - Renamed: day → startDay
         * - Added: endDay (TEXT NOT NULL)
         * - Added: totalHours (INTEGER NOT NULL)
         * - Updated indices for new column names
         */
        val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Drop old table — no user data exists in deployed environments
                db.execSQL("DROP TABLE IF EXISTS `calendar_events`")

                // Create new table with multi-day schema
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `calendar_events` (
                        `id` TEXT NOT NULL,
                        `eventType` TEXT NOT NULL,
                        `eventTypeId` TEXT NOT NULL,
                        `startDay` TEXT NOT NULL,
                        `endDay` TEXT NOT NULL,
                        `startTime` INTEGER NOT NULL,
                        `endTime` INTEGER NOT NULL,
                        `totalHours` INTEGER NOT NULL,
                        `notes` TEXT,
                        `modifiedAt` INTEGER NOT NULL,
                        `syncedAt` INTEGER,
                        `isDeleted` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )

                // Create indexes for new schema
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_startDay_eventType_isDeleted` ON `calendar_events` (`startDay`, `eventType`, `isDeleted`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_startDay` ON `calendar_events` (`startDay`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_endDay` ON `calendar_events` (`endDay`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_isDeleted` ON `calendar_events` (`isDeleted`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_calendar_events_eventType` ON `calendar_events` (`eventType`)"
                )
            }
        }
    }
}
