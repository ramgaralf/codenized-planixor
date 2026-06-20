package com.codenized.planixor.data.notification

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Lifecycle-aware foreground timer that runs notification check cycles every 1 minute
 * while the app is in the foreground. Observes [ProcessLifecycleOwner] to start/stop
 * the timer coroutine on app foreground/background transitions.
 *
 * On a qualifying background→foreground transition (not the first launch or a config change),
 * an immediate check cycle runs within 5 seconds before resuming the regular 1-minute loop.
 */
@Singleton
class NotificationTimerService @Inject constructor(
    private val notificationService: NotificationService,
) : DefaultLifecycleObserver {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var timerJob: Job? = null
    private var hasBeenStopped = false

    override fun onStart(owner: LifecycleOwner) {
        timerJob = scope.launch {
            try {
                if (hasBeenStopped) {
                    delay(IMMEDIATE_CHECK_DELAY_MS)
                }
                notificationService.runCheckCycle()
            } catch (e: Exception) {
                e.printStackTrace()
            }
            startPeriodicLoop()
        }
    }

    override fun onStop(owner: LifecycleOwner) {
        timerJob?.cancel()
        timerJob = null
        hasBeenStopped = true
    }

    private suspend fun startPeriodicLoop() {
        while (true) {
            delay(CHECK_INTERVAL_MS)
            try {
                notificationService.runCheckCycle()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    companion object {
        private const val CHECK_INTERVAL_MS = 60_000L // 1 minute
        private const val IMMEDIATE_CHECK_DELAY_MS = 5_000L // 5 seconds
    }
}
