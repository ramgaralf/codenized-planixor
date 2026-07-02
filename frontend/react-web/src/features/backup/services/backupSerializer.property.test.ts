import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { deserializeBackup } from './backupDeserializer';
import type {
  BackupFile,
  BackupShift,
  BackupReminder,
  BackupCalendarEvent,
  BackupNotificationRecord,
  BackupAnnualHoursConfig,
  BackupSyncConfig,
} from '../models';
import { CURRENT_SCHEMA_VERSION } from '../models';

/**
 * Property-based tests for backup serialization round-trip.
 * Feature: gh22-backups, Property 1: Serialization Round-Trip
 *
 * **Validates: Requirements 9.7, 9.1, 9.3, 3.1, 3.2, 3.3, 3.4, 10.3**
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

/** Generates a nullable ISO 8601 UTC date string */
const isoDateOrNullArb = fc.option(isoDateArb, { nil: null });

/** Generates a lowercase UUID string */
const uuidArb = fc.uuid().map((id) => id.toLowerCase());

/** Generates a valid BackupShift */
const arbBackupShift: fc.Arbitrary<BackupShift> = fc.record({
  id: uuidArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.constantFrom('🌅', '🌙', '☀️', '⭐', '🔥', '💼'),
  backgroundColor: fc.constantFrom('#2563EB', '#7C3AED', '#10B981', '#EF4444', '#F97316'),
  startTime: fc.integer({ min: 0, max: 1439 }),
  endTime: fc.integer({ min: 0, max: 1439 }),
  hoursWorked: fc.integer({ min: 1, max: 1440 }),
  isActive: fc.boolean(),
  createdAt: isoDateArb,
  modifiedAt: isoDateArb,
  syncedAt: isoDateOrNullArb,
  isDeleted: fc.boolean(),
});

