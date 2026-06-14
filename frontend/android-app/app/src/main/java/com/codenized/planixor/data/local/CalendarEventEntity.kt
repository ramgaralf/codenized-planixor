package com.codenized.planixor.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing a calendar event stored locally.
 * All fields follow the offline-first sync strategy with change tracking.
 */
@Entity(tableName = "calendar_events")
data class CalendarEventEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val description: String?,
    val startAt: Long,
    val endAt: Long,
    val isAllDay: Boolean,
    val eventType: String,
    val color: String?,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
