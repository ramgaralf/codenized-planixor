package com.codenized.planixor.ui.notifications

/**
 * Represents a single notification item ready for display in the NotificationsScreen.
 * Display fields are derived via Room join with CalendarEvent + Shift/Reminder.
 */
data class NotificationItem(
    val id: String,
    val eventName: String,
    val eventIcon: String,
    val alertLabel: Int,
    val triggerTime: Long,
    val isEventDeleted: Boolean,
)

/**
 * Immutable UI state for the NotificationsScreen.
 */
data class NotificationsUiState(
    val notifications: List<NotificationItem> = emptyList(),
    val isLoading: Boolean = false,
)
