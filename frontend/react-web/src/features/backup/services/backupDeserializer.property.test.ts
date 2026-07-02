import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { deserializeBackup } from './backupDeserializer';
import { CURRENT_SCHEMA_VERSION } from '../models';
import type {
  BackupAnnualHoursConfig,
  BackupCalendarEvent,
  BackupFile,
  BackupNotificationRecord,
  BackupReminder,
  BackupShift,
  BackupSyncConfig,
} from '../models';

// Feature: gh22-backups, Property 3: Forward Compatibility (Unknown Fields Ignored)

// ---------------------------------------------------------------------------
// Known field names per entity type (used to avoid collisions)
// ---------------------------------------------------------------------------

const KNOWN_SHIFT_FIELDS = [
  'id', 'name', 'icon', 'backgroundColor', 'startTime', 'endTime',
  'hoursWorked', 'isActive', 'createdAt', 'modifiedAt', 'syncedAt', 'isDeleted',
];

const KNOWN_REMINDER_FIELDS = [
  'id', 'name', 'icon', 'backgroundColor', 'isActive',
  'createdAt', 'modifiedAt', 'syncedAt', 'isDeleted',
];

const KNOWN_CALENDAR_EVENT_FIELDS = [
  'id', 'eventType', 'eventTypeId', 'startDay', 'endDay', 'startTime',
  'endTime', 'totalHours', 'notes', 'alertOffsets', 'modifiedAt', 'syncedAt', 'isDeleted',
];

const KNOWN_NOTIFICATION_RECORD_FIELDS = [
  'id', 'calendarEventId', 'alertOffset', 'triggerTime',
  'isDelivered', 'isRead', 'modifiedAt', 'syncedAt', 'isDeleted',
];

const KNOWN_ANNUAL_HOURS_CONFIG_FIELDS = [
  'id', 'year', 'configuredHours', 'modifiedAt', 'syncedAt', 'isDeleted',
];

const KNOWN_SYNC_CONFIG_FIELDS = [
  'serverUrl', 'apiKey', 'username', 'apiBasePath',
  'syncIntervalMinutes', 'isPaused', 'lastSyncedAt',
];

const KNOWN_METADATA_FIELDS = ['createdAt', 'appVersion', 'platform', 'schemaVersion'];

const ALL_KNOWN_FIELDS = new Set([
  ...KNOWN_SHIFT_FIELDS,
  ...KNOWN_REMINDER_FIELDS,
  ...KNOWN_CALENDAR_EVENT_FIELDS,
  ...KNOWN_NOTIFICATION_RECORD_FIELDS,
  ...KNOWN_ANNUAL_HOURS_CONFIG_FIELDS,
  ...KNOWN_SYNC_CONFIG_FIELDS,
  ...KNOWN_METADATA_FIELDS,
  'metadata', 'data', 'calendarEvents', 'notificationRecords',
  'annualHoursConfig', 'shifts', 'reminders', 'syncConfig',
]);

// ---------------------------------------------------------------------------
// Arbitraries for generating valid entity data
// ---------------------------------------------------------------------------

const arbIsoDate = () =>
  fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
    .map((ms) => new Date(ms).toISOString());

const arbIsoDateOrNull = () =>
  fc.option(arbIsoDate(), { nil: null });

const arbShift = (): fc.Arbitrary<BackupShift> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    icon: fc.constantFrom('🌅', '🌙', '☀️', '⭐'),
    backgroundColor: fc.constantFrom('#2563EB', '#7C3AED', '#10B981'),
    startTime: fc.integer({ min: 0, max: 1439 }),
    endTime: fc.integer({ min: 0, max: 1439 }),
    hoursWorked: fc.integer({ min: 1, max: 1440 }),
    isActive: fc.boolean(),
    createdAt: arbIsoDate(),
    modifiedAt: arbIsoDate(),
    syncedAt: arbIsoDateOrNull(),
    isDeleted: fc.boolean(),
  });

const arbReminder = (): fc.Arbitrary<BackupReminder> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    icon: fc.constantFrom('💊', '🏋️', '📞', '🎂'),
    backgroundColor: fc.constantFrom('#EF4444', '#F59E0B', '#10B981'),
    isActive: fc.boolean(),
    createdAt: arbIsoDate(),
    modifiedAt: arbIsoDate(),
    syncedAt: arbIsoDateOrNull(),
    isDeleted: fc.boolean(),
  });

