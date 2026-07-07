import { db } from '@/data/db';

import type { BackupFile, RestoreResult } from '../models';
import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';
import type { CalendarEvent } from '@features/calendar-events/models';
import type { NotificationRecord } from '@features/notifications/types';
import type { AnnualHoursConfig } from '@features/reports/models';
import type { SyncConfig } from '@features/sync/models';
import type {
  BackupShift,
  BackupReminder,
  BackupCalendarEvent,
  BackupNotificationRecord,
  BackupAnnualHoursConfig,
  BackupSyncConfig,
} from '../models';

/**
 * Convert ISO 8601 string to Date object.
 */
const fromIso = (iso: string): Date => new Date(iso);

/**
 * Convert a BackupShift to a local Shift entity.
 */
const toShift = (backup: BackupShift): Shift => ({
  id: backup.id,
  name: backup.name,
  icon: backup.icon,
  backgroundColor: backup.backgroundColor,
  startTime: backup.startTime,
  endTime: backup.endTime,
  hoursWorked: backup.hoursWorked,
  isActive: backup.isActive,
  createdAt: fromIso(backup.createdAt),
  modifiedAt: fromIso(backup.modifiedAt),
  syncedAt: null,
  isDeleted: backup.isDeleted,
});

/**
 * Convert a BackupReminder to a local Reminder entity.
 */
const toReminder = (backup: BackupReminder): Reminder => ({
  id: backup.id,
  name: backup.name,
  icon: backup.icon,
  backgroundColor: backup.backgroundColor,
  isActive: backup.isActive,
  seriesFrequency: (backup.seriesFrequency ?? 'never') as 'never' | 'weekly' | 'monthly' | 'yearly',
  seriesEndDate: backup.seriesEndDate ?? null,
  createdAt: fromIso(backup.createdAt),
  modifiedAt: fromIso(backup.modifiedAt),
  syncedAt: null,
  isDeleted: backup.isDeleted,
});

/**
 * Convert a BackupCalendarEvent to a local CalendarEvent entity.
 */
const toCalendarEvent = (backup: BackupCalendarEvent): CalendarEvent => ({
  id: backup.id,
  eventType: backup.eventType as 'shift' | 'reminder',
  eventTypeId: backup.eventTypeId,
  startDay: backup.startDay,
  endDay: backup.endDay,
  startTime: backup.startTime,
  endTime: backup.endTime,
  totalHours: backup.totalHours,
  notes: backup.notes,
  alertOffsets: backup.alertOffsets,
  seriesId: backup.seriesId ?? null,
  modifiedAt: fromIso(backup.modifiedAt),
  syncedAt: null,
  isDeleted: backup.isDeleted,
});

/**
 * Convert a BackupNotificationRecord to a local NotificationRecord entity.
 */
const toNotificationRecord = (
  backup: BackupNotificationRecord,
): NotificationRecord => ({
  id: backup.id,
  calendarEventId: backup.calendarEventId,
  alertOffset: backup.alertOffset,
  triggerTime: fromIso(backup.triggerTime),
  isDelivered: backup.isDelivered,
  isRead: backup.isRead,
  modifiedAt: fromIso(backup.modifiedAt),
  syncedAt: null,
  isDeleted: backup.isDeleted,
});

/**
 * Convert a BackupAnnualHoursConfig to a local AnnualHoursConfig entity.
 */
const toAnnualHoursConfig = (
  backup: BackupAnnualHoursConfig,
): AnnualHoursConfig => ({
  id: backup.id,
  year: backup.year,
  configuredHours: backup.configuredHours,
  modifiedAt: fromIso(backup.modifiedAt),
  syncedAt: null,
  isDeleted: backup.isDeleted,
});

/**
 * Convert a BackupSyncConfig to a local SyncConfig entity.
 */
const toSyncConfig = (backup: BackupSyncConfig): SyncConfig => ({
  key: 'default',
  serverUrl: backup.serverUrl,
  apiKey: backup.apiKey,
  username: backup.username,
  apiBasePath: backup.apiBasePath,
  syncIntervalMinutes: backup.syncIntervalMinutes,
  isPaused: backup.isPaused,
  lastSyncedAt: backup.lastSyncedAt,
});

/**
 * Restore shifts from backup using LWW merge logic.
 * Returns the number of records inserted or updated.
 */
