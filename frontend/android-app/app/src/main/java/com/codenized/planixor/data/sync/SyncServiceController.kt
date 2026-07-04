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
import retrofit2.HttpException
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Classification of errors encountered during sync operations.
 */
enum class SyncErrorClassification {
    /** Network-level failures: timeout, refused, DNS, generic IOException, HTTP 5xx */
    CONNECTIVITY,
    /** Authentication failures: HTTP 401 or 403 */
    AUTH,
    /** Client errors: HTTP 4xx (other than 401/403) */
    CLIENT_ERROR,
    /** No error */
    NONE,
}

/**
 * Bridges sync configuration state (pause/resume) to the background sync infrastructure.
 * Monitors config changes from PreferencesRepository and controls sync scheduling.
 *
 * When paused: cancels the periodic sync coroutine.
 * When resumed with valid config: starts a coroutine-based periodic sync at the configured interval.
 * When the sync interval changes in config: restarts the schedule with the new interval.
 */
@Singleton
class SyncServiceController @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
    private val calendarEventSyncAdapter: CalendarEventSyncAdapter,
    private val notificationRecordSyncAdapter: NotificationRecordSyncAdapter,
    private val annualHoursConfigSyncAdapter: AnnualHoursConfigSyncAdapter,
    private val shiftSyncAdapter: ShiftSyncAdapter,
    private val reminderSyncAdapter: ReminderSyncAdapter,
    private val shiftModeSettingSyncAdapter: ShiftModeSettingSyncAdapter,
    private val dynamicBaseUrlInterceptor: DynamicBaseUrlInterceptor,
    private val notificationPurgeService: NotificationPurgeService,
) {
    private var observerJob: Job? = null
    private var syncJob: Job? = null
    private var scope: CoroutineScope? = null
    private var currentIntervalMinutes: Int = DEFAULT_SYNC_INTERVAL_MINUTES

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
                    dynamicBaseUrlInterceptor.apiBasePath = null
                    cancelSyncSchedule()
                } else {
                    dynamicBaseUrlInterceptor.serverUrl = config.serverUrl
                    dynamicBaseUrlInterceptor.apiKey = config.apiKey
                    dynamicBaseUrlInterceptor.apiBasePath = config.apiBasePath

                    // If the sync interval has changed while a job is active, restart the schedule
                    if (syncJob?.isActive == true && config.syncIntervalMinutes != currentIntervalMinutes) {
                        Log.d(TAG, "Sync interval changed from ${currentIntervalMinutes}m to ${config.syncIntervalMinutes}m, restarting schedule")
                        cancelSyncSchedule()
                    }
                    currentIntervalMinutes = config.syncIntervalMinutes
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
     * Classifies an exception into an error category for connectivity monitoring.
     *
     * - SocketTimeoutException, ConnectException, UnknownHostException, generic IOException → CONNECTIVITY
     * - HttpException with 5xx → CONNECTIVITY
     * - HttpException with 401 or 403 → AUTH
     * - HttpException with other 4xx → CLIENT_ERROR
     * - Other exceptions → CONNECTIVITY (defensive: treat unknown errors as connectivity issues)
     */
    fun classifyException(exception: Exception): SyncErrorClassification {
        return when (exception) {
            is SocketTimeoutException -> SyncErrorClassification.CONNECTIVITY
            is ConnectException -> SyncErrorClassification.CONNECTIVITY
            is UnknownHostException -> SyncErrorClassification.CONNECTIVITY
            is HttpException -> classifyHttpException(exception)
            is IOException -> SyncErrorClassification.CONNECTIVITY
            else -> SyncErrorClassification.CONNECTIVITY
        }
    }

    /**
     * Classifies an HTTP error response based on its status code.
     */
    private fun classifyHttpException(exception: HttpException): SyncErrorClassification {
        val code = exception.code()
        return when {
            code in 500..599 -> SyncErrorClassification.CONNECTIVITY
            code == 401 || code == 403 -> SyncErrorClassification.AUTH
            code in 400..499 -> SyncErrorClassification.CLIENT_ERROR
            else -> SyncErrorClassification.CONNECTIVITY
        }
    }

    /**
     * Classifies a SyncResult error string to determine the type of failure.
     * This handles cases where the sync adapter catches exceptions internally
     * and reports them via the error string (e.g., "Push failed with HTTP 500").
     */
    fun classifySyncResultError(error: String?): SyncErrorClassification {
        if (error == null) return SyncErrorClassification.NONE

        val httpCodeRegex = Regex("""HTTP (\d{3})""")
        val match = httpCodeRegex.find(error)
        if (match != null) {
            val code = match.groupValues[1].toIntOrNull()
                ?: return SyncErrorClassification.CONNECTIVITY
            return when {
                code in 500..599 -> SyncErrorClassification.CONNECTIVITY
                code == 401 || code == 403 -> SyncErrorClassification.AUTH
                code in 400..499 -> SyncErrorClassification.CLIENT_ERROR
                else -> SyncErrorClassification.CONNECTIVITY
            }
        }

        // If no HTTP code found in the error string, treat as connectivity failure
        return SyncErrorClassification.CONNECTIVITY
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
     * and then every N minutes (from config), re-reading config on each tick.
     * Does not restart if a sync job is already running.
     */
    private fun scheduleSyncWorker(config: SyncConfig) {
        if (syncJob?.isActive == true) return

        val intervalMs = config.syncIntervalMinutes * 60 * 1000L

        syncJob = scope?.launch {
            performSyncCycle(config)
            while (isActive) {
                delay(intervalMs)
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
     *
     * Error classification:
     * - Connectivity failures (timeout, refused, DNS, IOException, HTTP 5xx) → set ConnectionStatus.FAILING
     * - Auth errors (HTTP 401/403) → no status change
     * - Client errors (other HTTP 4xx) → no status change
     *
     * Updates lastSyncedAt only when at least one entity sync succeeds (Property 5).
     */
    private suspend fun performSyncCycle(config: SyncConfig) {
        // Use epoch 0 (1970-01-01) when lastSyncedAt is null (first sync) to ensure all records are pulled
        val lastSyncedAt = config.lastSyncedAt ?: 0L

        // Set the dynamic URL, API key, and base path for this cycle
        dynamicBaseUrlInterceptor.serverUrl = config.serverUrl
        dynamicBaseUrlInterceptor.apiKey = config.apiKey
        dynamicBaseUrlInterceptor.apiBasePath = config.apiBasePath

        var hasConnectivityError = false
        var hasAnySuccess = false

        val result1 = syncEntity("Calendar event", hasConnectivityError) {
            calendarEventSyncAdapter.sync(lastSyncedAt)
        }
        hasConnectivityError = result1.first
        if (result1.second) hasAnySuccess = true

        val result2 = syncEntity("Notification record", hasConnectivityError) {
            notificationRecordSyncAdapter.sync(lastSyncedAt)
        }
        hasConnectivityError = result2.first
        if (result2.second) hasAnySuccess = true

        val result3 = syncEntity("Annual hours config", hasConnectivityError) {
            annualHoursConfigSyncAdapter.sync(lastSyncedAt)
        }
        hasConnectivityError = result3.first
        if (result3.second) hasAnySuccess = true

        val result4 = syncEntity("Shift", hasConnectivityError) {
            shiftSyncAdapter.sync(lastSyncedAt)
        }
        hasConnectivityError = result4.first
        if (result4.second) hasAnySuccess = true

        val result5 = syncEntity("Reminder", hasConnectivityError) {
            reminderSyncAdapter.sync(lastSyncedAt)
        }
        hasConnectivityError = result5.first
        if (result5.second) hasAnySuccess = true

        val result6 = syncEntity("Shift mode setting", hasConnectivityError) {
            shiftModeSettingSyncAdapter.sync(lastSyncedAt)
        }
        hasConnectivityError = result6.first
        if (result6.second) hasAnySuccess = true

        // Purge past/orphaned notification records after all entity syncs complete.
        // Fire and forget — errors do not affect sync status.
        try {
            notificationPurgeService.purgePastNotifications()
        } catch (e: Exception) {
            Log.e(TAG, "Post-cycle notification purge failed", e)
        }

        // Set ConnectionStatus based on error classification
        if (hasConnectivityError) {
            try {
                preferencesRepository.saveConnectionStatus(ConnectionStatus.FAILING)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to persist FAILING connection status", e)
            }
        } else if (hasAnySuccess) {
            // Recover from FAILING state when a full cycle succeeds
            try {
                preferencesRepository.saveConnectionStatus(ConnectionStatus.ACTIVE)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to persist ACTIVE connection status", e)
            }
        }

        // Only update lastSyncedAt when at least one entity sync succeeded (Property 5)
        if (hasAnySuccess) {
            try {
                preferencesRepository.setSyncLastSyncedAt(System.currentTimeMillis())
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update lastSyncedAt", e)
            }
        }
    }

    /**
     * Executes a single entity sync and classifies any errors.
     * Returns a Pair of (updated hasConnectivityError flag, entitySucceeded boolean).
     */
    private suspend fun syncEntity(
        entityName: String,
        currentHasConnectivityError: Boolean,
        syncAction: suspend () -> SyncResult,
    ): Pair<Boolean, Boolean> {
        var hasConnectivityError = currentHasConnectivityError
        var entitySucceeded = false

        try {
            val result = syncAction()
            if (!result.success) {
                val classification = classifySyncResultError(result.error)
                Log.e(TAG, "$entityName sync failed: ${result.error} (classified: $classification)")
                if (classification == SyncErrorClassification.CONNECTIVITY) {
                    hasConnectivityError = true
                }
            } else {
                entitySucceeded = true
            }
        } catch (e: Exception) {
            val classification = classifyException(e)
            Log.e(TAG, "$entityName sync failed (exception classified: $classification)", e)
            if (classification == SyncErrorClassification.CONNECTIVITY) {
                hasConnectivityError = true
            }
        }

        return Pair(hasConnectivityError, entitySucceeded)
    }

    companion object {
        private const val TAG = "SyncServiceController"
        /** Default sync interval in minutes, used as fallback when config is unavailable */
        private const val DEFAULT_SYNC_INTERVAL_MINUTES = 5
        @Suppress("unused")
        private const val SYNC_INTERVAL_MS = DEFAULT_SYNC_INTERVAL_MINUTES * 60 * 1000L
    }
}