const arbCalendarEvent = (): fc.Arbitrary<BackupCalendarEvent> =>
  fc.record({
    id: fc.uuid(),
    eventType: fc.constantFrom('shift', 'reminder'),
    eventTypeId: fc.uuid(),
    startDay: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      .map((ms) => new Date(ms).toISOString().slice(0, 10)),
    endDay: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      .map((ms) => new Date(ms).toISOString().slice(0, 10)),
    startTime: fc.integer({ min: 0, max: 1439 }),
    endTime: fc.integer({ min: 0, max: 1439 }),
    totalHours: fc.integer({ min: 0, max: 1440 }),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    alertOffsets: fc.array(fc.integer({ min: 0, max: 1440 }), { minLength: 0, maxLength: 5 }),
    modifiedAt: arbIsoDate(),
    syncedAt: arbIsoDateOrNull(),
    isDeleted: fc.boolean(),
  });

const arbNotificationRecord = (): fc.Arbitrary<BackupNotificationRecord> =>
  fc.record({
    id: fc.uuid(),
    calendarEventId: fc.uuid(),
    alertOffset: fc.integer({ min: 0, max: 1440 }),
    triggerTime: arbIsoDate(),
    isDelivered: fc.boolean(),
    isRead: fc.boolean(),
    modifiedAt: arbIsoDate(),
    syncedAt: arbIsoDateOrNull(),
    isDeleted: fc.boolean(),
  });

const arbAnnualHoursConfig = (): fc.Arbitrary<BackupAnnualHoursConfig> =>
  fc.record({
    id: fc.uuid(),
    year: fc.integer({ min: 2020, max: 2035 }),
    configuredHours: fc.integer({ min: 0, max: 8760 }),
    modifiedAt: arbIsoDate(),
    syncedAt: arbIsoDateOrNull(),
    isDeleted: fc.boolean(),
  });

const arbSyncConfig = (): fc.Arbitrary<BackupSyncConfig> =>
  fc.record({
    serverUrl: fc.webUrl(),
    apiKey: fc.string({ minLength: 10, maxLength: 50 }),
    username: fc.string({ minLength: 1, maxLength: 30 }),
    apiBasePath: fc.constantFrom('/api', '/api/v2', '/custom'),
    syncIntervalMinutes: fc.constantFrom(5, 10, 15, 30, 60),
    isPaused: fc.boolean(),
    lastSyncedAt: arbIsoDateOrNull(),
  });

// ---------------------------------------------------------------------------
// Arbitrary for a complete valid BackupFile as a plain object
// ---------------------------------------------------------------------------

const arbBackupFileObject = (): fc.Arbitrary<BackupFile> =>
  fc.record({
    metadata: fc.record({
      createdAt: arbIsoDate(),
      appVersion: fc.constant('1.0.0'),
      platform: fc.constantFrom('web' as const, 'android' as const),
      schemaVersion: fc.constant(CURRENT_SCHEMA_VERSION),
    }),
    data: fc.record({
      calendarEvents: fc.array(arbCalendarEvent(), { minLength: 0, maxLength: 3 }),
      notificationRecords: fc.array(arbNotificationRecord(), { minLength: 0, maxLength: 3 }),
      annualHoursConfig: fc.array(arbAnnualHoursConfig(), { minLength: 0, maxLength: 3 }),
      shifts: fc.array(arbShift(), { minLength: 0, maxLength: 3 }),
      reminders: fc.array(arbReminder(), { minLength: 0, maxLength: 3 }),
      syncConfig: fc.array(arbSyncConfig(), { minLength: 0, maxLength: 1 }),
    }),
  });

// ---------------------------------------------------------------------------
// Arbitrary for unknown field key-value pairs
// ---------------------------------------------------------------------------

const arbUnknownFieldKey = () =>
  fc.string({ minLength: 1, maxLength: 20 })
    .filter((k) => /^[a-zA-Z_]/.test(k))
    .filter((k) => !ALL_KNOWN_FIELDS.has(k));

const arbUnknownFields = () =>
  fc.array(
    fc.tuple(arbUnknownFieldKey(), fc.jsonValue()),
    { minLength: 1, maxLength: 5 },
  );

