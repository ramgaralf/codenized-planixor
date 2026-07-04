package com.codenized.planixor.ui.settings

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.PlanixorDatabase
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ShiftModeSettingRepository
import com.codenized.planixor.data.notification.NotificationChannel
import com.codenized.planixor.data.notification.NotificationPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel responsible for managing locale and notification channel preferences.
 * Reads the persisted locale on init and exposes it as a StateFlow.
 * Falls back to "es" (Spanish) if the stored value is missing or invalid.
 * Applies the locale change via AppCompatDelegate for immediate effect.
 * Manages notification channel selection with permission-aware behavior.
 */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
    private val notificationPreferences: NotificationPreferences,
    private val database: PlanixorDatabase,
    private val shiftModeSettingRepository: ShiftModeSettingRepository,
) : ViewModel() {

    private val _locale = MutableStateFlow("es")
    val locale: StateFlow<String> = _locale.asStateFlow()

    val notificationChannel: StateFlow<NotificationChannel> = notificationPreferences.channelFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), NotificationChannel.APP)

    private val _showPermissionWarning = MutableStateFlow(false)
    val showPermissionWarning: StateFlow<Boolean> = _showPermissionWarning.asStateFlow()

    private val _pendingChannelSelection = MutableStateFlow<NotificationChannel?>(null)
    val pendingChannelSelection: StateFlow<NotificationChannel?> = _pendingChannelSelection.asStateFlow()

    val shiftModeEnabled: StateFlow<Boolean> = shiftModeSettingRepository.observeEnabled()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    init {
        loadPersistedLocale()
    }

    fun setLocale(value: String) {
        _locale.value = value
        applyLocale(value)
        viewModelScope.launch {
            preferencesRepository.setLocale(value)
        }
    }

    fun toggleShiftMode() {
        viewModelScope.launch {
            shiftModeSettingRepository.toggle()
        }
    }

    /**
     * Called when the user selects a notification channel option.
     * For "App" — persists directly without permission check.
     * For "System"/"Both" — sets pending selection, triggering permission check in UI.
     */
    fun onNotificationChannelSelected(
        channel: NotificationChannel,
        hasNotificationPermission: Boolean,
    ) {
        _showPermissionWarning.value = false

        when (channel) {
            NotificationChannel.APP -> {
                _pendingChannelSelection.value = null
                viewModelScope.launch {
                    notificationPreferences.setChannel(channel)
                }
            }
            NotificationChannel.SYSTEM, NotificationChannel.BOTH -> {
                if (hasNotificationPermission) {
                    _pendingChannelSelection.value = null
                    viewModelScope.launch {
                        notificationPreferences.setChannel(channel)
                    }
                } else {
                    _pendingChannelSelection.value = channel
                }
            }
        }
    }

    /**
     * Called after the POST_NOTIFICATIONS permission result is received.
     * If granted, persists the pending channel selection.
     * If denied, reverts to "App" and shows the inline warning.
     */
    fun onPermissionResult(granted: Boolean) {
        val pending = _pendingChannelSelection.value
        _pendingChannelSelection.value = null

        if (granted && pending != null) {
            _showPermissionWarning.value = false
            viewModelScope.launch {
                notificationPreferences.setChannel(pending)
            }
        } else {
            _showPermissionWarning.value = true
            viewModelScope.launch {
                notificationPreferences.setChannel(NotificationChannel.APP)
            }
        }
    }

    /**
     * Called when the system notification permission state is checked on screen resume.
     * Updates the warning visibility if permission was revoked externally.
     */
    fun updatePermissionWarning(hasPermission: Boolean) {
        val currentChannel = notificationChannel.value
        if (!hasPermission && currentChannel != NotificationChannel.APP) {
            _showPermissionWarning.value = true
        } else if (hasPermission) {
            _showPermissionWarning.value = false
        }
    }

    private fun loadPersistedLocale() {
        viewModelScope.launch {
            val stored = preferencesRepository.localeFlow.first()
            val validLocale = stored.toValidLocale()
            _locale.value = validLocale
            applyLocale(validLocale)
        }
    }

    private fun applyLocale(locale: String) {
        val localeList = LocaleListCompat.forLanguageTags(locale)
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    /**
     * Resets all application data by clearing the Room database and DataStore preferences.
     * Uses Dispatchers.IO and restarts the process to avoid state corruption from active observers.
     */
    fun resetApplication() {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                database.clearAllTables()
                preferencesRepository.clearAll()
            } catch (_: Exception) {
                // Best effort — proceed to kill process regardless
            }
            // Kill and restart the process to clear all in-memory state
            android.os.Process.killProcess(android.os.Process.myPid())
        }
    }

    companion object {
        private val VALID_LOCALES = setOf("es", "en")

        private fun String?.toValidLocale(): String = when {
            this == null -> "es"
            this !in VALID_LOCALES -> "es"
            else -> this
        }
    }
}
