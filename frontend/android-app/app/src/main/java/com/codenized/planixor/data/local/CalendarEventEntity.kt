package com.codenized.planixor.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room entity representing a calendar event stored locally.
 * All fields follow the offline-first sync strategy with change tracking.
 *
 * Fields:
 * - id: Client-generated UUID, primary key
 * - eventType: "shift" or "reminder"
 * - eventTypeId: UUID referencing a Shift or Reminder record
 * - startDay: ISO date string "YYYY-MM-DD" — start calendar date of the event
 * - endDay: ISO date string "YYYY-MM-DD" — end calendar date (>= startDay)
 * - startTime: Minutes from midnight (0-1439)
 * - endTime: Minutes from midnight (0-1439)
 * - totalHours: Total duration in minutes (computed; shifts use hoursWorked, reminders use day/time diff)
 * - notes: Optional, max 250 characters
 * - modifiedAt: UTC timestamp millis, updated on every local write
 * - syncedAt: UTC timestamp millis of last successful sync, null = never synced
 * - isDeleted: Soft-delete flag, defaults to false
 */
@Entity(
    tableName = "calendar_events",
    indices = [
        Index(value = ["startDay", "eventType", "isDeleted"]),
        Index(value = ["startDay"]),
        Index(value = ["endDay"]),
        Index(value = ["isDeleted"]),
        Index(value = ["eventType"]),
    ],
)
data class CalendarEventEntity(
    @PrimaryKey
    val id: String,
    val eventType: String,
    val eventTypeId: String,
    val startDay: String,
    val endDay: String,
    val startTime: Int,
    val endTime: Int,
    val totalHours: Int,
    val notes: String?,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
    @ColumnInfo(defaultValue = "[]")
    val alertOffsets: String = "[]",
    @ColumnInfo(defaultValue = "")
    val seriesId: String = "",
)
