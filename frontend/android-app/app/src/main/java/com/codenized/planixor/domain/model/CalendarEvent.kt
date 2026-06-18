package com.codenized.planixor.domain.model

/**
 * Domain model representing a calendar event.
 * Events reference either a Shift or Reminder via eventTypeId.
 * Times are stored as minutes from midnight (0–1439).
 * Events span [startDay, endDay] where endDay >= startDay.
 * totalHours is computed: shifts use hoursWorked, reminders use day/time difference.
 */
data class CalendarEvent(
    val id: String,
    val eventType: String,
    val eventTypeId: String,
    val startDay: String,
    val endDay: String,
    val startTime: Int,
    val endTime: Int,
    val totalHours: Int,
    val notes: String? = null,
    val modifiedAt: Long,
    val syncedAt: Long? = null,
    val isDeleted: Boolean = false,
)
