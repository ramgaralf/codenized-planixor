package com.codenized.planixor.data.notification

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Schedules exact alarms for notification delivery using AlarmManager.
 * Uses setExactAndAllowWhileIdle for precise timing even in Doze mode.
 */
@Singleton
class NotificationAlarmScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val alarmManager = context.getSystemService(AlarmManager::class.java)

    /**
     * Schedules an exact alarm for a notification record.
     * The alarm will fire a BroadcastReceiver that delivers the notification.
     */
    fun schedule(recordId: String, triggerTimeMillis: Long) {
        val intent = Intent(context, NotificationAlarmReceiver::class.java).apply {
            action = ACTION_DELIVER_NOTIFICATION
            putExtra(EXTRA_RECORD_ID, recordId)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            recordId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerTimeMillis,
            pendingIntent,
        )
    }

    /**
     * Cancels a previously scheduled alarm for a notification record.
     */
    fun cancel(recordId: String) {
        val intent = Intent(context, NotificationAlarmReceiver::class.java).apply {
            action = ACTION_DELIVER_NOTIFICATION
            putExtra(EXTRA_RECORD_ID, recordId)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            recordId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        alarmManager.cancel(pendingIntent)
    }

    companion object {
        const val ACTION_DELIVER_NOTIFICATION = "com.codenized.planixor.DELIVER_NOTIFICATION"
        const val EXTRA_RECORD_ID = "record_id"
    }
}
