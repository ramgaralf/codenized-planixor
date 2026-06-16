package com.codenized.planixor.domain.model

/**
 * Display model for a calendar event with derived fields from referenced shift/reminder.
 * These fields are resolved at read time, not persisted.
 */
data class CalendarEventDisplay(
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
    val name: String,
    val icon: String,
    val backgroundColor: String,
) {
    companion object {
        const val UNKNOWN_NAME = "Unknown"
        const val UNKNOWN_ICON = "❓"
        const val UNKNOWN_BACKGROUND_COLOR = "transparent"

        /**
         * Creates a [CalendarEventDisplay] from a [CalendarEvent] and optional display fields.
         * Uses orphaned reference fallback values when the referenced entity is not found.
         */
        fun fromEvent(
            event: CalendarEvent,
            name: String?,
            icon: String?,
            backgroundColor: String?,
        ): CalendarEventDisplay {
            return CalendarEventDisplay(
                id = event.id,
                eventType = event.eventType,
                eventTypeId = event.eventTypeId,
                day = event.day,
                startTime = event.startTime,
                endTime = event.endTime,
                notes = event.notes,
                modifiedAt = event.modifiedAt,
                syncedAt = event.syncedAt,
                isDeleted = event.isDeleted,
                name = name ?: UNKNOWN_NAME,
                icon = icon ?: UNKNOWN_ICON,
                backgroundColor = backgroundColor ?: UNKNOWN_BACKGROUND_COLOR,
            )
        }
    }
}
