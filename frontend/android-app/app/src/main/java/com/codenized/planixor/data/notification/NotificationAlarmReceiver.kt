package com.codenized.planixor.data.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * BroadcastReceiver triggered by AlarmManager when a notification is due.
 * Delivers the notification immediately via NotificationService.
 */
@AndroidEntryPoint
class NotificationAlarmReceiver : BroadcastReceiver() {

    @Inject
    lateinit var notificationService: NotificationService

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != NotificationAlarmScheduler.ACTION_DELIVER_NOTIFICATION) return

        val pendingResult = goAsync()

        scope.launch {
            try {
                notificationService.runCheckCycle()
            } finally {
                pendingResult.finish()
            }
        }
    }
}
