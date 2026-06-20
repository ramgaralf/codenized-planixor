package com.codenized.planixor.data.notification

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/**
 * WorkManager periodic worker that runs notification check cycles in the background.
 * Registered with a 15-minute repeat interval (minimum for WorkManager).
 * Calls [NotificationService.runCheckCycle] to detect and deliver due notifications.
 */
@HiltWorker
class NotificationCheckWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val notificationService: NotificationService,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            notificationService.runCheckCycle()
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "notification_check_worker"
    }
}