// ---------------------------------------------------------------------------
// Helper to inject unknown fields into backup object at entity level
// ---------------------------------------------------------------------------

type JsonObject = Record<string, unknown>;

const injectFieldsIntoObject = (
  obj: JsonObject,
  fields: [string, unknown][],
): JsonObject => {
  const result = { ...obj };
  for (const [key, value] of fields) {
    result[key] = value;
  }
  return result;
};

const injectFieldsIntoArray = (
  arr: JsonObject[],
  fields: [string, unknown][],
): JsonObject[] => arr.map((item) => injectFieldsIntoObject(item, fields));

const injectUnknownFields = (
  backup: BackupFile,
  unknownFields: [string, unknown][],
): JsonObject => {
  const raw = JSON.parse(JSON.stringify(backup)) as JsonObject;
  const rawMetadata = raw.metadata as JsonObject;
  const rawData = raw.data as JsonObject;

  // Inject at metadata level
  raw.metadata = injectFieldsIntoObject(rawMetadata, unknownFields);

  // Inject at top level
  for (const [key, value] of unknownFields) {
    (raw as JsonObject)[key] = value;
  }

  // Inject at each entity array level
  rawData.shifts = injectFieldsIntoArray(
    rawData.shifts as JsonObject[], unknownFields,
  );
  rawData.reminders = injectFieldsIntoArray(
    rawData.reminders as JsonObject[], unknownFields,
  );
  rawData.calendarEvents = injectFieldsIntoArray(
    rawData.calendarEvents as JsonObject[], unknownFields,
  );
  rawData.notificationRecords = injectFieldsIntoArray(
    rawData.notificationRecords as JsonObject[], unknownFields,
  );
  rawData.annualHoursConfig = injectFieldsIntoArray(
    rawData.annualHoursConfig as JsonObject[], unknownFields,
  );
  rawData.syncConfig = injectFieldsIntoArray(
    rawData.syncConfig as JsonObject[], unknownFields,
  );

  raw.data = rawData;
  return raw;
};

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 9.6, 10.4**
 *
 * Property 3: Forward Compatibility (Unknown Fields Ignored)
 *
 * For any valid backup file that also contains additional unrecognized JSON
 * fields (at any nesting level within entity objects), deserialization SHALL
 * succeed and produce entities with all recognized fields correctly populated,
 * ignoring the unknown fields without error.
 */
