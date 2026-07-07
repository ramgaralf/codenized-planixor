import { db } from '@/data/db';

import type {
  BackupAnnualHoursConfig,
  BackupCalendarEvent,
  BackupFile,
  BackupNotificationRecord,
  BackupReminder,
  BackupShift,
  BackupSyncConfig,
} from '../models';
import { CURRENT_SCHEMA_VERSION } from '../models';

/** Placeholder app version — will be updated when proper version management is in place */
const APP_VERSION = '1.0.0';

/**
 * Converts a Date to ISO 8601 UTC string with Z suffix.
 */
const toIso = (date: Date): string => date.toISOString();

/**
 * Converts a nullable Date to ISO 8601 UTC string or null.
 */
const toIsoOrNull = (date: Date | null): string | null =>
  date ? date.toISOString() : null;

/**
 * Serializes all application data from IndexedDB into a BackupFile JSON string.
 *
 * Reads all entities (including soft-deleted records) from all Dexie tables,
 * converts Date objects to ISO 8601 UTC strings, UUIDs to lowercase, and
 * produces the full backup JSON with metadata and data sections.
 *
 * @returns JSON string representation of the complete BackupFile
 */
export const serializeBackup = async (): Promise<string> => {
  const [
    shifts,
    reminders,
    calendarEvents,
    notificationRecords,
    annualHoursConfig,
    syncConfigRecords,
  ] = await Promise.all([
    db.shifts.toArray(),
    db.reminders.toArray(),
    db.calendarEvents.toArray(),
    db.notifications.toArray(),
    db.annualHoursConfig.toArray(),
    db.syncConfig.toArray(),
  ]);

  const backupShifts: BackupShift[] = shifts.map((shift) => ({
    id: shift.id.toLowerCase(),
    name: shift.name,
    icon: shift.icon,
    backgroundColor: shift.backgroundColor,
    startTime: shift.startTime,
    endTime: shift.endTime,
    hoursWorked: shift.hoursWorked,
    isActive: shift.isActive,
    createdAt: toIso(shift.createdAt),
    modifiedAt: toIso(shift.modifiedAt),
    syncedAt: toIsoOrNull(shift.syncedAt),
    isDeleted: shift.isDeleted,
  }));

  const backupReminders: BackupReminder[] = reminders.map((reminder) => ({
    id: reminder.id.toLowerCase(),
    name: reminder.name,
    icon: reminder.icon,
    backgroundColor: reminder.backgroundColor,
    isActive: reminder.isActive,
    seriesFrequency: reminder.seriesFrequency,
    seriesEndDate: reminder.seriesEndDate ?? null,
    createdAt: toIso(reminder.createdAt),
    modifiedAt: toIso(reminder.modifiedAt),
    syncedAt: toIsoOrNull(reminder.syncedAt),
    isDeleted: reminder.isDeleted,
  }));

  const backupCalendarEvents: BackupCalendarEvent[] = calendarEvents.map(
    (event) => ({
      id: event.id.toLowerCase(),
      eventType: event.eventType,
      eventTypeId: event.eventTypeId.toLowerCase(),
      startDay: event.startDay,
      endDay: event.endDay,
      startTime: event.startTime,
      endTime: event.endTime,
      totalHours: event.totalHours,
      notes: event.notes ?? null,
      alertOffsets: event.alertOffsets,
      seriesId: event.seriesId ?? null,
      modifiedAt: toIso(event.modifiedAt),
      syncedAt: toIsoOrNull(event.syncedAt),
      isDeleted: event.isDeleted,
    }),
  );

  const backupNotificationRecords: BackupNotificationRecord[] =
    notificationRecords.map((record) => ({
      id: record.id.toLowerCase(),
      calendarEventId: record.calendarEventId.toLowerCase(),
      alertOffset: record.alertOffset,
      triggerTime: toIso(record.triggerTime),
      isDelivered: record.isDelivered,
      isRead: record.isRead,
      modifiedAt: toIso(record.modifiedAt),
      syncedAt: toIsoOrNull(record.syncedAt),
      isDeleted: record.isDeleted,
    }));

  const backupAnnualHoursConfig: BackupAnnualHoursConfig[] =
    annualHoursConfig.map((config) => ({
      id: config.id.toLowerCase(),
      year: config.year,
      configuredHours: config.configuredHours,
      modifiedAt: toIso(config.modifiedAt),
      syncedAt: toIsoOrNull(config.syncedAt),
      isDeleted: config.isDeleted,
    }));

  const backupSyncConfig: BackupSyncConfig[] = syncConfigRecords.map(
    (config) => ({
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
      username: config.username,
      apiBasePath: config.apiBasePath,
      syncIntervalMinutes: config.syncIntervalMinutes,
      isPaused: config.isPaused,
      lastSyncedAt: config.lastSyncedAt ?? null,
    }),
  );

  const backupFile: BackupFile = {
    metadata: {
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      platform: 'web',
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
    data: {
      calendarEvents: backupCalendarEvents,
      notificationRecords: backupNotificationRecords,
      annualHoursConfig: backupAnnualHoursConfig,
      shifts: backupShifts,
      reminders: backupReminders,
      syncConfig: backupSyncConfig,
    },
  };

  return JSON.stringify(backupFile);
};
