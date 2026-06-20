package com.codenized.planixor.data.notification

import com.codenized.planixor.data.local.CalendarEventEntity

/**
 * Core notification logic: check for due notifications, deliver them,
 * reconcile notifications when calendar events change, and provide unread counts.
 */
interface NotificationService {

    /**
     * Executes a check cycle: queries the local store for due notifications
     * (triggerTime <= now, not delivered, not deleted), delivers them via the
     * configured channel, and marks them as delivered.
     */
    suspend fun runCheckCycle()

    /**
     * Reconciles notification records when a calendar event's alertOffsets or start time changes.
     * Soft-deletes existing non-delivered records for the event and creates new records
     * for each alertOffset whose computed trigger time is strictly in the future.
     */
    suspend fun reconcileNotifications(event: CalendarEventEntity)

    /**
     * Cascade soft-deletes all non-deleted notification records for a given calendar event.
     * Used when a calendar event is soft-deleted.
     */
    suspend fun deleteNotificationsForEvent(calendarEventId: String)

    /**
     * Returns the current count of unread delivered notifications
     * (isRead=false, isDelivered=true, isDeleted=false).
     */
    suspend fun getUnreadCount(): Int
}
