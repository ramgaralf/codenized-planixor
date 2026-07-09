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
 * Detects whether the parsed JSON uses the legacy minified key format.
 * Legacy format uses single-letter keys: root has "a" (metadata) and "b" (data).
 */
const isLegacyFormat = (parsed: Record<string, unknown>): boolean => {
  return 'a' in parsed && 'b' in parsed && !('metadata' in parsed);
};

/**
 * Converts a legacy minified backup to the current format structure.
 *
 * Legacy key mapping:
 * - Root: a=metadata, b=data
 * - Metadata: a=createdAt
 * - Data: a=calendarEvents, b=notificationRecords, c=annualHoursConfig, d=shifts, e=reminders, f=syncConfig
 * - CalendarEvent: a=id, b=eventType, c=eventTypeId, d=startDay, e=endDay, f=startTime, g=endTime, h=totalHours, i=notes, j=alertOffsets, k=modifiedAt, l=syncedAt, m=isDeleted
 * - NotificationRecord: a=id, b=calendarEventId, c=alertOffset, d=triggerTime, e=isDelivered, f=isRead, g=modifiedAt, h=syncedAt, i=isDeleted
 * - AnnualHoursConfig: a=id, b=year, c=configuredHours, d=modifiedAt, e=syncedAt, f=isDeleted
 * - Shift: a=id, b=name, c=icon, d=backgroundColor, e=startTime, f=endTime, g=hoursWorked, h=isActive, i=createdAt, j=modifiedAt, k=syncedAt, l=isDeleted
 * - Reminder: a=id, b=name, c=icon, d=backgroundColor, e=isActive, f=createdAt, g=modifiedAt, h=syncedAt, i=isDeleted
 */
const convertLegacyFormat = (parsed: Record<string, unknown>): Record<string, unknown> => {
  const legacyMeta = (parsed.a ?? {}) as Record<string, unknown>;
  const legacyData = (parsed.b ?? {}) as Record<string, unknown>;

  const calendarEvents = Array.isArray(legacyData.a)
    ? (legacyData.a as Record<string, unknown>[]).map((e) => ({
        id: e.a, eventType: e.b, eventTypeId: e.c, startDay: e.d, endDay: e.e,
        startTime: e.f, endTime: e.g, totalHours: e.h, notes: e.i,
        alertOffsets: e.j, seriesId: null, modifiedAt: e.k, syncedAt: e.l, isDeleted: e.m,
      }))
    : [];

  const notificationRecords = Array.isArray(legacyData.b)
    ? (legacyData.b as Record<string, unknown>[]).map((e) => ({
        id: e.a, calendarEventId: e.b, alertOffset: e.c, triggerTime: e.d,
        isDelivered: e.e, isRead: e.f, modifiedAt: e.g, syncedAt: e.h, isDeleted: e.i,
      }))
    : [];

  const annualHoursConfig = Array.isArray(legacyData.c)
    ? (legacyData.c as Record<string, unknown>[]).map((e) => ({
        id: e.a, year: e.b, configuredHours: e.c, modifiedAt: e.d, syncedAt: e.e, isDeleted: e.f,
      }))
    : [];

  const shifts = Array.isArray(legacyData.d)
    ? (legacyData.d as Record<string, unknown>[]).map((e) => ({
        id: e.a, name: e.b, icon: e.c, backgroundColor: e.d, startTime: e.e,
        endTime: e.f, hoursWorked: e.g, isActive: e.h, createdAt: e.i,
        modifiedAt: e.j, syncedAt: e.k, isDeleted: e.l,
      }))
    : [];

  const reminders = Array.isArray(legacyData.e)
    ? (legacyData.e as Record<string, unknown>[]).map((e) => ({
        id: e.a, name: e.b, icon: e.c, backgroundColor: e.d, isActive: e.e,
        seriesFrequency: 'never', seriesEndDate: null,
        createdAt: e.f, modifiedAt: e.g, syncedAt: e.h, isDeleted: e.i,
      }))
    : [];

  const syncConfig = Array.isArray(legacyData.f)
    ? (legacyData.f as Record<string, unknown>[])
    : [];

  return {
    metadata: {
      createdAt: legacyMeta.a ?? '',
      appVersion: '1.0.0',
      platform: 'web',
      schemaVersion: 1,
    },
    data: { calendarEvents, notificationRecords, annualHoursConfig, shifts, reminders, syncConfig },
  };
};

/**
 * Deserializes a JSON string into a BackupFile structure.
 *
 * Supports both the current format (named keys: metadata, data, id, eventType, etc.)
 * and the legacy minified format (single-letter keys: a, b, c, etc.) produced by
 * earlier versions of the app.
 *
 * - Parses the JSON and extracts only known fields (unknown fields are ignored
 *   at any nesting level — forward compatibility per Requirement 9.6, 10.4).
 * - All date fields remain as ISO 8601 strings (the BackupFile interfaces use
 *   string types, not Date objects).
 * - Preserves UUIDs as-is and handles null fields correctly.
 */
export const deserializeBackup = (json: string): BackupFile => {
  let parsed = JSON.parse(json) as Record<string, unknown>;

  // Detect and convert legacy minified format
  if (isLegacyFormat(parsed)) {
    parsed = convertLegacyFormat(parsed);
  }

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
