package com.codenized.planixor.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room entity representing a notification record stored locally.
 * Tracks delivery state and lifecycle for calendar event alerts.
 *
 * Fields:
 * - id: Client-generated UUID, primary key
 * - calendarEventId: UUID referencing a CalendarEvent record
 * - alertOffset: Minutes before event start (0, 10, 60, or 1440)
 * - triggerTime: UTC millis when the notification should fire
 * - isDelivered: Whether notification has been delivered to the user
 * - isRead: Whether user has read/dismissed the notification
 * - modifiedAt: UTC timestamp millis, updated on every local write
 * - syncedAt: UTC timestamp millis of last successful sync, null = never synced
 * - isDeleted: Soft-delete flag, defaults to false
 */
@Entity(
    tableName = "notification_records",
    indices = [
        Index(value = ["calendarEventId", "alertOffset", "isDeleted"]),
        Index(value = ["triggerTime", "isDelivered", "isDeleted"]),
        Index(value = ["isDelivered", "isRead", "isDeleted"]),
        Index(value = ["isDeleted"]),
        Index(value = ["modifiedAt"]),
    ],
)
data class NotificationRecordEntity(
    @PrimaryKey
    val id: String,
    val calendarEventId: String,
    val alertOffset: Int,
    val triggerTime: Long,
    val isDelivered: Boolean,
    val isRead: Boolean,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
