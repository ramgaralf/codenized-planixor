package com.codenized.planixor

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.lifecycle.ProcessLifecycleOwner
import com.codenized.planixor.data.notification.NotificationTimerService
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

/**
 * Application class annotated with Hilt for dependency injection setup.
 * Registers lifecycle observers for background notification processing
 * and creates the notification channel for system alerts.
 */
@HiltAndroidApp
class PlanixorApplication : Application() {

    @Inject
    lateinit var notificationTimerService: NotificationTimerService

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        ProcessLifecycleOwner.get().lifecycle.addObserver(notificationTimerService)
    }

    /**
     * Creates the "planixor_alerts" notification channel with IMPORTANCE_HIGH.
     * Channels are idempotent — safe to call every time the app starts.
     */
    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        )
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "planixor_alerts"
    }
}