/** Generates a valid BackupReminder */
const arbBackupReminder: fc.Arbitrary<BackupReminder> = fc.record({
  id: uuidArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.constantFrom('🌅', '🌙', '☀️', '⭐', '🔥', '💼'),
  backgroundColor: fc.constantFrom('#2563EB', '#7C3AED', '#10B981', '#EF4444', '#F97316'),
  isActive: fc.boolean(),
  createdAt: isoDateArb,
  modifiedAt: isoDateArb,
  syncedAt: isoDateOrNullArb,
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
const arbBackupCalendarEvent: fc.Arbitrary<BackupCalendarEvent> = fc.record({
  id: uuidArb,
  eventType: fc.constantFrom('shift', 'reminder'),
  eventTypeId: uuidArb,
  startDay: dayStringArb,
  endDay: dayStringArb,
  startTime: fc.integer({ min: 0, max: 1439 }),
  endTime: fc.integer({ min: 0, max: 1439 }),
  totalHours: fc.integer({ min: 0, max: 1440 }),
  notes: fc.option(fc.string({ maxLength: 250 }), { nil: null }),
  alertOffsets: fc.array(fc.integer({ min: 0, max: 10080 }), { maxLength: 5 }),
  modifiedAt: isoDateArb,
  syncedAt: isoDateOrNullArb,
  isDeleted: fc.boolean(),
});

/** Generates a valid BackupNotificationRecord */
const arbBackupNotificationRecord: fc.Arbitrary<BackupNotificationRecord> = fc.record({
  id: uuidArb,
  calendarEventId: uuidArb,
  alertOffset: fc.integer({ min: 0, max: 10080 }),
  triggerTime: isoDateArb,
  isDelivered: fc.boolean(),
  isRead: fc.boolean(),
  modifiedAt: isoDateArb,
  syncedAt: isoDateOrNullArb,
  isDeleted: fc.boolean(),
});

/** Generates a valid BackupAnnualHoursConfig */
const arbBackupAnnualHoursConfig: fc.Arbitrary<BackupAnnualHoursConfig> = fc.record({
  id: uuidArb,
  year: fc.integer({ min: 2020, max: 2035 }),
  configuredHours: fc.integer({ min: 0, max: 3000 }),
  modifiedAt: isoDateArb,
  syncedAt: isoDateOrNullArb,
  isDeleted: fc.boolean(),
});

/** Generates a valid BackupSyncConfig */
const arbBackupSyncConfig: fc.Arbitrary<BackupSyncConfig> = fc.record({
  serverUrl: fc.webUrl(),
  apiKey: fc.string({ minLength: 10, maxLength: 64 }),
  username: fc.string({ minLength: 1, maxLength: 30 }),
  apiBasePath: fc.constantFrom('/api', '/custom/v2', '/sync'),
  syncIntervalMinutes: fc.constantFrom(5, 10, 15, 20, 25, 30, 45, 60),
  isPaused: fc.boolean(),
  lastSyncedAt: isoDateOrNullArb,
});

/** Generates a complete valid BackupFile */
const arbBackupFile: fc.Arbitrary<BackupFile> = fc.record({
  metadata: fc.record({
    createdAt: isoDateArb,
    appVersion: fc.constant('1.0.0'),
    platform: fc.constantFrom('web' as const, 'android' as const),
    schemaVersion: fc.constant(CURRENT_SCHEMA_VERSION),
  }),
  data: fc.record({
    calendarEvents: fc.array(arbBackupCalendarEvent, { minLength: 0, maxLength: 5 }),
    notificationRecords: fc.array(arbBackupNotificationRecord, { minLength: 0, maxLength: 5 }),
    annualHoursConfig: fc.array(arbBackupAnnualHoursConfig, { minLength: 0, maxLength: 3 }),
    shifts: fc.array(arbBackupShift, { minLength: 0, maxLength: 5 }),
    reminders: fc.array(arbBackupReminder, { minLength: 0, maxLength: 5 }),
    syncConfig: fc.array(arbBackupSyncConfig, { minLength: 0, maxLength: 1 }),
  }),
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('backupSerializer — Property Tests', () => {
  // Feature: gh22-backups, Property 1: Serialization Round-Trip
  describe('Property 1: Serialization Round-Trip', () => {
    it('should produce identical field values after JSON.stringify → deserializeBackup for all entity types', () => {
      fc.assert(
        fc.property(arbBackupFile, (original) => {
          const json = JSON.stringify(original);
          const deserialized = deserializeBackup(json);

          // Verify metadata
          expect(deserialized.metadata.createdAt).toBe(original.metadata.createdAt);
          expect(deserialized.metadata.appVersion).toBe(original.metadata.appVersion);
          expect(deserialized.metadata.platform).toBe(original.metadata.platform);
          expect(deserialized.metadata.schemaVersion).toBe(original.metadata.schemaVersion);

          // Verify shifts
          expect(deserialized.data.shifts).toHaveLength(original.data.shifts.length);
          for (let i = 0; i < original.data.shifts.length; i++) {
            const orig = original.data.shifts[i];
            const deser = deserialized.data.shifts[i];
            expect(deser.id).toBe(orig.id);
            expect(deser.name).toBe(orig.name);
            expect(deser.icon).toBe(orig.icon);
            expect(deser.backgroundColor).toBe(orig.backgroundColor);
            expect(deser.startTime).toBe(orig.startTime);
            expect(deser.endTime).toBe(orig.endTime);
            expect(deser.hoursWorked).toBe(orig.hoursWorked);
            expect(deser.isActive).toBe(orig.isActive);
            expect(deser.createdAt).toBe(orig.createdAt);
            expect(deser.modifiedAt).toBe(orig.modifiedAt);
            expect(deser.syncedAt).toBe(orig.syncedAt);
            expect(deser.isDeleted).toBe(orig.isDeleted);
          }

          // Verify reminders
          expect(deserialized.data.reminders).toHaveLength(original.data.reminders.length);
          for (let i = 0; i < original.data.reminders.length; i++) {
            const orig = original.data.reminders[i];
            const deser = deserialized.data.reminders[i];
            expect(deser.id).toBe(orig.id);
            expect(deser.name).toBe(orig.name);
            expect(deser.icon).toBe(orig.icon);
            expect(deser.backgroundColor).toBe(orig.backgroundColor);
            expect(deser.isActive).toBe(orig.isActive);
            expect(deser.createdAt).toBe(orig.createdAt);
            expect(deser.modifiedAt).toBe(orig.modifiedAt);
            expect(deser.syncedAt).toBe(orig.syncedAt);
            expect(deser.isDeleted).toBe(orig.isDeleted);
          }

          // Verify calendar events
          expect(deserialized.data.calendarEvents).toHaveLength(original.data.calendarEvents.length);
          for (let i = 0; i < original.data.calendarEvents.length; i++) {
            const orig = original.data.calendarEvents[i];
            const deser = deserialized.data.calendarEvents[i];
            expect(deser.id).toBe(orig.id);
            expect(deser.eventType).toBe(orig.eventType);
            expect(deser.eventTypeId).toBe(orig.eventTypeId);
            expect(deser.startDay).toBe(orig.startDay);
            expect(deser.endDay).toBe(orig.endDay);
            expect(deser.startTime).toBe(orig.startTime);
            expect(deser.endTime).toBe(orig.endTime);
            expect(deser.totalHours).toBe(orig.totalHours);
            expect(deser.notes).toBe(orig.notes);
            expect(deser.alertOffsets).toEqual(orig.alertOffsets);
            expect(deser.modifiedAt).toBe(orig.modifiedAt);
            expect(deser.syncedAt).toBe(orig.syncedAt);
            expect(deser.isDeleted).toBe(orig.isDeleted);
          }

          // Verify notification records
          expect(deserialized.data.notificationRecords).toHaveLength(
            original.data.notificationRecords.length,
          );
          for (let i = 0; i < original.data.notificationRecords.length; i++) {
            const orig = original.data.notificationRecords[i];
            const deser = deserialized.data.notificationRecords[i];
            expect(deser.id).toBe(orig.id);
            expect(deser.calendarEventId).toBe(orig.calendarEventId);
            expect(deser.alertOffset).toBe(orig.alertOffset);
            expect(deser.triggerTime).toBe(orig.triggerTime);
            expect(deser.isDelivered).toBe(orig.isDelivered);
            expect(deser.isRead).toBe(orig.isRead);
            expect(deser.modifiedAt).toBe(orig.modifiedAt);
            expect(deser.syncedAt).toBe(orig.syncedAt);
            expect(deser.isDeleted).toBe(orig.isDeleted);
          }

          // Verify annual hours config
          expect(deserialized.data.annualHoursConfig).toHaveLength(
            original.data.annualHoursConfig.length,
          );
          for (let i = 0; i < original.data.annualHoursConfig.length; i++) {
            const orig = original.data.annualHoursConfig[i];
            const deser = deserialized.data.annualHoursConfig[i];
            expect(deser.id).toBe(orig.id);
            expect(deser.year).toBe(orig.year);
            expect(deser.configuredHours).toBe(orig.configuredHours);
            expect(deser.modifiedAt).toBe(orig.modifiedAt);
            expect(deser.syncedAt).toBe(orig.syncedAt);
            expect(deser.isDeleted).toBe(orig.isDeleted);
          }

          // Verify sync config
          expect(deserialized.data.syncConfig).toHaveLength(original.data.syncConfig.length);
          for (let i = 0; i < original.data.syncConfig.length; i++) {
            const orig = original.data.syncConfig[i];
            const deser = deserialized.data.syncConfig[i];
            expect(deser.serverUrl).toBe(orig.serverUrl);
            expect(deser.apiKey).toBe(orig.apiKey);
            expect(deser.username).toBe(orig.username);
            expect(deser.apiBasePath).toBe(orig.apiBasePath);
            expect(deser.syncIntervalMinutes).toBe(orig.syncIntervalMinutes);
            expect(deser.isPaused).toBe(orig.isPaused);
            expect(deser.lastSyncedAt).toBe(orig.lastSyncedAt);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve null values for nullable fields across the round-trip', () => {
      fc.assert(
        fc.property(arbBackupFile, (original) => {
          const json = JSON.stringify(original);
          const deserialized = deserializeBackup(json);

          // Check all nullable syncedAt fields
          for (let i = 0; i < original.data.shifts.length; i++) {
            if (original.data.shifts[i].syncedAt === null) {
              expect(deserialized.data.shifts[i].syncedAt).toBeNull();
            } else {
              expect(deserialized.data.shifts[i].syncedAt).not.toBeNull();
            }
          }

          for (let i = 0; i < original.data.calendarEvents.length; i++) {
            if (original.data.calendarEvents[i].notes === null) {
              expect(deserialized.data.calendarEvents[i].notes).toBeNull();
            } else {
              expect(deserialized.data.calendarEvents[i].notes).not.toBeNull();
            }
          }

          for (let i = 0; i < original.data.syncConfig.length; i++) {
            if (original.data.syncConfig[i].lastSyncedAt === null) {
              expect(deserialized.data.syncConfig[i].lastSyncedAt).toBeNull();
            } else {
              expect(deserialized.data.syncConfig[i].lastSyncedAt).not.toBeNull();
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should handle empty entity arrays without loss', () => {
      fc.assert(
        fc.property(
          fc.record({
            metadata: fc.record({
              createdAt: isoDateArb,
              appVersion: fc.constant('1.0.0'),
              platform: fc.constantFrom('web' as const, 'android' as const),
              schemaVersion: fc.constant(CURRENT_SCHEMA_VERSION),
            }),
            data: fc.constant({
              calendarEvents: [] as BackupCalendarEvent[],
              notificationRecords: [] as BackupNotificationRecord[],
              annualHoursConfig: [] as BackupAnnualHoursConfig[],
              shifts: [] as BackupShift[],
              reminders: [] as BackupReminder[],
              syncConfig: [] as BackupSyncConfig[],
            }),
          }),
          (original) => {
            const json = JSON.stringify(original);
            const deserialized = deserializeBackup(json);

            expect(deserialized.data.calendarEvents).toHaveLength(0);
            expect(deserialized.data.notificationRecords).toHaveLength(0);
            expect(deserialized.data.annualHoursConfig).toHaveLength(0);
            expect(deserialized.data.shifts).toHaveLength(0);
            expect(deserialized.data.reminders).toHaveLength(0);
            expect(deserialized.data.syncConfig).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