describe('backupDeserializer - Property 3: Forward Compatibility (Unknown Fields Ignored)', () => {
  it('should ignore unknown fields and correctly populate all recognized fields', () => {
    fc.assert(
      fc.property(
        arbBackupFileObject(),
        arbUnknownFields(),
        (backupFile, unknownFields) => {
          // Inject unknown fields at top level, metadata level, and entity level
          const modified = injectUnknownFields(backupFile, unknownFields);
          const json = JSON.stringify(modified);

          // Deserialization should succeed without throwing
          const result = deserializeBackup(json);

          // Verify metadata recognized fields match original
          expect(result.metadata.createdAt).toBe(backupFile.metadata.createdAt);
          expect(result.metadata.appVersion).toBe(backupFile.metadata.appVersion);
          expect(result.metadata.platform).toBe(backupFile.metadata.platform);
          expect(result.metadata.schemaVersion).toBe(backupFile.metadata.schemaVersion);

          // Verify shifts
          expect(result.data.shifts).toHaveLength(backupFile.data.shifts.length);
          for (let i = 0; i < backupFile.data.shifts.length; i++) {
            const expected = backupFile.data.shifts[i];
            const actual = result.data.shifts[i];
            expect(actual.id).toBe(expected.id);
            expect(actual.name).toBe(expected.name);
            expect(actual.icon).toBe(expected.icon);
            expect(actual.backgroundColor).toBe(expected.backgroundColor);
            expect(actual.startTime).toBe(expected.startTime);
            expect(actual.endTime).toBe(expected.endTime);
            expect(actual.hoursWorked).toBe(expected.hoursWorked);
            expect(actual.isActive).toBe(expected.isActive);
            expect(actual.createdAt).toBe(expected.createdAt);
            expect(actual.modifiedAt).toBe(expected.modifiedAt);
            expect(actual.syncedAt).toBe(expected.syncedAt);
            expect(actual.isDeleted).toBe(expected.isDeleted);
          }

          // Verify reminders
          expect(result.data.reminders).toHaveLength(backupFile.data.reminders.length);
          for (let i = 0; i < backupFile.data.reminders.length; i++) {
            const expected = backupFile.data.reminders[i];
            const actual = result.data.reminders[i];
            expect(actual.id).toBe(expected.id);
            expect(actual.name).toBe(expected.name);
            expect(actual.icon).toBe(expected.icon);
            expect(actual.backgroundColor).toBe(expected.backgroundColor);
            expect(actual.isActive).toBe(expected.isActive);
            expect(actual.createdAt).toBe(expected.createdAt);
            expect(actual.modifiedAt).toBe(expected.modifiedAt);
            expect(actual.syncedAt).toBe(expected.syncedAt);
            expect(actual.isDeleted).toBe(expected.isDeleted);
          }

          // Verify calendar events
          expect(result.data.calendarEvents).toHaveLength(backupFile.data.calendarEvents.length);
          for (let i = 0; i < backupFile.data.calendarEvents.length; i++) {
            const expected = backupFile.data.calendarEvents[i];
            const actual = result.data.calendarEvents[i];
            expect(actual.id).toBe(expected.id);
            expect(actual.eventType).toBe(expected.eventType);
            expect(actual.eventTypeId).toBe(expected.eventTypeId);
            expect(actual.startDay).toBe(expected.startDay);
            expect(actual.endDay).toBe(expected.endDay);
            expect(actual.startTime).toBe(expected.startTime);
            expect(actual.endTime).toBe(expected.endTime);
            expect(actual.totalHours).toBe(expected.totalHours);
            expect(actual.notes).toBe(expected.notes);
            expect(actual.alertOffsets).toEqual(expected.alertOffsets);
            expect(actual.modifiedAt).toBe(expected.modifiedAt);
            expect(actual.syncedAt).toBe(expected.syncedAt);
            expect(actual.isDeleted).toBe(expected.isDeleted);
          }

          // Verify notification records
          expect(result.data.notificationRecords).toHaveLength(backupFile.data.notificationRecords.length);
          for (let i = 0; i < backupFile.data.notificationRecords.length; i++) {
            const expected = backupFile.data.notificationRecords[i];
            const actual = result.data.notificationRecords[i];
            expect(actual.id).toBe(expected.id);
            expect(actual.calendarEventId).toBe(expected.calendarEventId);
            expect(actual.alertOffset).toBe(expected.alertOffset);
            expect(actual.triggerTime).toBe(expected.triggerTime);
            expect(actual.isDelivered).toBe(expected.isDelivered);
            expect(actual.isRead).toBe(expected.isRead);
            expect(actual.modifiedAt).toBe(expected.modifiedAt);
            expect(actual.syncedAt).toBe(expected.syncedAt);
            expect(actual.isDeleted).toBe(expected.isDeleted);
          }

          // Verify annual hours config
          expect(result.data.annualHoursConfig).toHaveLength(backupFile.data.annualHoursConfig.length);
          for (let i = 0; i < backupFile.data.annualHoursConfig.length; i++) {
            const expected = backupFile.data.annualHoursConfig[i];
            const actual = result.data.annualHoursConfig[i];
            expect(actual.id).toBe(expected.id);
            expect(actual.year).toBe(expected.year);
            expect(actual.configuredHours).toBe(expected.configuredHours);
            expect(actual.modifiedAt).toBe(expected.modifiedAt);
            expect(actual.syncedAt).toBe(expected.syncedAt);
            expect(actual.isDeleted).toBe(expected.isDeleted);
          }

          // Verify sync config
          expect(result.data.syncConfig).toHaveLength(backupFile.data.syncConfig.length);
          for (let i = 0; i < backupFile.data.syncConfig.length; i++) {
            const expected = backupFile.data.syncConfig[i];
            const actual = result.data.syncConfig[i];
            expect(actual.serverUrl).toBe(expected.serverUrl);
            expect(actual.apiKey).toBe(expected.apiKey);
            expect(actual.username).toBe(expected.username);
            expect(actual.apiBasePath).toBe(expected.apiBasePath);
            expect(actual.syncIntervalMinutes).toBe(expected.syncIntervalMinutes);
            expect(actual.isPaused).toBe(expected.isPaused);
            expect(actual.lastSyncedAt).toBe(expected.lastSyncedAt);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
