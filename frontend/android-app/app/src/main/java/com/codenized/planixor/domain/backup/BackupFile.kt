package com.codenized.planixor.domain.backup

const val CURRENT_SCHEMA_VERSION = 1
const val MAX_BACKUP_SIZE_BYTES = 50L * 1024 * 1024

/**
 * Top-level backup file structure containing metadata and all entity data.
 */
data class BackupFile(
    val metadata: BackupMetadata,
    val data: BackupData,
)

/**
 * Metadata about the backup: when it was created, which app version and platform produced it,
 * and which schema version the data conforms to.
 */
data class BackupMetadata(
    val createdAt: String,
    val appVersion: String,
    val platform: String,
    val schemaVersion: Int,
)

/**
 * Container for all entity data included in a backup.
 */
data class BackupData(
    val calendarEvents: List<BackupCalendarEvent>,
    val notificationRecords: List<BackupNotificationRecord>,
    val annualHoursConfig: List<BackupAnnualHoursConfig>,
    val shifts: List<BackupShift>,
    val reminders: List<BackupReminder>,
    val syncConfig: List<BackupSyncConfig>,
)

/**
 * Serialization model for a work shift template.
 * Times are stored as minutes from midnight (0–1439).
 * Date fields are ISO 8601 UTC strings with Z suffix.
 */
data class BackupShift(
    val id: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val startTime: Int,
    val endTime: Int,
    val hoursWorked: Int,
    val isActive: Boolean,
    val createdAt: String,
    val modifiedAt: String,
    val syncedAt: String?,
    val isDeleted: Boolean,
)

/**
 * Serialization model for a reminder template.
 * Date fields are ISO 8601 UTC strings with Z suffix.
 */
data class BackupReminder(
    val id: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val isActive: Boolean,
    val createdAt: String,
    val modifiedAt: String,
    val syncedAt: String?,
    val isDeleted: Boolean,
)

/**
 * Serialization model for a calendar event.
 * Times are stored as minutes from midnight (0–1439).
 * Day fields use "YYYY-MM-DD" format.
 * Date fields are ISO 8601 UTC strings with Z suffix.
 */
data class BackupCalendarEvent(
    val id: String,
    val eventType: String,
    val eventTypeId: String,
    val startDay: String,
    val endDay: String,
    val startTime: Int,
    val endTime: Int,
    val totalHours: Int,
    val notes: String?,
    val alertOffsets: List<Int>,
    val modifiedAt: String,
    val syncedAt: String?,
    val isDeleted: Boolean,
)

/**
 * Serialization model for a notification record.
 * Date fields are ISO 8601 UTC strings with Z suffix.
 */
data class BackupNotificationRecord(
    val id: String,
    val calendarEventId: String,
    val alertOffset: Int,
    val triggerTime: String,
    val isDelivered: Boolean,
    val isRead: Boolean,
    val modifiedAt: String,
    val syncedAt: String?,
    val isDeleted: Boolean,
)

/**
 * Serialization model for annual hours configuration.
 * Date fields are ISO 8601 UTC strings with Z suffix.
 */
data class BackupAnnualHoursConfig(
    val id: String,
    val year: Int,
    val configuredHours: Int,
    val modifiedAt: String,
    val syncedAt: String?,
    val isDeleted: Boolean,
)

/**
 * Serialization model for sync configuration preferences.
 */
data class BackupSyncConfig(
    val serverUrl: String,
    val apiKey: String,
    val username: String,
    val apiBasePath: String,
    val syncIntervalMinutes: Int,
    val isPaused: Boolean,
    val lastSyncedAt: String?,
)

/**
 * Sealed class representing validation errors during backup file processing.
 */
sealed class ValidationError {
    data class FileTooLarge(val maxMb: Int) : ValidationError()
    data class InvalidJson(val details: String) : ValidationError()
    data class InvalidSchema(val missingFields: List<String>) : ValidationError()
    data class IncompatibleVersion(val fileVersion: Int, val maxSupported: Int) : ValidationError()
}

/**
 * Result of a restore operation indicating success/failure and entity-level details.
 */
data class RestoreResult(
    val success: Boolean,
    val restoredCount: Int,
    val failedEntities: List<String>,
    val succeededEntities: List<String>,
)
