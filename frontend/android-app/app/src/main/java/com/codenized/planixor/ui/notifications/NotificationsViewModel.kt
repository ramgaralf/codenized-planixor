package com.codenized.planixor.ui.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.R
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.NotificationRecordEntity
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.notification.NotificationChannel
import com.codenized.planixor.data.notification.NotificationPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the NotificationsScreen.
 * Exposes unread notifications list, badge count, and channel preference.
 * Derives display fields by joining NotificationRecord with CalendarEvent + Shift/Reminder.
 */
@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationRecordDao: NotificationRecordDao,
    private val calendarEventDao: CalendarEventDao,
    private val shiftDao: ShiftDao,
    private val reminderDao: ReminderDao,
    private val notificationPreferences: NotificationPreferences,
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationsUiState(isLoading = true))
    val uiState: StateFlow<NotificationsUiState> = _uiState.asStateFlow()

    val badgeCount: StateFlow<Int> = notificationRecordDao.getUnreadCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    val channelFlow: StateFlow<NotificationChannel> = notificationPreferences.channelFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), NotificationChannel.BOTH)

    init {
        observeUnreadNotifications()
    }

    private fun observeUnreadNotifications() {
        viewModelScope.launch {
            notificationRecordDao.getUnreadDelivered().collect { records ->
                val items = records.map { record -> mapToNotificationItem(record) }
                _uiState.update { it.copy(notifications = items, isLoading = false) }
            }
        }
    }

    private suspend fun mapToNotificationItem(record: NotificationRecordEntity): NotificationItem {
        val event = calendarEventDao.getById(record.calendarEventId)
        val isEventDeleted = event == null || event.isDeleted

        val eventName: String
        val eventIcon: String

        if (event != null) {
            val typeEntity = when (event.eventType) {
                "shift" -> shiftDao.getById(event.eventTypeId)?.let { it.name to it.icon }
                "reminder" -> reminderDao.getById(event.eventTypeId)?.let { it.name to it.icon }
                else -> null
            }
            eventName = typeEntity?.first ?: "Unknown"
            eventIcon = typeEntity?.second ?: "\uD83D\uDD14"
        } else {
            eventName = "Unknown"
            eventIcon = "\uD83D\uDD14"
        }

        val alertLabel = when (record.alertOffset) {
            0 -> R.string.notification_alert_at_start
            10 -> R.string.notification_alert_10_min
            60 -> R.string.notification_alert_1_hour
            1440 -> R.string.notification_alert_1_day
            else -> R.string.notification_alert_at_start
        }

        return NotificationItem(
            id = record.id,
            eventName = eventName,
            eventIcon = eventIcon,
            alertLabel = alertLabel,
            triggerTime = record.triggerTime,
            isEventDeleted = isEventDeleted,
        )
    }

    fun markAsRead(id: String) {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val entity = notificationRecordDao.getById(id) ?: return@launch
            notificationRecordDao.update(entity.copy(isRead = true, modifiedAt = now))
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val unreadRecords = notificationRecordDao.getUnreadDeliveredList()
            val updatedRecords = unreadRecords.map { it.copy(isRead = true, modifiedAt = now) }
            notificationRecordDao.updateAll(updatedRecords)
        }
    }
}
