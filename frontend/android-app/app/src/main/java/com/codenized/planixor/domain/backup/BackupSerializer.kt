package com.codenized.planixor.domain.backup

import com.codenized.planixor.data.local.AnnualHoursConfigDao
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
import com.google.gson.GsonBuilder
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.first
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import javax.inject.Inject

/**
 * Serializes all local application data into a backup JSON string.
 * Reads all records (including soft-deleted) from Room DAOs and DataStore,
 * converts them to the platform-agnostic backup format, and produces a
 * complete BackupFile JSON with metadata.
 */
class BackupSerializer @Inject constructor(
    private val shiftDao: ShiftDao,
    private val reminderDao: ReminderDao,
    private val calendarEventDao: CalendarEventDao,
    private val notificationRecordDao: NotificationRecordDao,
    private val annualHoursConfigDao: AnnualHoursConfigDao,
    private val preferencesRepository: PreferencesRepository,
) {

    private val gson = GsonBuilder().serializeNulls().create()

    /**
     * Serializes all local data into a backup JSON string.
     * Includes all records (active and soft-deleted) from all entity tables.
     */
    suspend fun serialize(): String {
        val shifts = shiftDao.getAll().map { entity ->
            BackupShift(
                id = entity.id.lowercase(),
                name = entity.name,
                icon = entity.icon,
                backgroundColor = entity.backgroundColor,
                startTime = entity.startTime,
                endTime = entity.endTime,
                hoursWorked = entity.hoursWorked,
                isActive = entity.isActive,
                createdAt = entity.createdAt.toIsoString(),
                modifiedAt = entity.modifiedAt.toIsoString(),
                syncedAt = entity.syncedAt.toIsoStringOrNull(),
                isDeleted = entity.isDeleted,
            )
        }

        val reminders = reminderDao.getAll().map { entity ->
            BackupReminder(
                id = entity.id.lowercase(),
                name = entity.name,
                icon = entity.icon,
                backgroundColor = entity.backgroundColor,
                isActive = entity.isActive,
                createdAt = entity.createdAt.toIsoString(),
                modifiedAt = entity.modifiedAt.toIsoString(),
                syncedAt = entity.syncedAt.toIsoStringOrNull(),
                isDeleted = entity.isDeleted,
            )
        }

        val calendarEvents = calendarEventDao.getAll().map { entity ->
            BackupCalendarEvent(
                id = entity.id.lowercase(),
                eventType = entity.eventType,
                eventTypeId = entity.eventTypeId.lowercase(),
                startDay = entity.startDay,
                endDay = entity.endDay,
                startTime = entity.startTime,
                endTime = entity.endTime,
                totalHours = entity.totalHours,
                notes = entity.notes,
                alertOffsets = parseAlertOffsets(entity.alertOffsets),
                modifiedAt = entity.modifiedAt.toIsoString(),
                syncedAt = entity.syncedAt.toIsoStringOrNull(),
                isDeleted = entity.isDeleted,
            )
        }

        val notificationRecords = notificationRecordDao.getAll().map { entity ->
            BackupNotificationRecord(
                id = entity.id.lowercase(),
                calendarEventId = entity.calendarEventId.lowercase(),
                alertOffset = entity.alertOffset,
                triggerTime = entity.triggerTime.toIsoString(),
                isDelivered = entity.isDelivered,
                isRead = entity.isRead,
                modifiedAt = entity.modifiedAt.toIsoString(),
                syncedAt = entity.syncedAt.toIsoStringOrNull(),
                isDeleted = entity.isDeleted,
            )
        }

        val annualHoursConfig = annualHoursConfigDao.getAllIncludingDeleted().map { entity ->
            BackupAnnualHoursConfig(
                id = entity.id.lowercase(),
                year = entity.year,
                configuredHours = entity.configuredHours,
                modifiedAt = entity.modifiedAt.toIsoString(),
                syncedAt = entity.syncedAt.toIsoStringOrNull(),
                isDeleted = entity.isDeleted,
            )
        }

        val syncConfig = preferencesRepository.syncConfigFlow.first()
        val syncConfigList = if (syncConfig != null) {
            listOf(
                BackupSyncConfig(
                    serverUrl = syncConfig.serverUrl,
                    apiKey = syncConfig.apiKey,
                    username = syncConfig.username,
                    apiBasePath = syncConfig.apiBasePath,
                    syncIntervalMinutes = syncConfig.syncIntervalMinutes,
                    isPaused = syncConfig.isPaused,
                    lastSyncedAt = syncConfig.lastSyncedAt.toIsoStringOrNull(),
                )
            )
        } else {
            emptyList()
        }

        val backupFile = BackupFile(
            metadata = BackupMetadata(
                createdAt = Instant.now().atOffset(ZoneOffset.UTC)
                    .format(DateTimeFormatter.ISO_INSTANT),
                appVersion = APP_VERSION,
                platform = PLATFORM_ANDROID,
                schemaVersion = CURRENT_SCHEMA_VERSION,
            ),
            data = BackupData(
                calendarEvents = calendarEvents,
                notificationRecords = notificationRecords,
                annualHoursConfig = annualHoursConfig,
                shifts = shifts,
                reminders = reminders,
                syncConfig = syncConfigList,
            ),
        )

        return gson.toJson(backupFile)
    }

    private fun parseAlertOffsets(json: String): List<Int> {
        return try {
            val type = object : TypeToken<List<Int>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    companion object {
        private const val APP_VERSION = "1.0.0"
        private const val PLATFORM_ANDROID = "android"
    }
}

private fun Long.toIsoString(): String = Instant.ofEpochMilli(this)
    .atOffset(ZoneOffset.UTC)
    .format(DateTimeFormatter.ISO_INSTANT)

private fun Long?.toIsoStringOrNull(): String? = this?.toIsoString()
