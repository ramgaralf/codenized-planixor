package com.codenized.planixor.data.notification

import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.codenized.planixor.PlanixorApplication.Companion.NOTIFICATION_CHANNEL_ID
import com.codenized.planixor.R
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles delivery of system notifications via [NotificationManagerCompat].
 * Checks whether notifications are enabled before posting.
 * Returns a Boolean indicating delivery success/failure for routing logic.
 */
@Singleton
class SystemNotificationDelivery @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    /**
     * Delivers a system notification for a due notification record.
     *
     * @param notificationId Unique integer ID for the notification (used for updates/cancellation).
     * @param eventIcon The emoji icon for the event (from shift or reminder).
     * @param eventName The calendar event name displayed in the notification title (truncated to 65 chars).
     * @param startDay ISO date string "YYYY-MM-DD" for the event start day.
     * @param startTime Minutes from midnight for the event start time.
     * @param alertOffset The alert offset in minutes before event start.
     * @return true if the notification was posted successfully, false if notifications are disabled.
     */
    fun deliver(
        notificationId: Int,
        eventIcon: String,
        eventName: String,
        startDay: String,
        startTime: Int,
        alertOffset: Int,
    ): Boolean {
        val notificationManager = NotificationManagerCompat.from(context)

        if (!notificationManager.areNotificationsEnabled()) {
            return false
        }

        val title = "$eventIcon ${eventName.take(MAX_EVENT_NAME_LENGTH)}"

        val dateTimeLine = formatDateTime(startDay, startTime)
        val remainingLine = formatTimeRemaining(alertOffset)
        val body = "$dateTimeLine\n$remainingLine"

        val notification = NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(dateTimeLine)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        try {
            notificationManager.notify(notificationId, notification)
        } catch (e: SecurityException) {
            return false
        }

        return true
    }

    /**
     * Formats the date and time line for the notification body.
     * Example: "20 jun 2025 · 10:00"
     */
    private fun formatDateTime(startDay: String, startTime: Int): String {
        val date = LocalDate.parse(startDay)
        val hours = startTime / 60
        val minutes = startTime % 60
        val timeStr = String.format(Locale.ROOT, "%02d:%02d", hours, minutes)
        val dateFormatter = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.getDefault())
        val dateStr = date.format(dateFormatter)
        return "$dateStr · $timeStr"
    }

    /**
     * Formats the time remaining line based on the alert offset.
     */
    private fun formatTimeRemaining(alertOffset: Int): String {
        return when {
            alertOffset == 0 -> context.getString(R.string.notification_remaining_now)
            alertOffset < 60 -> context.getString(R.string.notification_remaining_minutes, alertOffset)
            alertOffset == 60 -> context.getString(R.string.notification_remaining_1_hour)
            alertOffset == 1440 -> context.getString(R.string.notification_remaining_1_day)
            else -> context.getString(R.string.notification_remaining_minutes, alertOffset)
        }
    }

    companion object {
        private const val MAX_EVENT_NAME_LENGTH = 65
    }
}
