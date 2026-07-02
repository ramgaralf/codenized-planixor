import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import type { CalendarEvent } from '@features/calendar-events/models';

import {
  toSyncRecord,
  fromSyncRecord,
} from '@features/calendar-events/services/calendarEventSync';

import { ALERT_OFFSETS, isValidAlertOffsets } from '../types';

import type { NotificationRecord, AlertOffset } from '../types';

import {
  getPushCandidates,
  batchForPush,
  mergePulledRecords,
  resolveConflict,
  PUSH_BATCH_SIZE,
} from './notificationSync';

import type { NotificationRecordSyncRecord } from './notificationSync';

/**
 * Property-based tests for alertOffsets persistence, sync round-trip, validation,
 * push candidate identification, and sync merge with LWW conflict resolution.
 *
 * Feature: gh12-notifications, Property 4: alertOffsets persistence round-trip
 * Feature: gh12-notifications, Property 15: alertOffsets validation
 * Feature: gh12-notifications, Property 18: Push candidate identification
 * Feature: gh12-notifications, Property 19: Sync merge with LWW conflict resolution
 *
 * Uses fast-check with minimum 100 iterations per property.
 */

/** All valid alert offset values as a mutable array */
const VALID_OFFSETS: AlertOffset[] = [0, 10, 60, 1440];

/**
 * Generates a valid alertOffsets array: 0–4 unique elements from {0, 10, 60, 1440}.
 */
const validAlertOffsetsArb: fc.Arbitrary<number[]> = fc
  .subarray([...VALID_OFFSETS], { minLength: 0, maxLength: 4 })
  .map((arr) => [...new Set(arr)]);

/**
 * Generates a CalendarEvent with a given alertOffsets array.
 */
const calendarEventWithAlertsArb = (
  alertOffsetsArb: fc.Arbitrary<number[]>,
): fc.Arbitrary<CalendarEvent> =>
  fc.record({
    id: fc.uuid(),
    eventType: fc.constantFrom('shift', 'reminder') as fc.Arbitrary<'shift' | 'reminder'>,
    eventTypeId: fc.uuid(),
    startDay: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
      .filter((d) => !isNaN(d.getTime()))
      .map((d) => d.toISOString().slice(0, 10)),
    endDay: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
      .filter((d) => !isNaN(d.getTime()))
      .map((d) => d.toISOString().slice(0, 10)),
    startTime: fc.integer({ min: 0, max: 1439 }),
    endTime: fc.integer({ min: 0, max: 1439 }),
    totalHours: fc.integer({ min: 0, max: 1440 * 31 }),
    notes: fc.option(
      fc.string({ minLength: 1, maxLength: 250, unit: 'grapheme-ascii' }),
      { nil: null },
    ),
    alertOffsets: alertOffsetsArb,
    modifiedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
      .filter((d) => !isNaN(d.getTime())),
    syncedAt: fc.option(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .filter((d) => !isNaN(d.getTime())),
      { nil: null },
    ),
    isDeleted: fc.boolean(),
  }) as unknown as fc.Arbitrary<CalendarEvent>;

