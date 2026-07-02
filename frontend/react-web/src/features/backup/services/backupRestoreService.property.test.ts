import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';
import { restoreBackup } from './backupRestoreService';
import type {
  BackupFile,
  BackupShift,
  BackupReminder,
  BackupCalendarEvent,
  BackupNotificationRecord,
  BackupAnnualHoursConfig,
} from '../models';
import { CURRENT_SCHEMA_VERSION } from '../models';
import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';

/**
 * Property-based tests for backup restore merge logic.
 * Feature: gh22-backups, Properties 4, 5, 6
 *
 * **Validates: Requirements 8.2, 8.3, 8.4, 8.9**
 */

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates an ISO 8601 UTC date string with millisecond precision */
const isoDateArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => new Date(ms).toISOString());

/** Generates a lowercase UUID string */
const uuidArb = fc.uuid().map((id) => id.toLowerCase());

/** Generates a valid BackupShift */
const arbBackupShift = (id?: fc.Arbitrary<string>, modifiedAt?: fc.Arbitrary<string>): fc.Arbitrary<BackupShift> =>
  fc.record({
    id: id ?? uuidArb,
    name: fc.string({ minLength: 1, maxLength: 50 }),
    icon: fc.constantFrom('🌅', '🌙', '☀️', '⭐'),
    backgroundColor: fc.constantFrom('#2563EB', '#7C3AED', '#10B981'),
    startTime: fc.integer({ min: 0, max: 1439 }),
    endTime: fc.integer({ min: 0, max: 1439 }),
    hoursWorked: fc.integer({ min: 1, max: 1440 }),
    isActive: fc.boolean(),
    createdAt: isoDateArb,
    modifiedAt: modifiedAt ?? isoDateArb,
    syncedAt: fc.option(isoDateArb, { nil: null }),
    isDeleted: fc.boolean(),
  });

/** Generates a valid BackupReminder */
const arbBackupReminder = (id?: fc.Arbitrary<string>, modifiedAt?: fc.Arbitrary<string>): fc.Arbitrary<BackupReminder> =>
  fc.record({
    id: id ?? uuidArb,
    name: fc.string({ minLength: 1, maxLength: 50 }),
    icon: fc.constantFrom('🌅', '🌙', '☀️', '⭐'),
    backgroundColor: fc.constantFrom('#2563EB', '#7C3AED', '#10B981'),
    isActive: fc.boolean(),
    createdAt: isoDateArb,
    modifiedAt: modifiedAt ?? isoDateArb,
    syncedAt: fc.option(isoDateArb, { nil: null }),
    isDeleted: fc.boolean(),
  });

/** Generates a valid day string (YYYY-MM-DD) */
const dayStringArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).chain((month) =>
      fc.integer({ min: 1, max: 28 }).map((day) => {
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
      }),
    ),
  );

/** Generates a valid BackupCalendarEvent */
const arbBackupCalendarEvent = (id?: fc.Arbitrary<string>): fc.Arbitrary<BackupCalendarEvent> =>
  fc.record({
    id: id ?? uuidArb,
    eventType: fc.constantFrom('shift', 'reminder'),
    eventTypeId: uuidArb,
    startDay: dayStringArb,
    endDay: dayStringArb,
    startTime: fc.integer({ min: 0, max: 1439 }),
    endTime: fc.integer({ min: 0, max: 1439 }),
    totalHours: fc.integer({ min: 0, max: 1440 }),
    notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    alertOffsets: fc.array(fc.integer({ min: 0, max: 10080 }), { maxLength: 3 }),
    modifiedAt: isoDateArb,
    syncedAt: fc.option(isoDateArb, { nil: null }),
    isDeleted: fc.boolean(),
  });

/** Generates a valid BackupNotificationRecord */
const arbBackupNotificationRecord = (id?: fc.Arbitrary<string>): fc.Arbitrary<BackupNotificationRecord> =>
  fc.record({
    id: id ?? uuidArb,
    calendarEventId: uuidArb,
    alertOffset: fc.integer({ min: 0, max: 10080 }),
    triggerTime: isoDateArb,
    isDelivered: fc.boolean(),
    isRead: fc.boolean(),
    modifiedAt: isoDateArb,
    syncedAt: fc.option(isoDateArb, { nil: null }),
    isDeleted: fc.boolean(),
  });

