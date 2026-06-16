package com.codenized.planixor.data.local

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
 * - day: ISO date string "YYYY-MM-DD"
 * - startTime: Minutes from midnight (0-1439)
 * - endTime: Minutes from midnight (0-1439), must be > startTime
 * - notes: Optional, max 200 characters
 * - modifiedAt: UTC timestamp millis, updated on every local write
 * - syncedAt: UTC timestamp millis of last successful sync, null = never synced
 * - isDeleted: Soft-delete flag, defaults to false
 */
@Entity(
    tableName = "calendar_events",
    indices = [
        Index(value = ["day", "eventType", "isDeleted"]),
        Index(value = ["day"]),
        Index(value = ["isDeleted"]),
        Index(value = ["eventType"]),
    ],
)
data class CalendarEventEntity(
    @PrimaryKey
    val id: String,
    val eventType: String,
    val eventTypeId: String,
    val day: String,
    val startTime: Int,
    val endTime: Int,
    val notes: String?,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