describe('Notification Sync — Property Tests', () => {
  /**
   * Property 4: alertOffsets persistence round-trip
   *
   * For any valid alertOffsets array (0–4 elements from {0, 10, 60, 1440}),
   * saving and reading back SHALL produce an identical array.
   * When serialized for sync and deserialized, the array SHALL be equivalent.
   *
   * **Validates: Requirements 1.7, 8.6, 10.6**
   */
  describe('Feature: gh12-notifications, Property 4: alertOffsets persistence round-trip', () => {
    it('toSyncRecord → fromSyncRecord round-trip preserves alertOffsets for any valid array', () => {
      fc.assert(
        fc.property(
          calendarEventWithAlertsArb(validAlertOffsetsArb),
          (event) => {
            // Serialize to sync record (simulates push to API)
            const syncRecord = toSyncRecord(event);

            // Deserialize back (simulates pull from API)
            const restored = fromSyncRecord(syncRecord, new Date());

            // alertOffsets should be preserved exactly
            expect(restored.alertOffsets).toEqual(event.alertOffsets);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('round-trip preserves empty alertOffsets array', () => {
      fc.assert(
        fc.property(
          calendarEventWithAlertsArb(fc.constant([])),
          (event) => {
            const syncRecord = toSyncRecord(event);
            const restored = fromSyncRecord(syncRecord, new Date());

            expect(restored.alertOffsets).toEqual([]);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('round-trip preserves all single-element alertOffsets combinations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OFFSETS.map((o) => [o])),
          fc.uuid(),
          (alertOffsets, id) => {
            const event: CalendarEvent = {
              id,
              eventType: 'reminder',
              eventTypeId: crypto.randomUUID(),
              startDay: '2025-06-15',
              endDay: '2025-06-15',
              startTime: 600,
              endTime: 660,
              totalHours: 60,
              notes: null,
              alertOffsets,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
            };

            const syncRecord = toSyncRecord(event);
            const restored = fromSyncRecord(syncRecord, new Date());

            expect(restored.alertOffsets).toEqual(alertOffsets);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('round-trip preserves maximum size (4 elements) alertOffsets', () => {
      fc.assert(
        fc.property(
          fc.shuffledSubarray([...VALID_OFFSETS], { minLength: 4, maxLength: 4 }),
          fc.uuid(),
          (alertOffsets, id) => {
            const event: CalendarEvent = {
              id,
              eventType: 'shift',
              eventTypeId: crypto.randomUUID(),
              startDay: '2025-06-15',
              endDay: '2025-06-15',
              startTime: 480,
              endTime: 960,
              totalHours: 480,
              notes: null,
              alertOffsets,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
            };

            const syncRecord = toSyncRecord(event);
            const restored = fromSyncRecord(syncRecord, new Date());

            // Preserved element-by-element (order matters)
            expect(restored.alertOffsets).toEqual(alertOffsets);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('sync record alertOffsets field is a plain number array (JSON-serializable)', () => {
      fc.assert(
        fc.property(
          calendarEventWithAlertsArb(validAlertOffsetsArb),
          (event) => {
            const syncRecord = toSyncRecord(event);

            // The wire format should be a plain array of numbers
            expect(Array.isArray(syncRecord.alertOffsets)).toBe(true);

            if (syncRecord.alertOffsets) {
              for (const offset of syncRecord.alertOffsets) {
                expect(typeof offset).toBe('number');
              }
            }

            // JSON round-trip should also preserve
            const jsonStr = JSON.stringify(syncRecord);
            const parsed = JSON.parse(jsonStr);
            const restoredFromJson = fromSyncRecord(parsed, new Date());

            expect(restoredFromJson.alertOffsets).toEqual(event.alertOffsets);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('fromSyncRecord treats undefined alertOffsets as empty array', () => {
      fc.assert(
        fc.property(
          calendarEventWithAlertsArb(validAlertOffsetsArb),
          (event) => {
            const syncRecord = toSyncRecord(event);

            // Simulate a pull response where alertOffsets is missing (undefined)
            const withoutAlerts = { ...syncRecord };
            delete (withoutAlerts as Record<string, unknown>).alertOffsets;

            const restored = fromSyncRecord(withoutAlerts, new Date());

            expect(restored.alertOffsets).toEqual([]);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 15: alertOffsets validation
   *
   * For any alertOffsets value, it SHALL be accepted if and only if it is an array
   * of 0–4 elements where each element is one of {0, 10, 60, 1440} with no duplicate values.
   *
   * **Validates: Requirements 8.6**
   */
  describe('Feature: gh12-notifications, Property 15: alertOffsets validation', () => {
    it('accepts any valid subset of {0, 10, 60, 1440} with 0–4 elements', () => {
      fc.assert(
        fc.property(validAlertOffsetsArb, (alertOffsets) => {
          expect(isValidAlertOffsets(alertOffsets)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects arrays with more than 4 elements', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(0, 10, 60, 1440), { minLength: 5, maxLength: 10 }),
          (tooManyOffsets) => {
            expect(isValidAlertOffsets(tooManyOffsets)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects arrays containing values not in {0, 10, 60, 1440}', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 10000 }).filter(
            (n) => !ALERT_OFFSETS.includes(n as AlertOffset),
          ),
          (invalidOffset) => {
            // An array containing at least one invalid offset should fail validation
            expect(isValidAlertOffsets([invalidOffset])).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects arrays with duplicate values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_OFFSETS),
          (duplicateValue) => {
            // Array with one valid value repeated twice → has duplicates
            expect(isValidAlertOffsets([duplicateValue, duplicateValue])).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects non-array values', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.object(),
          ),
          (nonArray) => {
            expect(isValidAlertOffsets(nonArray)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects arrays containing non-number elements even if values would be valid numbers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('0', '10', '60', '1440', true, false, null, undefined),
          (invalidElement) => {
            expect(isValidAlertOffsets([invalidElement])).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('accepts empty array', () => {
      expect(isValidAlertOffsets([])).toBe(true);
    });

    it('a valid array accepted by isValidAlertOffsets has unique elements from {0,10,60,1440} and length 0–4', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -100, max: 2000 }), { minLength: 0, maxLength: 6 }),
          (randomArray) => {
            const result = isValidAlertOffsets(randomArray);

            // Check that validation matches the expected criteria
            const validSet = new Set(ALERT_OFFSETS as readonly number[]);
            const allValidValues = randomArray.every((v) => validSet.has(v));
            const noDuplicates = new Set(randomArray).size === randomArray.length;
            const validLength = randomArray.length <= 4;

            const expectedResult = allValidValues && noDuplicates && validLength;

            expect(result).toBe(expectedResult);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});


// --- Arbitraries for Property 18 & 19 ---

const dateArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2035-12-31') })
  .filter((d) => !isNaN(d.getTime()));

const alertOffsetArb = fc.constantFrom(0, 10, 60, 1440);

/**
 * Generates a NotificationRecord with configurable sync state.
 */
const notificationRecordArb = (
  overrides?: Partial<Record<keyof NotificationRecord, fc.Arbitrary<unknown>>>,
): fc.Arbitrary<NotificationRecord> =>
  fc.record({
    id: (overrides?.id as fc.Arbitrary<string>) ?? fc.uuid(),
    calendarEventId: (overrides?.calendarEventId as fc.Arbitrary<string>) ?? fc.uuid(),
    alertOffset: (overrides?.alertOffset as fc.Arbitrary<number>) ?? alertOffsetArb,
    triggerTime: (overrides?.triggerTime as fc.Arbitrary<Date>) ?? dateArb,
    isDelivered: (overrides?.isDelivered as fc.Arbitrary<boolean>) ?? fc.boolean(),
    isRead: (overrides?.isRead as fc.Arbitrary<boolean>) ?? fc.boolean(),
    modifiedAt: (overrides?.modifiedAt as fc.Arbitrary<Date>) ?? dateArb,
    syncedAt: (overrides?.syncedAt as fc.Arbitrary<Date | null>) ?? fc.option(dateArb, { nil: null }),
    isDeleted: (overrides?.isDeleted as fc.Arbitrary<boolean>) ?? fc.boolean(),
  }) as unknown as fc.Arbitrary<NotificationRecord>;

/**
 * Generates a record that is a push candidate:
 * Either syncedAt is null, or modifiedAt > syncedAt.
 */
const pushCandidateRecordArb: fc.Arbitrary<NotificationRecord> = fc.oneof(
  // Case 1: syncedAt is null (never synced)
  notificationRecordArb({ syncedAt: fc.constant(null) }),
  // Case 2: modifiedAt > syncedAt (modified since last sync)
  // Use a slightly earlier max for syncedAt to ensure modifiedAt can always be after it
  fc.date({ min: new Date('2020-01-01'), max: new Date('2035-12-30') })
    .filter((d) => !isNaN(d.getTime()))
    .chain((syncedAt) =>
      notificationRecordArb({
        syncedAt: fc.constant(syncedAt),
        modifiedAt: fc.date({ min: new Date(syncedAt.getTime() + 1), max: new Date('2035-12-31') })
          .filter((d) => !isNaN(d.getTime())),
      }),
    ),
);

/**
 * Generates a record that is NOT a push candidate:
 * syncedAt is not null AND modifiedAt <= syncedAt.
 */
const nonPushCandidateRecordArb: fc.Arbitrary<NotificationRecord> = dateArb.chain((modifiedAt) =>
  notificationRecordArb({
    modifiedAt: fc.constant(modifiedAt),
    syncedAt: fc.date({ min: modifiedAt, max: new Date('2035-12-31') })
      .filter((d) => !isNaN(d.getTime())),
  }),
);

/**
 * Generates a NotificationRecordSyncRecord (wire DTO) for pull tests.
 */
const syncRecordDtoArb = (
  overrides?: Partial<Record<keyof NotificationRecordSyncRecord, fc.Arbitrary<unknown>>>,
): fc.Arbitrary<NotificationRecordSyncRecord> =>
  fc.record({
    id: (overrides?.id as fc.Arbitrary<string>) ?? fc.uuid(),
    calendarEventId: (overrides?.calendarEventId as fc.Arbitrary<string>) ?? fc.uuid(),
    alertOffset: (overrides?.alertOffset as fc.Arbitrary<number>) ?? alertOffsetArb,
    triggerTime: (overrides?.triggerTime as fc.Arbitrary<string>) ?? dateArb.map((d) => d.toISOString()),
    isDelivered: (overrides?.isDelivered as fc.Arbitrary<boolean>) ?? fc.boolean(),
    isRead: (overrides?.isRead as fc.Arbitrary<boolean>) ?? fc.boolean(),
    modifiedAt: (overrides?.modifiedAt as fc.Arbitrary<string>) ?? dateArb.map((d) => d.toISOString()),
    isDeleted: (overrides?.isDeleted as fc.Arbitrary<boolean>) ?? fc.boolean(),
  }) as unknown as fc.Arbitrary<NotificationRecordSyncRecord>;

describe('Notification Sync Logic — Property Tests (Push & Merge)', () => {
  /**
   * Property 18: Push candidate identification
   *
   * For any set of NotificationRecords, the sync push candidates SHALL be exactly
   * those records where syncedAt is null OR modifiedAt > syncedAt, batched into
   * groups of at most 100 records per request.
   *
   * **Validates: Requirements 10.1, 10.3**
   */
  describe('Feature: gh12-notifications, Property 18: Push candidate identification', () => {
    it('records with syncedAt === null are always push candidates', () => {
      fc.assert(
        fc.property(
          fc.array(notificationRecordArb({ syncedAt: fc.constant(null) }), { minLength: 1, maxLength: 50 }),
          (records) => {
            const candidates = getPushCandidates(records);

            for (const record of records) {
              expect(candidates.some((c) => c.id === record.id)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('records with modifiedAt > syncedAt are push candidates', () => {
      fc.assert(
        fc.property(
          fc.array(pushCandidateRecordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            const candidates = getPushCandidates(records);

            for (const record of records) {
              expect(candidates.some((c) => c.id === record.id)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('records with modifiedAt <= syncedAt are NOT push candidates', () => {
      fc.assert(
        fc.property(
          fc.array(nonPushCandidateRecordArb, { minLength: 1, maxLength: 50 }),
          (records) => {
            const candidates = getPushCandidates(records);

            expect(candidates.length).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('getPushCandidates returns exactly the correct subset from a mixed set', () => {
      fc.assert(
        fc.property(
          fc.array(pushCandidateRecordArb, { minLength: 0, maxLength: 30 }),
          fc.array(nonPushCandidateRecordArb, { minLength: 0, maxLength: 30 }),
          (candidateRecords, nonCandidateRecords) => {
            const allRecords = [...candidateRecords, ...nonCandidateRecords];
            const candidates = getPushCandidates(allRecords);

            // All candidate records should be included
            for (const record of candidateRecords) {
              expect(candidates.some((c) => c.id === record.id)).toBe(true);
            }

            // No non-candidate records should be included
            for (const record of nonCandidateRecords) {
              expect(candidates.some((c) => c.id === record.id)).toBe(false);
            }

            // Count matches
            expect(candidates.length).toBe(candidateRecords.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('batchForPush produces batches of at most PUSH_BATCH_SIZE (100) records', () => {
      fc.assert(
        fc.property(
          fc.array(notificationRecordArb(), { minLength: 1, maxLength: 350 }),
          (candidates) => {
            const batches = batchForPush(candidates);

            for (const batch of batches) {
              expect(batch.length).toBeGreaterThan(0);
              expect(batch.length).toBeLessThanOrEqual(PUSH_BATCH_SIZE);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('batchForPush preserves all records across batches (no loss, no duplication)', () => {
      fc.assert(
        fc.property(
          fc.array(notificationRecordArb(), { minLength: 0, maxLength: 350 }),
          (candidates) => {
            const batches = batchForPush(candidates);

            // Total count equals input count
            const totalBatched = batches.reduce((sum, batch) => sum + batch.length, 0);
            expect(totalBatched).toBe(candidates.length);

            // Flattened batches equal the original array (preserves order)
            const flattened = batches.flat();
            expect(flattened).toEqual(candidates);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('batchForPush returns empty array for empty input', () => {
      const batches = batchForPush([]);
      expect(batches).toEqual([]);
    });

    it('batchForPush creates ceil(N/100) batches for N records', () => {
      fc.assert(
        fc.property(
          fc.array(notificationRecordArb(), { minLength: 1, maxLength: 350 }),
          (candidates) => {
            const batches = batchForPush(candidates);
            const expectedBatchCount = Math.ceil(candidates.length / PUSH_BATCH_SIZE);

            expect(batches.length).toBe(expectedBatchCount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 19: Sync merge with LWW conflict resolution
   *
   * For any pulled remote NotificationRecord:
   * (a) if no local record with the same ID exists, it SHALL be inserted;
   * (b) if local modifiedAt <= syncedAt (unmodified), the remote SHALL overwrite;
   * (c) if conflict (local modifiedAt > syncedAt), the record with later modifiedAt wins,
   *     remote wins on tie;
   * (d) if remote isDeleted=true, local isDeleted SHALL be set to true.
   *
   * **Validates: Requirements 10.1, 10.4, 10.5**
   */
  describe('Feature: gh12-notifications, Property 19: Sync merge with LWW conflict resolution', () => {
    it('(a) remote records with no local match are inserted', () => {
      fc.assert(
        fc.property(
          fc.array(syncRecordDtoArb(), { minLength: 1, maxLength: 50 }),
          (remoteRecords) => {
            // Empty local store — all remote records should be inserted
            const { toInsert, toUpdate } = mergePulledRecords([], remoteRecords);

            expect(toInsert.length).toBe(remoteRecords.length);
            expect(toUpdate.length).toBe(0);

            // Verify each inserted record has the correct id
            for (const remote of remoteRecords) {
              expect(toInsert.some((r) => r.id === remote.id)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('(b) unmodified local records (modifiedAt <= syncedAt) are overwritten by remote', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(fc.uuid(), dateArb, syncRecordDtoArb()).map(
              ([id, syncedAt, remoteSyncRecord]) => {
                // Ensure modifiedAt <= syncedAt for the local record
                const modifiedAt = new Date(syncedAt.getTime() - 1000);
                const localRecord: NotificationRecord = {
                  id,
                  calendarEventId: 'event-1',
                  alertOffset: 10,
                  triggerTime: new Date('2030-01-01T00:00:00Z'),
                  isDelivered: false,
                  isRead: false,
                  modifiedAt,
                  syncedAt,
                  isDeleted: false,
                };
                const remoteRecord: NotificationRecordSyncRecord = {
                  ...remoteSyncRecord,
                  id, // Same ID as local
                };
                return { localRecord, remoteRecord };
              },
            ),
            { minLength: 1, maxLength: 30 },
          ),
          (pairs) => {
            const localRecords = pairs.map((p) => p.localRecord);
            const remoteRecords = pairs.map((p) => p.remoteRecord);

            const { toInsert, toUpdate } = mergePulledRecords(localRecords, remoteRecords);

            // All should be updates, none inserts (local records exist)
            expect(toInsert.length).toBe(0);
            expect(toUpdate.length).toBe(pairs.length);

            // Each updated record should match the remote's id
            for (const pair of pairs) {
              expect(toUpdate.some((r) => r.id === pair.remoteRecord.id)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('(c) conflict resolution: record with later modifiedAt wins, remote wins on tie', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          dateArb,
          dateArb,
          (id, date1, date2) => {
            const localModifiedAt = date1;
            const remoteModifiedAt = date2;

            const localRecord: NotificationRecord = {
              id,
              calendarEventId: 'event-1',
              alertOffset: 10,
              triggerTime: new Date('2030-01-01T00:00:00Z'),
              isDelivered: false,
              isRead: false,
              modifiedAt: localModifiedAt,
              syncedAt: new Date('2020-01-01T00:00:00Z'),
              isDeleted: false,
            };

            const remoteRecord: NotificationRecord = {
              id,
              calendarEventId: 'event-1',
              alertOffset: 10,
              triggerTime: new Date('2030-01-01T00:00:00Z'),
              isDelivered: true,
              isRead: true,
              modifiedAt: remoteModifiedAt,
              syncedAt: new Date(),
              isDeleted: false,
            };

            const winner = resolveConflict(localRecord, remoteRecord);

            if (localModifiedAt.getTime() > remoteModifiedAt.getTime()) {
              // Local wins when it has later modifiedAt
              expect(winner).toBe(localRecord);
            } else {
              // Remote wins when it has later modifiedAt OR on tie
              expect(winner).toBe(remoteRecord);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('(c) conflict with local modifications: mergePulledRecords applies LWW correctly', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          dateArb,
          dateArb,
          (id, localModifiedAt, remoteModifiedAt) => {
            // Local has modifications: modifiedAt > syncedAt
            // Use a very old syncedAt so modifiedAt > syncedAt is guaranteed
            const syncedAt = new Date('2019-01-01T00:00:00Z');

            const localRecord: NotificationRecord = {
              id,
              calendarEventId: 'event-1',
              alertOffset: 10,
              triggerTime: new Date('2030-01-01T00:00:00Z'),
              isDelivered: false,
              isRead: false,
              modifiedAt: localModifiedAt,
              syncedAt,
              isDeleted: false,
            };

            const remoteDto: NotificationRecordSyncRecord = {
              id,
              calendarEventId: 'event-1',
              alertOffset: 10,
              triggerTime: '2030-01-01T00:00:00.000Z',
              isDelivered: true,
              isRead: true,
              modifiedAt: remoteModifiedAt.toISOString(),
              isDeleted: false,
            };

            const { toInsert, toUpdate } = mergePulledRecords([localRecord], [remoteDto]);

            expect(toInsert.length).toBe(0);

            if (localModifiedAt.getTime() > remoteModifiedAt.getTime()) {
              // Local wins — no update
              expect(toUpdate.length).toBe(0);
            } else {
              // Remote wins (later modifiedAt or tie) — update applied
              expect(toUpdate.length).toBe(1);
              expect(toUpdate[0].id).toBe(id);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('(d) remote isDeleted=true propagates deletion to local (unmodified records)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(fc.uuid(), dateArb).map(([id, modifiedAt]) => ({
              localRecord: {
                id,
                calendarEventId: 'event-1',
                alertOffset: 10,
                triggerTime: new Date('2030-01-01T00:00:00Z'),
                isDelivered: false,
                isRead: false,
                modifiedAt: new Date('2020-01-01T00:00:00Z'),
                syncedAt: new Date('2021-01-01T00:00:00Z'), // modifiedAt <= syncedAt (unmodified)
                isDeleted: false,
              } as NotificationRecord,
              remoteRecord: {
                id,
                calendarEventId: 'event-1',
                alertOffset: 10,
                triggerTime: '2030-01-01T00:00:00.000Z',
                isDelivered: false,
                isRead: false,
                modifiedAt: modifiedAt.toISOString(),
                isDeleted: true, // remote marks as deleted
              } as NotificationRecordSyncRecord,
            })),
            { minLength: 1, maxLength: 30 },
          ),
          (pairs) => {
            const localRecords = pairs.map((p) => p.localRecord);
            const remoteRecords = pairs.map((p) => p.remoteRecord);

            const { toInsert, toUpdate } = mergePulledRecords(localRecords, remoteRecords);

            expect(toInsert.length).toBe(0);
            expect(toUpdate.length).toBe(pairs.length);

            // All updated records should have isDeleted=true
            for (const updated of toUpdate) {
              expect(updated.isDeleted).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('(d) remote isDeleted=true is preserved when inserted as new record', () => {
      fc.assert(
        fc.property(
          fc.array(
            syncRecordDtoArb({ isDeleted: fc.constant(true) }),
            { minLength: 1, maxLength: 30 },
          ),
          (remoteRecords) => {
            // No local records — all remotes are new inserts
            const { toInsert, toUpdate } = mergePulledRecords([], remoteRecords);

            expect(toInsert.length).toBe(remoteRecords.length);
            expect(toUpdate.length).toBe(0);

            // All inserted records should preserve isDeleted=true
            for (const inserted of toInsert) {
              expect(inserted.isDeleted).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('mixed scenario: correct insert/update classification for varied local states', () => {
      fc.assert(
        fc.property(
          // Records with no local match (will be inserted)
          fc.array(syncRecordDtoArb(), { minLength: 0, maxLength: 20 }),
          // Records with unmodified local match (will be overwritten)
          fc.array(
            fc.tuple(fc.uuid(), dateArb).map(([id, syncedAt]) => ({
              localRecord: {
                id,
                calendarEventId: 'event-1',
                alertOffset: 10,
                triggerTime: new Date('2030-01-01T00:00:00Z'),
                isDelivered: false,
                isRead: false,
                modifiedAt: new Date(syncedAt.getTime() - 1000), // modifiedAt < syncedAt
                syncedAt,
                isDeleted: false,
              } as NotificationRecord,
              remoteRecord: {
                id,
                calendarEventId: 'event-1',
                alertOffset: 60,
                triggerTime: '2030-01-01T00:00:00.000Z',
                isDelivered: true,
                isRead: true,
                modifiedAt: new Date().toISOString(),
                isDeleted: false,
              } as NotificationRecordSyncRecord,
            })),
            { minLength: 0, maxLength: 20 },
          ),
          (newRemoteRecords, overwritePairs) => {
            const localRecords = overwritePairs.map((p) => p.localRecord);
            const remoteRecords = [
              ...newRemoteRecords,
              ...overwritePairs.map((p) => p.remoteRecord),
            ];

            const { toInsert, toUpdate } = mergePulledRecords(localRecords, remoteRecords);

            // New remote records should be inserted
            expect(toInsert.length).toBe(newRemoteRecords.length);

            // Overwrite pairs should be updated
            expect(toUpdate.length).toBe(overwritePairs.length);

            // Verify inserted IDs
            for (const remote of newRemoteRecords) {
              expect(toInsert.some((r) => r.id === remote.id)).toBe(true);
            }

            // Verify updated IDs
            for (const pair of overwritePairs) {
              expect(toUpdate.some((r) => r.id === pair.remoteRecord.id)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('inserted records have syncedAt set (not null)', () => {
      fc.assert(
        fc.property(
          fc.array(syncRecordDtoArb(), { minLength: 1, maxLength: 30 }),
          (remoteRecords) => {
            const { toInsert } = mergePulledRecords([], remoteRecords);

            for (const record of toInsert) {
              expect(record.syncedAt).not.toBeNull();
              expect(record.syncedAt).toBeInstanceOf(Date);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