/** Generates a valid BackupAnnualHoursConfig */
const arbBackupAnnualHoursConfig = (id?: fc.Arbitrary<string>): fc.Arbitrary<BackupAnnualHoursConfig> =>
  fc.record({
    id: id ?? uuidArb,
    year: fc.integer({ min: 2020, max: 2035 }),
    configuredHours: fc.integer({ min: 0, max: 3000 }),
    modifiedAt: isoDateArb,
    syncedAt: fc.option(isoDateArb, { nil: null }),
    isDeleted: fc.boolean(),
  });

/** Creates a minimal valid BackupFile wrapping given entity arrays */
const makeBackupFile = (overrides: Partial<BackupFile['data']> = {}): BackupFile => ({
  metadata: {
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    platform: 'web',
    schemaVersion: CURRENT_SCHEMA_VERSION,
  },
  data: {
    calendarEvents: [],
    notificationRecords: [],
    annualHoursConfig: [],
    shifts: [],
    reminders: [],
    syncConfig: [],
    ...overrides,
  },
});

/** Converts a BackupShift to a local Shift (for DB pre-population) */
const toLocalShift = (backup: BackupShift, modifiedAt: Date, syncedAt?: Date | null): Shift => ({
  id: backup.id,
  name: backup.name,
  icon: backup.icon,
  backgroundColor: backup.backgroundColor,
  startTime: backup.startTime,
  endTime: backup.endTime,
  hoursWorked: backup.hoursWorked,
  isActive: backup.isActive,
  createdAt: new Date(backup.createdAt),
  modifiedAt,
  syncedAt: syncedAt ?? new Date(),
  isDeleted: backup.isDeleted,
});

