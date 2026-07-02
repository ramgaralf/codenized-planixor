package com.codenized.planixor.data.notification

import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.NotificationRecordEntity
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
import kotlinx.coroutines.flow.first
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of [NotificationService] that uses Room DAO for data access.
 * Reads the configured notification channel and routes delivery accordingly:
 * - APP: mark isDelivered=true (shown in NotificationsScreen)
 * - SYSTEM: deliver via native OS; mark isDelivered=true on success, retain false on failure
 * - BOTH: always mark isDelivered=true (for app visibility); attempt system delivery as best-effort
 */
@Singleton
class NotificationServiceImpl @Inject constructor(
    private val notificationRecordDao: NotificationRecordDao,
    private val notificationPreferences: NotificationPreferences,
    private val systemNotificationDelivery: SystemNotificationDelivery,
    private val calendarEventDao: CalendarEventDao,
    private val shiftDao: ShiftDao,
    private val reminderDao: ReminderDao,
    private val alarmScheduler: NotificationAlarmScheduler,
) : NotificationService {

    override suspend fun runCheckCycle() {
        val now = System.currentTimeMillis()
        val dueRecords = notificationRecordDao.getDueNotifications(now)

        if (dueRecords.isEmpty()) return

        val channel = notificationPreferences.channelFlow.first()

        for (record in dueRecords) {
            when (channel) {
                NotificationChannel.APP -> {
                    // App-only: mark as delivered (shown in NotificationsScreen)
                    notificationRecordDao.update(
                        record.copy(isDelivered = true, modifiedAt = System.currentTimeMillis()),
                    )
                }

                NotificationChannel.SYSTEM -> {
                    // System-only: attempt native OS notification
                    val eventName = resolveEventName(record.calendarEventId)
                    val eventIcon = resolveEventIcon(record.calendarEventId)
                    val event = calendarEventDao.getById(record.calendarEventId)
                    val notificationId = record.id.hashCode()
                    val startDay = event?.startDay ?: ""
                    val startTime = event?.startTime ?: 0
                    val success = systemNotificationDelivery.deliver(
                        notificationId,
                        eventIcon,
                        eventName,
                        startDay,
                        startTime,
                        record.alertOffset,
                    )

                    if (success) {
                        notificationRecordDao.update(
                            record.copy(isDelivered = true, modifiedAt = System.currentTimeMillis()),
                        )
                    }
                    // If failed: leave isDelivered=false, retry next cycle
                }

                NotificationChannel.BOTH -> {
                    // Both: always mark as delivered (for app notification visibility)
                    // and attempt system delivery as best-effort
                    val eventName = resolveEventName(record.calendarEventId)
                    val eventIcon = resolveEventIcon(record.calendarEventId)
                    val event = calendarEventDao.getById(record.calendarEventId)
                    val notificationId = record.id.hashCode()
                    val startDay = event?.startDay ?: ""
                    val startTime = event?.startTime ?: 0

                    // Attempt system notification (best-effort — don't block app delivery)
                    systemNotificationDelivery.deliver(
                        notificationId,
                        eventIcon,
                        eventName,
                        startDay,
                        startTime,
                        record.alertOffset,
                    )

                    // Always mark as delivered so it appears in the app's notification view
                    notificationRecordDao.update(
                        record.copy(isDelivered = true, modifiedAt = System.currentTimeMillis()),
                    )
                }
            }
        }
    }

    override suspend fun reconcileNotifications(event: CalendarEventEntity) {
        val now = System.currentTimeMillis()

        // Soft-delete existing non-delivered records for this event
        val existingRecords = notificationRecordDao.getByCalendarEventId(event.id)
        val recordsToSoftDelete = existingRecords.filter { !it.isDelivered }

        if (recordsToSoftDelete.isNotEmpty()) {
            for (record in recordsToSoftDelete) {
                alarmScheduler.cancel(record.id)
            }
            val softDeleted = recordsToSoftDelete.map { record ->
                record.copy(
                    isDeleted = true,
                    modifiedAt = now,
                )
            }
            notificationRecordDao.updateAll(softDeleted)
        }

        // Parse alertOffsets from the event's JSON string
        val alertOffsets = parseAlertOffsets(event.alertOffsets)

        if (alertOffsets.isEmpty()) return

        // Compute event start DateTime in UTC millis
        val eventStartMillis = computeEventStartMillis(event.startDay, event.startTime)

        // Create new records for each offset whose trigger time is in the future
        val newRecords = alertOffsets.mapNotNull { offset ->
            val triggerTime = eventStartMillis - (offset.toLong() * 60_000L)
            if (triggerTime > now) {
                NotificationRecordEntity(
                    id = UUID.randomUUID().toString(),
                    calendarEventId = event.id,
                    alertOffset = offset,
                    triggerTime = triggerTime,
                    isDelivered = false,
                    isRead = false,
                    modifiedAt = now,
                    syncedAt = null,
                    isDeleted = false,
                )
            } else {
                null
            }
        }

        if (newRecords.isNotEmpty()) {
            notificationRecordDao.insertAll(newRecords)
            for (record in newRecords) {
                alarmScheduler.schedule(record.id, record.triggerTime)
            }
        }
    }

    override suspend fun deleteNotificationsForEvent(calendarEventId: String) {
        val now = System.currentTimeMillis()
        val records = notificationRecordDao.getAllByCalendarEventId(calendarEventId)

        if (records.isEmpty()) return

        for (record in records) {
            alarmScheduler.cancel(record.id)
        }

        val softDeleted = records.map { record ->
            record.copy(
                isDeleted = true,
                modifiedAt = now,
            )
        }
        notificationRecordDao.updateAll(softDeleted)
    }

    override suspend fun getUnreadCount(): Int {
        return notificationRecordDao.getUnreadCount().first()
    }

    /**
     * Resolves the display name for a notification record by joining
     * CalendarEvent → Shift/Reminder.
     * Returns the shift/reminder name, or a fallback if entities cannot be found.
     */
    private suspend fun resolveEventName(calendarEventId: String): String {
        val event = calendarEventDao.getById(calendarEventId) ?: return FALLBACK_EVENT_NAME

        return when (event.eventType) {
            "shift" -> shiftDao.getById(event.eventTypeId)?.name ?: FALLBACK_EVENT_NAME
            "reminder" -> reminderDao.getById(event.eventTypeId)?.name ?: FALLBACK_EVENT_NAME
            else -> FALLBACK_EVENT_NAME
        }
    }

    /**
     * Resolves the emoji icon for a notification record by joining
     * CalendarEvent → Shift/Reminder.
     * Returns the shift/reminder icon, or a fallback calendar emoji if entities cannot be found.
     */
    private suspend fun resolveEventIcon(calendarEventId: String): String {
        val event = calendarEventDao.getById(calendarEventId) ?: return FALLBACK_EVENT_ICON

        return when (event.eventType) {
            "shift" -> shiftDao.getById(event.eventTypeId)?.icon ?: FALLBACK_EVENT_ICON
            "reminder" -> reminderDao.getById(event.eventTypeId)?.icon ?: FALLBACK_EVENT_ICON
            else -> FALLBACK_EVENT_ICON
        }
    }

    /**
     * Parses the alertOffsets JSON string (e.g., "[0,10,60,1440]") into a list of integers.
     * Returns an empty list for null, empty, or malformed input.
     */
    private fun parseAlertOffsets(json: String): List<Int> {
        val trimmed = json.trim()
        if (trimmed.isEmpty() || trimmed == "[]") return emptyList()

        return try {
            trimmed
                .removePrefix("[")
                .removeSuffix("]")
                .split(",")
                .map { it.trim().toInt() }
                .filter { it in VALID_OFFSETS }
        } catch (e: NumberFormatException) {
            emptyList()
        }
    }

    /**
     * Computes the event start DateTime as epoch millis using local timezone.
     * Formula: parse startDay as ISO date at 00:00 in system default timezone, then add startTime minutes.
     */
    private fun computeEventStartMillis(startDay: String, startTimeMinutes: Int): Long {
        val date = LocalDate.parse(startDay)
        val startOfDayLocal = date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        return startOfDayLocal + (startTimeMinutes.toLong() * 60_000L)
    }

    companion object {
        private val VALID_OFFSETS = setOf(0, 10, 60, 1440)
        private const val FALLBACK_EVENT_NAME = "Planixor"
        private const val FALLBACK_EVENT_ICON = "📅"
    }
}
