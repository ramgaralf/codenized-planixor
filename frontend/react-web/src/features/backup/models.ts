/**
 * Backup feature — shared types and models.
 *
 * Defines the canonical backup file format used for client-side
 * backup creation and restoration. This format is shared between
 * React Web (PWA) and Android App for cross-platform compatibility.
 *
 * All date fields are serialized as ISO 8601 UTC strings with Z suffix.
 * All UUIDs are lowercase hyphenated strings.
 * All nullable fields use JSON null when no value is present.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Current backup file schema version */
export const CURRENT_SCHEMA_VERSION = 1 as const;

/** Maximum allowed backup file size in bytes (50 MB) */
export const MAX_BACKUP_SIZE_BYTES = 50 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Top-level backup file structure
// ---------------------------------------------------------------------------

/**
 * BackupFile — root structure of a .bak backup file.
 *
 * Contains metadata about when/where the backup was created
 * and the full application data payload.
 */
export interface BackupFile {
  metadata: BackupMetadata;
  data: BackupData;
}

/**
 * BackupMetadata — describes the backup creation context.
 *
 * Used for validation, version compatibility checks, and
 * informational display during restore.
 */
export interface BackupMetadata {
  /** Backup creation timestamp in ISO 8601 UTC with Z suffix */
  createdAt: string;

  /** Application version in SemVer format: "MAJOR.MINOR.PATCH" */
  appVersion: string;

  /** Platform that created the backup */
  platform: 'web' | 'android';

  /** Schema version integer, starting at 1 */
  schemaVersion: number;
}

/**
 * BackupData — contains all entity arrays from the application.
 *
 * Each entity table is represented as an array. Empty tables
 * are serialized as empty arrays (never omitted).
 */
export interface BackupData {
  calendarEvents: BackupCalendarEvent[];
  notificationRecords: BackupNotificationRecord[];
  annualHoursConfig: BackupAnnualHoursConfig[];
  shifts: BackupShift[];
  reminders: BackupReminder[];
  syncConfig: BackupSyncConfig[];
}

// ---------------------------------------------------------------------------
// Entity serialization interfaces
// ---------------------------------------------------------------------------

/**
 * BackupShift — serialized representation of a Shift entity.
 *
 * Date fields are ISO 8601 UTC strings (not Date objects).
 */
export interface BackupShift {
  id: string;
  name: string;
  icon: string;
  backgroundColor: string;
  startTime: number;
  endTime: number;
  hoursWorked: number;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
  syncedAt: string | null;
  isDeleted: boolean;
}

/**
 * BackupReminder — serialized representation of a Reminder entity.
 *
 * Date fields are ISO 8601 UTC strings (not Date objects).
 */
export interface BackupReminder {
  id: string;
  name: string;
  icon: string;
  backgroundColor: string;
  isActive: boolean;
  seriesFrequency: string;
  seriesEndDate: string | null;
  createdAt: string;
  modifiedAt: string;
  syncedAt: string | null;
  isDeleted: boolean;
}

/**
 * BackupCalendarEvent — serialized representation of a CalendarEvent entity.
 *
 * Date fields are ISO 8601 UTC strings (not Date objects).
 * Day fields remain as "YYYY-MM-DD" strings.
 */
export interface BackupCalendarEvent {
  id: string;
  eventType: string;
  eventTypeId: string;
  startDay: string;
  endDay: string;
  startTime: number;
  endTime: number;
  totalHours: number;
  notes: string | null;
  alertOffsets: number[];
  seriesId: string | null;
  modifiedAt: string;
  syncedAt: string | null;
  isDeleted: boolean;
}

/**
 * BackupNotificationRecord — serialized representation of a NotificationRecord entity.
 *
 * Date fields are ISO 8601 UTC strings (not Date objects).
 */
export interface BackupNotificationRecord {
  id: string;
  calendarEventId: string;
  alertOffset: number;
  triggerTime: string;
  isDelivered: boolean;
  isRead: boolean;
  modifiedAt: string;
  syncedAt: string | null;
  isDeleted: boolean;
}

/**
 * BackupAnnualHoursConfig — serialized representation of an AnnualHoursConfig entity.
 *
 * Date fields are ISO 8601 UTC strings (not Date objects).
 */
export interface BackupAnnualHoursConfig {
  id: string;
  year: number;
  configuredHours: number;
  modifiedAt: string;
  syncedAt: string | null;
  isDeleted: boolean;
}

/**
 * BackupSyncConfig — serialized representation of SyncConfig preferences.
 *
 * Unlike other entities, sync config has no UUID, modifiedAt, or isDeleted
 * fields — it is a single-row preference record.
 */
export interface BackupSyncConfig {
  serverUrl: string;
  apiKey: string;
  username: string;
  apiBasePath: string;
  syncIntervalMinutes: number;
  isPaused: boolean;
  lastSyncedAt: string | null;
}

// ---------------------------------------------------------------------------
// Validation types
// ---------------------------------------------------------------------------

/**
 * ValidationError — discriminated union representing specific validation failures.
 *
 * Each variant identifies the exact rule that failed during backup file validation.
 */
export type ValidationError =
  | { type: 'FILE_TOO_LARGE'; maxMb: number }
  | { type: 'INVALID_JSON'; details: string }
  | { type: 'INVALID_SCHEMA'; missingFields: string[] }
  | { type: 'INCOMPATIBLE_VERSION'; fileVersion: number; maxSupported: number };

// ---------------------------------------------------------------------------
// Restore result
// ---------------------------------------------------------------------------

/**
 * RestoreResult — outcome of a backup restoration operation.
 *
 * Reports success/failure status, total restored record count,
 * and which entity tables succeeded or failed.
 */
export interface RestoreResult {
  success: boolean;
  restoredCount: number;
  failedEntities: string[];
  succeededEntities: string[];
}