/** Converts a BackupReminder to a local Reminder (for DB pre-population) */
const toLocalReminder = (backup: BackupReminder, modifiedAt: Date, syncedAt?: Date | null): Reminder => ({
  id: backup.id,
  name: backup.name,
  icon: backup.icon,
  backgroundColor: backup.backgroundColor,
  isActive: backup.isActive,
  createdAt: new Date(backup.createdAt),
  modifiedAt,
  syncedAt: syncedAt ?? new Date(),
  isDeleted: backup.isDeleted,
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await db.shifts.clear();
  await db.reminders.clear();
  await db.calendarEvents.clear();
  await db.notifications.clear();
  await db.annualHoursConfig.clear();
  await db.syncConfig.clear();
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('backupRestoreService — Property Tests', () => {
  // Feature: gh22-backups, Property 4: Merge Last-Writer-Wins
  describe('Property 4: Merge Last-Writer-Wins', () => {
    it('should keep the record with the more recent modifiedAt when backup is newer', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBackupShift(),
          fc.integer({ min: 1, max: 86400000 }),
          async (backupShift, offsetMs) => {
            await db.shifts.clear();

            // Local has an older modifiedAt
            const backupModifiedAt = new Date(backupShift.modifiedAt);
            const localModifiedAt = new Date(backupModifiedAt.getTime() - offsetMs);

            const localShift = toLocalShift(backupShift, localModifiedAt);
            await db.shifts.add(localShift);

            const backup = makeBackupFile({ shifts: [backupShift] });
            await restoreBackup(backup, true);

            const result = await db.shifts.get(backupShift.id);
            expect(result).toBeDefined();
            // Backup wins: the local record should now have the backup's modifiedAt
            expect(result!.modifiedAt.getTime()).toBe(backupModifiedAt.getTime());
            // Backup's data fields should have replaced local
            expect(result!.name).toBe(backupShift.name);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should keep the local record unchanged when local modifiedAt is equal or newer', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBackupShift(),
          fc.integer({ min: 0, max: 86400000 }),
          async (backupShift, offsetMs) => {
            await db.shifts.clear();

            // Local has an equal or newer modifiedAt
            const backupModifiedAt = new Date(backupShift.modifiedAt);
            const localModifiedAt = new Date(backupModifiedAt.getTime() + offsetMs);

            const localShift = toLocalShift(backupShift, localModifiedAt);
            localShift.name = 'LOCAL_ORIGINAL_NAME';
            await db.shifts.add(localShift);

            const backup = makeBackupFile({ shifts: [backupShift] });
            await restoreBackup(backup, true);

            const result = await db.shifts.get(backupShift.id);
            expect(result).toBeDefined();
            // Local wins: modifiedAt and name stay as the local version
            expect(result!.modifiedAt.getTime()).toBe(localModifiedAt.getTime());
            expect(result!.name).toBe('LOCAL_ORIGINAL_NAME');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should apply LWW correctly for reminders when backup is newer', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBackupReminder(),
          fc.integer({ min: 1, max: 86400000 }),
          async (backupReminder, offsetMs) => {
            await db.reminders.clear();

            const backupModifiedAt = new Date(backupReminder.modifiedAt);
            const localModifiedAt = new Date(backupModifiedAt.getTime() - offsetMs);

            const localReminder = toLocalReminder(backupReminder, localModifiedAt);
            await db.reminders.add(localReminder);

            const backup = makeBackupFile({ reminders: [backupReminder] });
            await restoreBackup(backup, true);

            const result = await db.reminders.get(backupReminder.id);
            expect(result).toBeDefined();
            expect(result!.modifiedAt.getTime()).toBe(backupModifiedAt.getTime());
            expect(result!.name).toBe(backupReminder.name);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: gh22-backups, Property 5: Merge Preserves Non-Overlapping Records
  describe('Property 5: Merge Preserves Non-Overlapping Records', () => {
    it('should insert all backup records whose UUIDs are not present in local storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbBackupShift(), { minLength: 1, maxLength: 5 }),
          async (backupShifts) => {
            await db.shifts.clear();

            // Ensure UUIDs are unique within the generated array
            const uniqueShifts = backupShifts.filter(
              (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
            );

            const backup = makeBackupFile({ shifts: uniqueShifts });
            await restoreBackup(backup, false);

            // All backup records should have been inserted
            for (const shift of uniqueShifts) {
              const result = await db.shifts.get(shift.id);
              expect(result).toBeDefined();
              expect(result!.id).toBe(shift.id);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should leave local-only records unchanged when backup contains different UUIDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbBackupShift(), { minLength: 1, maxLength: 3 }),
          fc.array(arbBackupShift(), { minLength: 1, maxLength: 3 }),
          async (localShiftsData, backupShiftsData) => {
            await db.shifts.clear();

            // Deduplicate within each set
            const localUnique = localShiftsData.filter(
              (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
            );
            const backupUnique = backupShiftsData.filter(
              (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
            );

            // Ensure no overlap between local and backup UUIDs
            const localIds = new Set(localUnique.map((s) => s.id));
            const nonOverlappingBackup = backupUnique.filter((s) => !localIds.has(s.id));
            if (nonOverlappingBackup.length === 0) return; // skip if all collide

            // Pre-populate local DB
            for (const shift of localUnique) {
              const localShift = toLocalShift(shift, new Date(shift.modifiedAt));
              localShift.name = `LOCAL_${shift.id.slice(0, 8)}`;
              await db.shifts.add(localShift);
            }

            // Restore backup with non-overlapping records
            const backup = makeBackupFile({ shifts: nonOverlappingBackup });
            await restoreBackup(backup, true);

            // Verify local-only records remain unchanged
            for (const shift of localUnique) {
              const result = await db.shifts.get(shift.id);
              expect(result).toBeDefined();
              expect(result!.name).toBe(`LOCAL_${shift.id.slice(0, 8)}`);
            }

            // Verify backup records were inserted
            for (const shift of nonOverlappingBackup) {
              const result = await db.shifts.get(shift.id);
              expect(result).toBeDefined();
              expect(result!.id).toBe(shift.id);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should insert non-overlapping reminders and preserve local-only reminders', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBackupReminder(),
          arbBackupReminder(),
          async (localReminderData, backupReminderData) => {
            await db.reminders.clear();

            // Ensure different UUIDs
            if (localReminderData.id === backupReminderData.id) return;

            // Pre-populate local
            const localReminder = toLocalReminder(localReminderData, new Date(localReminderData.modifiedAt));
            localReminder.name = 'LOCAL_REMINDER';
            await db.reminders.add(localReminder);

            // Restore backup with different UUID
            const backup = makeBackupFile({ reminders: [backupReminderData] });
            await restoreBackup(backup, true);

            // Local remains unchanged
            const localResult = await db.reminders.get(localReminderData.id);
            expect(localResult).toBeDefined();
            expect(localResult!.name).toBe('LOCAL_REMINDER');

            // Backup was inserted
            const backupResult = await db.reminders.get(backupReminderData.id);
            expect(backupResult).toBeDefined();
            expect(backupResult!.id).toBe(backupReminderData.id);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: gh22-backups, Property 6: Restored Records Have Null SyncedAt
  describe('Property 6: Restored Records Have Null SyncedAt', () => {
    it('should set syncedAt to null for all inserted shift records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbBackupShift(), { minLength: 1, maxLength: 5 }),
          async (backupShifts) => {
            await db.shifts.clear();

            const uniqueShifts = backupShifts.filter(
              (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
            );

            const backup = makeBackupFile({ shifts: uniqueShifts });
            await restoreBackup(backup, false);

            for (const shift of uniqueShifts) {
              const result = await db.shifts.get(shift.id);
              expect(result).toBeDefined();
              expect(result!.syncedAt).toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should set syncedAt to null for records updated via LWW (backup wins)', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBackupShift(),
          fc.integer({ min: 1, max: 86400000 }),
          async (backupShift, offsetMs) => {
            await db.shifts.clear();

            // Local has older modifiedAt but non-null syncedAt
            const backupModifiedAt = new Date(backupShift.modifiedAt);
            const localModifiedAt = new Date(backupModifiedAt.getTime() - offsetMs);

            const localShift = toLocalShift(backupShift, localModifiedAt, new Date('2025-01-01T00:00:00Z'));
            await db.shifts.add(localShift);

            // Verify local had non-null syncedAt before restore
            const beforeRestore = await db.shifts.get(backupShift.id);
            expect(beforeRestore!.syncedAt).not.toBeNull();

            const backup = makeBackupFile({ shifts: [backupShift] });
            await restoreBackup(backup, true);

            // After restore, syncedAt should be null
            const result = await db.shifts.get(backupShift.id);
            expect(result).toBeDefined();
            expect(result!.syncedAt).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should set syncedAt to null for all inserted reminder records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbBackupReminder(), { minLength: 1, maxLength: 5 }),
          async (backupReminders) => {
            await db.reminders.clear();

            const uniqueReminders = backupReminders.filter(
              (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
            );

            const backup = makeBackupFile({ reminders: uniqueReminders });
            await restoreBackup(backup, false);

            for (const reminder of uniqueReminders) {
              const result = await db.reminders.get(reminder.id);
              expect(result).toBeDefined();
              expect(result!.syncedAt).toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should set syncedAt to null for inserted calendar events, notifications, and annual hours config', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBackupCalendarEvent(),
          arbBackupNotificationRecord(),
          arbBackupAnnualHoursConfig(),
          async (calEvent, notification, annualConfig) => {
            await db.calendarEvents.clear();
            await db.notifications.clear();
            await db.annualHoursConfig.clear();

            const backup = makeBackupFile({
              calendarEvents: [calEvent],
              notificationRecords: [notification],
              annualHoursConfig: [annualConfig],
            });
            await restoreBackup(backup, false);

            const calResult = await db.calendarEvents.get(calEvent.id);
            expect(calResult).toBeDefined();
            expect(calResult!.syncedAt).toBeNull();

            const notifResult = await db.notifications.get(notification.id);
            expect(notifResult).toBeDefined();
            expect(notifResult!.syncedAt).toBeNull();

            const annualResult = await db.annualHoursConfig.get(annualConfig.id);
            expect(annualResult).toBeDefined();
            expect(annualResult!.syncedAt).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