const restoreShifts = async (
  backupShifts: BackupShift[],
): Promise<number> => {
  let restoredCount = 0;

  await db.transaction('rw', db.shifts, async () => {
    for (const backupRecord of backupShifts) {
      const local = await db.shifts.get(backupRecord.id);
      const backupModifiedAt = fromIso(backupRecord.modifiedAt);

      if (!local) {
        await db.shifts.add(toShift(backupRecord));
        restoredCount++;
      } else if (backupModifiedAt > local.modifiedAt) {
        await db.shifts.put(toShift(backupRecord));
        restoredCount++;
      }
    }
  });

  return restoredCount;
};

/**
 * Restore reminders from backup using LWW merge logic.
 * Returns the number of records inserted or updated.
 */
const restoreReminders = async (
  backupReminders: BackupReminder[],
): Promise<number> => {
  let restoredCount = 0;

  await db.transaction('rw', db.reminders, async () => {
    for (const backupRecord of backupReminders) {
      const local = await db.reminders.get(backupRecord.id);
      const backupModifiedAt = fromIso(backupRecord.modifiedAt);

      if (!local) {
        await db.reminders.add(toReminder(backupRecord));
        restoredCount++;
      } else if (backupModifiedAt > local.modifiedAt) {
        await db.reminders.put(toReminder(backupRecord));
        restoredCount++;
      }
    }
  });

  return restoredCount;
};

/**
 * Restore calendar events from backup using LWW merge logic.
 * Returns the number of records inserted or updated.
 */
const restoreCalendarEvents = async (
  backupEvents: BackupCalendarEvent[],
): Promise<number> => {
  let restoredCount = 0;

  await db.transaction('rw', db.calendarEvents, async () => {
    for (const backupRecord of backupEvents) {
      const local = await db.calendarEvents.get(backupRecord.id);
      const backupModifiedAt = fromIso(backupRecord.modifiedAt);

      if (!local) {
        await db.calendarEvents.add(toCalendarEvent(backupRecord));
        restoredCount++;
      } else if (backupModifiedAt > local.modifiedAt) {
        await db.calendarEvents.put(toCalendarEvent(backupRecord));
        restoredCount++;
      }
    }
  });

  return restoredCount;
};

/**
 * Restore notification records from backup using LWW merge logic.
 * Returns the number of records inserted or updated.
 */
const restoreNotificationRecords = async (
  backupNotifications: BackupNotificationRecord[],
): Promise<number> => {
  let restoredCount = 0;

  await db.transaction('rw', db.notifications, async () => {
    for (const backupRecord of backupNotifications) {
      const local = await db.notifications.get(backupRecord.id);
      const backupModifiedAt = fromIso(backupRecord.modifiedAt);

      if (!local) {
        await db.notifications.add(toNotificationRecord(backupRecord));
        restoredCount++;
      } else if (backupModifiedAt > local.modifiedAt) {
        await db.notifications.put(toNotificationRecord(backupRecord));
        restoredCount++;
      }
    }
  });

  return restoredCount;
};

/**
 * Restore annual hours config from backup using LWW merge logic.
 * Returns the number of records inserted or updated.
 */
const restoreAnnualHoursConfig = async (
  backupConfigs: BackupAnnualHoursConfig[],
): Promise<number> => {
  let restoredCount = 0;

  await db.transaction('rw', db.annualHoursConfig, async () => {
    for (const backupRecord of backupConfigs) {
      const local = await db.annualHoursConfig.get(backupRecord.id);
      const backupModifiedAt = fromIso(backupRecord.modifiedAt);

      if (!local) {
        await db.annualHoursConfig.add(toAnnualHoursConfig(backupRecord));
        restoredCount++;
      } else if (backupModifiedAt > local.modifiedAt) {
        await db.annualHoursConfig.put(toAnnualHoursConfig(backupRecord));
        restoredCount++;
      }
    }
  });

  return restoredCount;
};

/**
 * Restore sync config from backup.
 * Only writes if no local sync config exists.
 * Returns the number of records inserted (0 or 1).
 */
const restoreSyncConfig = async (
  backupConfigs: BackupSyncConfig[],
): Promise<number> => {
  let restoredCount = 0;

  await db.transaction('rw', db.syncConfig, async () => {
    const localConfigs = await db.syncConfig.toArray();

    if (localConfigs.length === 0 && backupConfigs.length > 0) {
      const firstConfig = backupConfigs[0];
      if (firstConfig) {
        const configToRestore = toSyncConfig(firstConfig);
        await db.syncConfig.add(configToRestore);
        restoredCount = 1;
      }
    }
  });

  return restoredCount;
};

