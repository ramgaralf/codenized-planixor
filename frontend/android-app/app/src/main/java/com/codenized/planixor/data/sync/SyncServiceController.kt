package com.codenized.planixor.data.sync

import android.util.Log
import com.codenized.planixor.data.local.PreferencesRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Bridges sync configuration state (pause/resume) to the background sync infrastructure.
 * Monitors config changes from PreferencesRepository and controls sync scheduling.
 *
 * When paused: cancels the periodic sync coroutine.
 * When resumed with valid config: starts a coroutine-based periodic sync every 5 minutes.
 */
@Singleton
class SyncServiceController @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
    private val calendarEventSyncAdapter: CalendarEventSyncAdapter,
    private val notificationRecordSyncAdapter: NotificationRecordSyncAdapter,
    private val annualHoursConfigSyncAdapter: AnnualHoursConfigSyncAdapter,
    private val shiftSyncAdapter: ShiftSyncAdapter,
    private val reminderSyncAdapter: ReminderSyncAdapter,
    private val dynamicBaseUrlInterceptor: DynamicBaseUrlInterceptor,
) {
    private var observerJob: Job? = null
    private var syncJob: Job? = null
    private var scope: CoroutineScope? = null

    /**
     * Starts observing sync config changes.
     * Call this from Application.onCreate() or after DI is ready.
     */
    fun start(scope: CoroutineScope) {
        if (observerJob != null) return
        this.scope = scope

        observerJob = preferencesRepository.syncConfigFlow
            .onEach { config ->
                if (config == null || config.isPaused) {
                    dynamicBaseUrlInterceptor.serverUrl = null
                    dynamicBaseUrlInterceptor.apiKey = null
                    cancelSyncSchedule()
                } else {
                    dynamicBaseUrlInterceptor.serverUrl = config.serverUrl
                    dynamicBaseUrlInterceptor.apiKey = config.apiKey
                    scheduleSyncWorker(config)
                }
            }
            .launchIn(scope)
    }

    /**
     * Stops observing and cancels any sync scheduling.
     */
    fun stop() {
        observerJob?.cancel()
        observerJob = null
        cancelSyncSchedule()
    }

    /**
     * Returns whether sync operations are currently permitted based on the given config.
     */
    fun isSyncAllowed(config: SyncConfig?): Boolean {
        return config != null && !config.isPaused
    }

    /**
     * Cancels the periodic sync coroutine job.
     */
    private fun cancelSyncSchedule() {
        syncJob?.cancel()
        syncJob = null
    }

    /**
     * Starts a coroutine-based periodic sync that runs immediately
     * and then every 5 minutes, re-reading config on each tick.
     * Does not restart if a sync job is already running.
     */
    private fun scheduleSyncWorker(config: SyncConfig) {
        if (syncJob?.isActive == true) return

        syncJob = scope?.launch {
            performSyncCycle(config)
            while (isActive) {
                delay(SYNC_INTERVAL_MS)
                val currentConfig = preferencesRepository.syncConfigFlow.first()
                if (currentConfig != null && !currentConfig.isPaused) {
                    performSyncCycle(currentConfig)
                }
            }
        }
    }

    /**
     * Executes a full sync cycle by calling each adapter in sequence.
     * Each entity syncs independently — a failure in one does not block the others.
     * Always updates the lastSyncedAt timestamp at the end, even on partial failure.
     */
    private suspend fun performSyncCycle(config: SyncConfig) {
        // Use epoch 0 (1970-01-01) when lastSyncedAt is null (first sync) to ensure all records are pulled
        val lastSyncedAt = config.lastSyncedAt ?: 0L

        // Set the dynamic URL and API key for this cycle
        dynamicBaseUrlInterceptor.serverUrl = config.serverUrl
        dynamicBaseUrlInterceptor.apiKey = config.apiKey

        try {
            calendarEventSyncAdapter.sync(lastSyncedAt)
        } catch (e: Exception) {
            Log.e(TAG, "Calendar event sync failed", e)
        }

        try {
            notificationRecordSyncAdapter.sync(lastSyncedAt)
        } catch (e: Exception) {
            Log.e(TAG, "Notification record sync failed", e)
        }

        try {
            annualHoursConfigSyncAdapter.sync(lastSyncedAt)
        } catch (e: Exception) {
            Log.e(TAG, "Annual hours config sync failed", e)
        }

        try {
            shiftSyncAdapter.sync(lastSyncedAt)
        } catch (e: Exception) {
            Log.e(TAG, "Shift sync failed", e)
        }

        try {
            reminderSyncAdapter.sync(lastSyncedAt)
        } catch (e: Exception) {
            Log.e(TAG, "Reminder sync failed", e)
        }

        try {
            preferencesRepository.setSyncLastSyncedAt(System.currentTimeMillis())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update lastSyncedAt", e)
        }
    }

    companion object {
        private const val TAG = "SyncServiceController"
        private const val SYNC_INTERVAL_MS = 5 * 60 * 1000L
    }
}
