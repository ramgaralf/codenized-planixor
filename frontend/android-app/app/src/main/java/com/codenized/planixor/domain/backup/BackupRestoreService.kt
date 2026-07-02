package com.codenized.planixor.domain.backup

import androidx.room.withTransaction
import com.codenized.planixor.data.local.AnnualHoursConfigDao
import com.codenized.planixor.data.local.AnnualHoursConfigEntity
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.CalendarEventEntity
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.NotificationRecordEntity
import com.codenized.planixor.data.local.PlanixorDatabase
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ReminderEntity
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftEntity
import com.codenized.planixor.data.sync.SyncConfig
import kotlinx.coroutines.flow.first
import java.time.Instant
import javax.inject.Inject

/**
 * Handles restoration of backup data into the local database.
 * Implements LWW (Last-Writer-Wins) merge logic and processes entities
 * in dependency order to satisfy referential integrity.
 *
 * Per-entity-table atomicity: each entity type is restored within a Room
 * transaction. If one entity table fails, others are still attempted.
 */
class BackupRestoreService @Inject constructor(
    private val shiftDao: ShiftDao,
    private val reminderDao: ReminderDao,
    private val calendarEventDao: CalendarEventDao,
    private val notificationRecordDao: NotificationRecordDao,
    private val annualHoursConfigDao: AnnualHoursConfigDao,
    private val preferencesRepository: PreferencesRepository,
    private val database: PlanixorDatabase,
) {

    /**
     * Restores backup data into the local store using LWW merge logic.
     * Processes entities in dependency order:
     * shifts → reminders → calendarEvents → notificationRecords → annualHoursConfig → syncConfig
     *
     * @param backup The validated backup file to restore.
     * @param hasExistingData Whether the local store already contains data.
     * @return RestoreResult indicating success/failure and entity-level details.
     */
    suspend fun restore(backup: BackupFile, hasExistingData: Boolean): RestoreResult {
        val succeededEntities = mutableListOf<String>()
        val failedEntities = mutableListOf<String>()
        var restoredCount = 0

        // 1. Shifts
        try {
            val count = database.withTransaction {
                restoreShifts(backup.data.shifts)
            }
            succeededEntities.add("shifts")
            restoredCount += count
        } catch (_: Exception) {
            failedEntities.add("shifts")
        }

        // 2. Reminders
        try {
            val count = database.withTransaction {
                restoreReminders(backup.data.reminders)
            }
            succeededEntities.add("reminders")
            restoredCount += count
        } catch (_: Exception) {
            failedEntities.add("reminders")
        }

        // 3. Calendar Events
        try {
            val count = database.withTransaction {
                restoreCalendarEvents(backup.data.calendarEvents)
            }
            succeededEntities.add("calendarEvents")
            restoredCount += count
        } catch (_: Exception) {
            failedEntities.add("calendarEvents")
        }

        // 4. Notification Records
        try {
            val count = database.withTransaction {
                restoreNotificationRecords(backup.data.notificationRecords)
            }
            succeededEntities.add("notificationRecords")
            restoredCount += count
        } catch (_: Exception) {
            failedEntities.add("notificationRecords")
        }

        // 5. Annual Hours Config
        try {
            val count = database.withTransaction {
                restoreAnnualHoursConfig(backup.data.annualHoursConfig)
            }
            succeededEntities.add("annualHoursConfig")
            restoredCount += count
        } catch (_: Exception) {
            failedEntities.add("annualHoursConfig")
        }

        // 6. Sync Config (no Room transaction needed — DataStore-based)
        try {
            val restored = restoreSyncConfig(backup.data.syncConfig)
            if (restored) {
                succeededEntities.add("syncConfig")
                restoredCount += 1
            } else {
                succeededEntities.add("syncConfig")
            }
        } catch (_: Exception) {
            failedEntities.add("syncConfig")
        }

        return RestoreResult(
            success = failedEntities.isEmpty(),
            restoredCount = restoredCount,
            failedEntities = failedEntities,
            succeededEntities = succeededEntities,
        )
    }

    /**
     * Checks whether any non-deleted data exists across all five entity tables.
     * Returns true if at least one table has a non-deleted record.
     */
    suspend fun checkExistingData(): Boolean {
        val shifts = shiftDao.getAll().any { !it.isDeleted }
        if (shifts) return true

        val reminders = reminderDao.getAll().any { !it.isDeleted }
        if (reminders) return true

        val calendarEvents = calendarEventDao.getAll().any { !it.isDeleted }
        if (calendarEvents) return true

        val notificationRecords = notificationRecordDao.getAll().any { !it.isDeleted }
        if (notificationRecords) return true

        val annualHoursConfig = annualHoursConfigDao.getAllIncludingDeleted().any { !it.isDeleted }
        return annualHoursConfig
    }

    private suspend fun restoreShifts(backupShifts: List<BackupShift>): Int {
        var count = 0
        for (backupShift in backupShifts) {
            val local = shiftDao.getById(backupShift.id)
            val backupModifiedAt = backupShift.modifiedAt.toEpochMillis()

            if (local == null) {
                shiftDao.upsert(
                    ShiftEntity(
                        id = backupShift.id,
                        name = backupShift.name,
                        icon = backupShift.icon,
                        backgroundColor = backupShift.backgroundColor,
                        startTime = backupShift.startTime,
                        endTime = backupShift.endTime,
                        hoursWorked = backupShift.hoursWorked,
                        isActive = backupShift.isActive,
                        createdAt = backupShift.createdAt.toEpochMillis(),
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupShift.isDeleted,
                    )
                )
                count++
            } else if (backupModifiedAt > local.modifiedAt) {
                shiftDao.upsert(
                    ShiftEntity(
                        id = backupShift.id,
                        name = backupShift.name,
                        icon = backupShift.icon,
                        backgroundColor = backupShift.backgroundColor,
                        startTime = backupShift.startTime,
                        endTime = backupShift.endTime,
                        hoursWorked = backupShift.hoursWorked,
                        isActive = backupShift.isActive,
                        createdAt = backupShift.createdAt.toEpochMillis(),
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupShift.isDeleted,
                    )
                )
                count++
            }
        }
        return count
    }

    private suspend fun restoreReminders(backupReminders: List<BackupReminder>): Int {
        var count = 0
        for (backupReminder in backupReminders) {
            val local = reminderDao.getById(backupReminder.id)
            val backupModifiedAt = backupReminder.modifiedAt.toEpochMillis()

            if (local == null) {
                reminderDao.upsert(
                    ReminderEntity(
                        id = backupReminder.id,
                        name = backupReminder.name,
                        icon = backupReminder.icon,
                        backgroundColor = backupReminder.backgroundColor,
                        isActive = backupReminder.isActive,
                        createdAt = backupReminder.createdAt.toEpochMillis(),
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupReminder.isDeleted,
                    )
                )
                count++
            } else if (backupModifiedAt > local.modifiedAt) {
                reminderDao.upsert(
                    ReminderEntity(
                        id = backupReminder.id,
                        name = backupReminder.name,
                        icon = backupReminder.icon,
                        backgroundColor = backupReminder.backgroundColor,
                        isActive = backupReminder.isActive,
                        createdAt = backupReminder.createdAt.toEpochMillis(),
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupReminder.isDeleted,
                    )
                )
                count++
            }
        }
        return count
    }

    private suspend fun restoreCalendarEvents(backupEvents: List<BackupCalendarEvent>): Int {
        var count = 0
        for (backupEvent in backupEvents) {
            val local = calendarEventDao.getById(backupEvent.id)
            val backupModifiedAt = backupEvent.modifiedAt.toEpochMillis()

            if (local == null) {
                calendarEventDao.insert(
                    CalendarEventEntity(
                        id = backupEvent.id,
                        eventType = backupEvent.eventType,
                        eventTypeId = backupEvent.eventTypeId,
                        startDay = backupEvent.startDay,
                        endDay = backupEvent.endDay,
                        startTime = backupEvent.startTime,
                        endTime = backupEvent.endTime,
                        totalHours = backupEvent.totalHours,
                        notes = backupEvent.notes,
                        alertOffsets = serializeAlertOffsets(backupEvent.alertOffsets),
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupEvent.isDeleted,
                    )
                )
                count++
            } else if (backupModifiedAt > local.modifiedAt) {
                calendarEventDao.update(
                    CalendarEventEntity(
                        id = backupEvent.id,
                        eventType = backupEvent.eventType,
                        eventTypeId = backupEvent.eventTypeId,
                        startDay = backupEvent.startDay,
                        endDay = backupEvent.endDay,
                        startTime = backupEvent.startTime,
                        endTime = backupEvent.endTime,
                        totalHours = backupEvent.totalHours,
                        notes = backupEvent.notes,
                        alertOffsets = serializeAlertOffsets(backupEvent.alertOffsets),
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupEvent.isDeleted,
                    )
                )
                count++
            }
        }
        return count
    }

    private suspend fun restoreNotificationRecords(
        backupRecords: List<BackupNotificationRecord>,
    ): Int {
        var count = 0
        for (backupRecord in backupRecords) {
            val local = notificationRecordDao.getById(backupRecord.id)
            val backupModifiedAt = backupRecord.modifiedAt.toEpochMillis()

            if (local == null) {
                notificationRecordDao.insert(
                    NotificationRecordEntity(
                        id = backupRecord.id,
                        calendarEventId = backupRecord.calendarEventId,
                        alertOffset = backupRecord.alertOffset,
                        triggerTime = backupRecord.triggerTime.toEpochMillis(),
                        isDelivered = backupRecord.isDelivered,
                        isRead = backupRecord.isRead,
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupRecord.isDeleted,
                    )
                )
                count++
            } else if (backupModifiedAt > local.modifiedAt) {
                notificationRecordDao.update(
                    NotificationRecordEntity(
                        id = backupRecord.id,
                        calendarEventId = backupRecord.calendarEventId,
                        alertOffset = backupRecord.alertOffset,
                        triggerTime = backupRecord.triggerTime.toEpochMillis(),
                        isDelivered = backupRecord.isDelivered,
                        isRead = backupRecord.isRead,
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupRecord.isDeleted,
                    )
                )
                count++
            }
        }
        return count
    }

    private suspend fun restoreAnnualHoursConfig(
        backupConfigs: List<BackupAnnualHoursConfig>,
    ): Int {
        var count = 0
        for (backupConfig in backupConfigs) {
            val local = annualHoursConfigDao.getById(backupConfig.id)
            val backupModifiedAt = backupConfig.modifiedAt.toEpochMillis()

            if (local == null) {
                annualHoursConfigDao.upsert(
                    AnnualHoursConfigEntity(
                        id = backupConfig.id,
                        year = backupConfig.year,
                        configuredHours = backupConfig.configuredHours,
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupConfig.isDeleted,
                    )
                )
                count++
            } else if (backupModifiedAt > local.modifiedAt) {
                annualHoursConfigDao.upsert(
                    AnnualHoursConfigEntity(
                        id = backupConfig.id,
                        year = backupConfig.year,
                        configuredHours = backupConfig.configuredHours,
                        modifiedAt = backupModifiedAt,
                        syncedAt = null,
                        isDeleted = backupConfig.isDeleted,
                    )
                )
                count++
            }
        }
        return count
    }

    /**
     * Restores sync config only if no local config exists.
     * Returns true if backup config was written, false if skipped.
     */
    private suspend fun restoreSyncConfig(backupConfigs: List<BackupSyncConfig>): Boolean {
        if (backupConfigs.isEmpty()) return false

        val localConfig = preferencesRepository.syncConfigFlow.first()
        if (localConfig != null) return false

        val backupConfig = backupConfigs.first()
        preferencesRepository.saveSyncConfig(
            SyncConfig(
                serverUrl = backupConfig.serverUrl,
                apiKey = backupConfig.apiKey,
                username = backupConfig.username,
                apiBasePath = backupConfig.apiBasePath,
                syncIntervalMinutes = backupConfig.syncIntervalMinutes,
                isPaused = backupConfig.isPaused,
                lastSyncedAt = backupConfig.lastSyncedAt?.toEpochMillis(),
            )
        )
        return true
    }

    private fun serializeAlertOffsets(offsets: List<Int>): String {
        if (offsets.isEmpty()) return "[]"
        return offsets.joinToString(",", prefix = "[", postfix = "]")
    }
}

private fun String.toEpochMillis(): Long = Instant.parse(this).toEpochMilli()