/**
 * Restore a backup file into the local database.
 *
 * Processes entities in dependency order:
 * 1. Shifts (no dependencies)
 * 2. Reminders (no dependencies)
 * 3. Calendar Events (references shifts/reminders)
 * 4. Notification Records (references calendar events)
 * 5. Annual Hours Config (no dependencies, ordered for consistency)
 * 6. Sync Config (preferences, no entity dependencies)
 *
 * Per-entity-table atomicity: if one table fails, it is rolled back
 * and the remaining tables are still attempted.
 *
 * @param backup - The parsed backup file to restore
 * @param hasExistingData - Whether existing data was detected (reserved for future use)
 * @returns RestoreResult with counts and succeeded/failed entity names
 */
export const restoreBackup = async (
  backup: BackupFile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _hasExistingData: boolean,
): Promise<RestoreResult> => {
  const succeededEntities: string[] = [];
  const failedEntities: string[] = [];
  let totalRestoredCount = 0;

  // 1. Shifts
  try {
    const count = await restoreShifts(backup.data.shifts);
    totalRestoredCount += count;
    succeededEntities.push('shifts');
  } catch (error) {
    console.error('Failed to restore shifts:', error);
    failedEntities.push('shifts');
  }

  // 2. Reminders
  try {
    const count = await restoreReminders(backup.data.reminders);
    totalRestoredCount += count;
    succeededEntities.push('reminders');
  } catch (error) {
    console.error('Failed to restore reminders:', error);
    failedEntities.push('reminders');
  }

  // 3. Calendar Events
  try {
    const count = await restoreCalendarEvents(backup.data.calendarEvents);
    totalRestoredCount += count;
    succeededEntities.push('calendarEvents');
  } catch (error) {
    console.error('Failed to restore calendar events:', error);
    failedEntities.push('calendarEvents');
  }

  // 4. Notification Records
  try {
    const count = await restoreNotificationRecords(
      backup.data.notificationRecords,
    );
    totalRestoredCount += count;
    succeededEntities.push('notificationRecords');
  } catch (error) {
    console.error('Failed to restore notification records:', error);
    failedEntities.push('notificationRecords');
  }

  // 5. Annual Hours Config
  try {
    const count = await restoreAnnualHoursConfig(
      backup.data.annualHoursConfig,
    );
    totalRestoredCount += count;
    succeededEntities.push('annualHoursConfig');
  } catch (error) {
    console.error('Failed to restore annual hours config:', error);
    failedEntities.push('annualHoursConfig');
  }

  // 6. Sync Config
  try {
    const count = await restoreSyncConfig(backup.data.syncConfig);
    totalRestoredCount += count;
    succeededEntities.push('syncConfig');
  } catch (error) {
    console.error('Failed to restore sync config:', error);
    failedEntities.push('syncConfig');
  }

  return {
    success: failedEntities.length === 0,
    restoredCount: totalRestoredCount,
    failedEntities,
    succeededEntities,
  };
};

/**
 * Check whether existing non-deleted data exists across all five entity tables.
 *
 * Returns true if at least one record with isDeleted = false exists
 * in any of: shifts, reminders, calendarEvents, notifications, annualHoursConfig.
 */
export const checkExistingData = async (): Promise<boolean> => {
  const hasShifts =
    (await db.shifts.filter((r) => !r.isDeleted).first()) !== undefined;
  if (hasShifts) return true;

  const hasReminders =
    (await db.reminders.filter((r) => !r.isDeleted).first()) !== undefined;
  if (hasReminders) return true;

  const hasCalendarEvents =
    (await db.calendarEvents.filter((r) => !r.isDeleted).first()) !==
    undefined;
  if (hasCalendarEvents) return true;

  const hasNotifications =
    (await db.notifications.filter((r) => !r.isDeleted).first()) !==
    undefined;
  if (hasNotifications) return true;

  const hasAnnualHoursConfig =
    (await db.annualHoursConfig.filter((r) => !r.isDeleted).first()) !==
    undefined;
  if (hasAnnualHoursConfig) return true;

  return false;
};
