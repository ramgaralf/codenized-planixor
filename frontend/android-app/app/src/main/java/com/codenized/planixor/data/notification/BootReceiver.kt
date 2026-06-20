package com.codenized.planixor.data.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.codenized.planixor.data.local.NotificationRecordDao
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Re-schedules notification alarms after device reboot.
 * AlarmManager alarms are cleared on reboot — this receiver restores them.
 */
@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject
    lateinit var notificationRecordDao: NotificationRecordDao

    @Inject
    lateinit var alarmScheduler: NotificationAlarmScheduler

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val pendingResult = goAsync()

        scope.launch {
            try {
                val pendingRecords = notificationRecordDao.getPendingRecords()
                for (record in pendingRecords) {
                    if (record.triggerTime > System.currentTimeMillis()) {
                        alarmScheduler.schedule(record.id, record.triggerTime)
                    }
                }
            } finally {
                pendingResult.finish()
            }
        }
    }
}
