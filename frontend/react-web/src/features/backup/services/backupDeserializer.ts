import type {
  BackupAnnualHoursConfig,
  BackupCalendarEvent,
  BackupData,
  BackupFile,
  BackupMetadata,
  BackupNotificationRecord,
  BackupReminder,
  BackupShift,
  BackupSyncConfig,
} from '../models';

/**
 * Deserializes a JSON string into a BackupFile structure.
 *
 * - Parses the JSON and extracts only known fields (unknown fields are ignored
 *   at any nesting level — forward compatibility per Requirement 9.6, 10.4).
 * - All date fields remain as ISO 8601 strings (the BackupFile interfaces use
 *   string types, not Date objects).
 * - Preserves UUIDs as-is and handles null fields correctly.
 */
export const deserializeBackup = (json: string): BackupFile => {
  const parsed = JSON.parse(json) as Record<string, unknown>;

  const rawMetadata = (parsed.metadata ?? {}) as Record<string, unknown>;
  const rawData = (parsed.data ?? {}) as Record<string, unknown>;

  const metadata: BackupMetadata = {
    createdAt: String(rawMetadata.createdAt ?? ''),
    appVersion: String(rawMetadata.appVersion ?? ''),
    platform: rawMetadata.platform as BackupMetadata['platform'],
    schemaVersion: Number(rawMetadata.schemaVersion ?? 0),
  };

  const data: BackupData = {
    calendarEvents: mapArray(
      rawData.calendarEvents,
      mapCalendarEvent,
    ),
    notificationRecords: mapArray(
      rawData.notificationRecords,
      mapNotificationRecord,
    ),
    annualHoursConfig: mapArray(
      rawData.annualHoursConfig,
      mapAnnualHoursConfig,
    ),
    shifts: mapArray(rawData.shifts, mapShift),
    reminders: mapArray(rawData.reminders, mapReminder),
    syncConfig: mapArray(rawData.syncConfig, mapSyncConfig),
  };

  return { metadata, data };
};

const mapArray = <T>(
  raw: unknown,
  mapper: (item: Record<string, unknown>) => T,
): T[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => mapper(item as Record<string, unknown>));
};

const mapShift = (raw: Record<string, unknown>): BackupShift => ({
  id: String(raw.id ?? ''),
  name: String(raw.name ?? ''),
  icon: String(raw.icon ?? ''),
  backgroundColor: String(raw.backgroundColor ?? ''),
  startTime: Number(raw.startTime ?? 0),
  endTime: Number(raw.endTime ?? 0),
  hoursWorked: Number(raw.hoursWorked ?? 0),
  isActive: Boolean(raw.isActive),
  createdAt: String(raw.createdAt ?? ''),
  modifiedAt: String(raw.modifiedAt ?? ''),
  syncedAt: raw.syncedAt === null || raw.syncedAt === undefined
    ? null
    : String(raw.syncedAt),
  isDeleted: Boolean(raw.isDeleted),
});

const mapReminder = (raw: Record<string, unknown>): BackupReminder => ({
  id: String(raw.id ?? ''),
  name: String(raw.name ?? ''),
  icon: String(raw.icon ?? ''),
  backgroundColor: String(raw.backgroundColor ?? ''),
  isActive: Boolean(raw.isActive),
  seriesFrequency: String(raw.seriesFrequency ?? 'never'),
  seriesEndDate: raw.seriesEndDate === null || raw.seriesEndDate === undefined
    ? null
    : String(raw.seriesEndDate),
  createdAt: String(raw.createdAt ?? ''),
  modifiedAt: String(raw.modifiedAt ?? ''),
  syncedAt: raw.syncedAt === null || raw.syncedAt === undefined
    ? null
    : String(raw.syncedAt),
  isDeleted: Boolean(raw.isDeleted),
});

const mapCalendarEvent = (
  raw: Record<string, unknown>,
): BackupCalendarEvent => ({
  id: String(raw.id ?? ''),
  eventType: String(raw.eventType ?? ''),
  eventTypeId: String(raw.eventTypeId ?? ''),
  startDay: String(raw.startDay ?? ''),
  endDay: String(raw.endDay ?? ''),
  startTime: Number(raw.startTime ?? 0),
  endTime: Number(raw.endTime ?? 0),
  totalHours: Number(raw.totalHours ?? 0),
  notes: raw.notes === null || raw.notes === undefined
    ? null
    : String(raw.notes),
  alertOffsets: Array.isArray(raw.alertOffsets)
    ? (raw.alertOffsets as unknown[]).map(Number)
    : [],
  seriesId: raw.seriesId === null || raw.seriesId === undefined
    ? null
    : String(raw.seriesId),
  modifiedAt: String(raw.modifiedAt ?? ''),
  syncedAt: raw.syncedAt === null || raw.syncedAt === undefined
    ? null
    : String(raw.syncedAt),
  isDeleted: Boolean(raw.isDeleted),
});

const mapNotificationRecord = (
  raw: Record<string, unknown>,
): BackupNotificationRecord => ({
  id: String(raw.id ?? ''),
  calendarEventId: String(raw.calendarEventId ?? ''),
  alertOffset: Number(raw.alertOffset ?? 0),
  triggerTime: String(raw.triggerTime ?? ''),
  isDelivered: Boolean(raw.isDelivered),
  isRead: Boolean(raw.isRead),
  modifiedAt: String(raw.modifiedAt ?? ''),
  syncedAt: raw.syncedAt === null || raw.syncedAt === undefined
    ? null
    : String(raw.syncedAt),
  isDeleted: Boolean(raw.isDeleted),
});

const mapAnnualHoursConfig = (
  raw: Record<string, unknown>,
): BackupAnnualHoursConfig => ({
  id: String(raw.id ?? ''),
  year: Number(raw.year ?? 0),
  configuredHours: Number(raw.configuredHours ?? 0),
  modifiedAt: String(raw.modifiedAt ?? ''),
  syncedAt: raw.syncedAt === null || raw.syncedAt === undefined
    ? null
    : String(raw.syncedAt),
  isDeleted: Boolean(raw.isDeleted),
});

const mapSyncConfig = (raw: Record<string, unknown>): BackupSyncConfig => ({
  serverUrl: String(raw.serverUrl ?? ''),
  apiKey: String(raw.apiKey ?? ''),
  username: String(raw.username ?? ''),
  apiBasePath: String(raw.apiBasePath ?? ''),
  syncIntervalMinutes: Number(raw.syncIntervalMinutes ?? 0),
  isPaused: Boolean(raw.isPaused),
  lastSyncedAt: raw.lastSyncedAt === null || raw.lastSyncedAt === undefined
    ? null
    : String(raw.lastSyncedAt),
});
