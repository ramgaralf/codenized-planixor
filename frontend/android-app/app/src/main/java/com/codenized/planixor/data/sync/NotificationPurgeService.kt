package com.codenized.planixor.data.sync

import android.util.Log
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.NotificationRecordDao
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

/**
 * Service responsible for purging past and orphaned notification records from local storage.
 * Runs after each completed sync cycle to keep local data efficient.
 *
 * A notification record is eligible for purge if:
 * - Its associated CalendarEvent has a startDay strictly before today (past event)
 * - Its associated CalendarEvent does not exist in local storage (orphaned record)
 *
 * This service never throws — all errors are logged and 0 is returned on failure.
 */
class NotificationPurgeService @Inject constructor(
    private val notificationRecordDao: NotificationRecordDao,
    private val calendarEventDao: CalendarEventDao,
) {

    /**
     * Purges past and orphaned notification records from local storage.
     *
     * @return the number of records purged, or 0 if an error occurred.
     */
    suspend fun purgePastNotifications(): Int {
        return try {
            val allNotificationRecords = notificationRecordDao.getAll()
            if (allNotificationRecords.isEmpty()) return 0

            val allCalendarEvents = calendarEventDao.getAll()
            val eventStartDayMap = allCalendarEvents.associate { it.id to it.startDay }

            val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)

            val idsToPurge = allNotificationRecords.mapNotNull { record ->
                val startDay = eventStartDayMap[record.calendarEventId]
                when {
                    startDay == null -> record.id // orphaned
                    startDay < today -> record.id // past event
                    else -> null
                }
            }

            if (idsToPurge.isEmpty()) return 0

            notificationRecordDao.deleteByIds(idsToPurge)
            Log.d(TAG, "Purged ${idsToPurge.size} past/orphaned notification records")
            idsToPurge.size
        } catch (e: Exception) {
            Log.e(TAG, "Failed to purge past notifications", e)
            0
        }
    }

    companion object {
        private const val TAG = "NotificationPurge"
    }
}
