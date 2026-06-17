import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import type { CalendarEvent } from '../models';

import {
  batchForPush,
  resolveConflict,
  mergePulledEvents,
  PUSH_BATCH_SIZE,
} from './calendarEventSync';

import type { CalendarEventSyncRecord } from './calendarEventSync';

/**
 * Arbitraries for generating CalendarEvent records with varying sync states.
 */
const dateArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime()));

const uuidArb = fc.uuid();

const dayArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString().slice(0, 10));

const eventTypeArb = fc.constantFrom('shift', 'reminder') as fc.Arbitrary<'shift' | 'reminder'>;

const notesArb = fc.option(
  fc.string({ minLength: 1, maxLength: 250, unit: 'grapheme-ascii' }),
  { nil: null },
);

/**
 * Generates a full CalendarEvent record.
 */
const calendarEventArb = (
  overrides?: Partial<Record<keyof CalendarEvent, fc.Arbitrary<unknown>>>,
): fc.Arbitrary<CalendarEvent> =>
  fc.record({
    id: (overrides?.id as fc.Arbitrary<string>) ?? uuidArb,
    eventType: (overrides?.eventType as fc.Arbitrary<'shift' | 'reminder'>) ?? eventTypeArb,
    eventTypeId: (overrides?.eventTypeId as fc.Arbitrary<string>) ?? uuidArb,
    startDay: (overrides?.startDay as fc.Arbitrary<string>) ?? dayArb,
    endDay: (overrides?.endDay as fc.Arbitrary<string>) ?? dayArb,
    startTime: (overrides?.startTime as fc.Arbitrary<number>) ?? fc.integer({ min: 0, max: 1439 }),
    endTime: (overrides?.endTime as fc.Arbitrary<number>) ?? fc.integer({ min: 0, max: 1439 }),
    totalHours: (overrides?.totalHours as fc.Arbitrary<number>) ?? fc.integer({ min: 0, max: 1440 * 31 }),
    notes: (overrides?.notes as fc.Arbitrary<string | null>) ?? notesArb,
    modifiedAt: (overrides?.modifiedAt as fc.Arbitrary<Date>) ?? dateArb,
    syncedAt: (overrides?.syncedAt as fc.Arbitrary<Date | null>) ?? fc.option(dateArb, { nil: null }),
    isDeleted: (overrides?.isDeleted as fc.Arbitrary<boolean>) ?? fc.boolean(),
  }) as unknown as fc.Arbitrary<CalendarEvent>;

/**
 * Generates a CalendarEventSyncRecord (wire DTO) for pull tests.
 */
const syncRecordArb = (
  overrides?: Partial<Record<keyof CalendarEventSyncRecord, fc.Arbitrary<unknown>>>,
): fc.Arbitrary<CalendarEventSyncRecord> =>
  fc.record({
    id: (overrides?.id as fc.Arbitrary<string>) ?? uuidArb,
    eventType: (overrides?.eventType as fc.Arbitrary<'shift' | 'reminder'>) ?? eventTypeArb,
    eventTypeId: (overrides?.eventTypeId as fc.Arbitrary<string>) ?? uuidArb,
    startDay: (overrides?.startDay as fc.Arbitrary<string>) ?? dayArb,
    endDay: (overrides?.endDay as fc.Arbitrary<string>) ?? dayArb,
    startTime: (overrides?.startTime as fc.Arbitrary<number>) ?? fc.integer({ min: 0, max: 1439 }),
    endTime: (overrides?.endTime as fc.Arbitrary<number>) ?? fc.integer({ min: 0, max: 1439 }),
    totalHours: (overrides?.totalHours as fc.Arbitrary<number>) ?? fc.integer({ min: 0, max: 1440 * 31 }),
    notes: (overrides?.notes as fc.Arbitrary<string | null>) ?? notesArb,
    modifiedAt: (overrides?.modifiedAt as fc.Arbitrary<string>) ?? dateArb.map((d) => d.toISOString()),
    isDeleted: (overrides?.isDeleted as fc.Arbitrary<boolean>) ?? fc.boolean(),
  }) as unknown as fc.Arbitrary<CalendarEventSyncRecord>;

describe('Calendar Event Sync Logic — Property Tests', () => {
  /**
   * Property 10: Sync push batches records correctly
   *
   * For any number N of pending records, batchForPush SHALL partition them into
   * batches of at most 100 each, with all records appearing exactly once across
   * all batches.
   *
   * **Validates: Requirements 10.1**
   */
  describe('Property 10: Sync push batches records correctly', () => {
    it('should create batches of no more than PUSH_BATCH_SIZE (100) records', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 0, maxLength: 350 }),
          (candidates) => {
            const batches = batchForPush(candidates);

            for (const batch of batches) {
              expect(batch.length).toBeLessThanOrEqual(PUSH_BATCH_SIZE);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve all records across batches without loss or duplication', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 0, maxLength: 350 }),
          (candidates) => {
            const batches = batchForPush(candidates);
            const flatBatches = batches.flat();

            expect(flatBatches).toHaveLength(candidates.length);

            for (let i = 0; i < candidates.length; i++) {
              expect(flatBatches[i]).toBe(candidates[i]);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce ceil(n/100) batches for n candidates', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 1, maxLength: 350 }),
          (candidates) => {
            const batches = batchForPush(candidates);
            const expectedBatchCount = Math.ceil(candidates.length / PUSH_BATCH_SIZE);
            expect(batches).toHaveLength(expectedBatchCount);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return empty array for empty input', () => {
      const batches = batchForPush([]);
      expect(batches).toHaveLength(0);
    });
  });

  /**
   * Property 11: Sync conflict resolution uses last-writer-wins with remote preference on ties
   *
   * For any local and remote CalendarEvent with the same id:
   * - If local.modifiedAt > remote.modifiedAt → local wins
   * - If remote.modifiedAt > local.modifiedAt → remote wins
   * - If local.modifiedAt === remote.modifiedAt → remote wins (tie-break)
   *
   * **Validates: Requirements 10.3, 10.6**
   */
  describe('Property 11: Sync conflict resolution uses last-writer-wins with remote preference on ties', () => {
    it('should return local when local.modifiedAt > remote.modifiedAt', () => {
      fc.assert(
        fc.property(
          calendarEventArb(),
          calendarEventArb(),
          dateArb,
          fc.integer({ min: 1, max: 86_400_000 }),
          (localBase, remoteBase, baseDate, offsetMs) => {
            const sharedId = localBase.id;
            const local: CalendarEvent = {
              ...localBase,
              id: sharedId,
              modifiedAt: new Date(baseDate.getTime() + offsetMs),
            };
            const remote: CalendarEvent = {
              ...remoteBase,
              id: sharedId,
              modifiedAt: new Date(baseDate.getTime()),
            };

            const winner = resolveConflict(local, remote);
            expect(winner).toBe(local);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return remote when remote.modifiedAt > local.modifiedAt', () => {
      fc.assert(
        fc.property(
          calendarEventArb(),
          calendarEventArb(),
          dateArb,
          fc.integer({ min: 1, max: 86_400_000 }),
          (localBase, remoteBase, baseDate, offsetMs) => {
            const sharedId = localBase.id;
            const local: CalendarEvent = {
              ...localBase,
              id: sharedId,
              modifiedAt: new Date(baseDate.getTime()),
            };
            const remote: CalendarEvent = {
              ...remoteBase,
              id: sharedId,
              modifiedAt: new Date(baseDate.getTime() + offsetMs),
            };

            const winner = resolveConflict(local, remote);
            expect(winner).toBe(remote);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return remote when modifiedAt values are equal (tie-break)', () => {
      fc.assert(
        fc.property(
          calendarEventArb(),
          calendarEventArb(),
          dateArb,
          (localBase, remoteBase, tieDate) => {
            const sharedId = localBase.id;
            const local: CalendarEvent = {
              ...localBase,
              id: sharedId,
              modifiedAt: new Date(tieDate.getTime()),
            };
            const remote: CalendarEvent = {
              ...remoteBase,
              id: sharedId,
              modifiedAt: new Date(tieDate.getTime()),
            };

            const winner = resolveConflict(local, remote);
            expect(winner).toBe(remote);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 12: Sync pull inserts new remote records
   *
   * For any remote records whose IDs don't exist locally, mergePulledEvents
   * SHALL include them in toInsert with syncedAt set to the current timestamp.
   *
   * **Validates: Requirements 10.5, 10.8**
   */
  describe('Property 12: Sync pull inserts new remote records', () => {
    it('should insert remote records whose ids do not exist locally', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 0, maxLength: 10 }),
          fc.array(syncRecordArb(), { minLength: 1, maxLength: 10 }),
          (localEvents, remoteRecords) => {
            // Ensure remote IDs don't overlap with local IDs
            const localIds = new Set(localEvents.map((e) => e.id));
            const nonOverlapping = remoteRecords.filter((r) => !localIds.has(r.id));
            fc.pre(nonOverlapping.length > 0);

            const before = new Date();
            const { toInsert } = mergePulledEvents(localEvents, nonOverlapping);

            expect(toInsert).toHaveLength(nonOverlapping.length);

            for (const inserted of toInsert) {
              expect(inserted.syncedAt).not.toBeNull();
              expect(inserted.syncedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve all remote record fields (except syncedAt) in toInsert', () => {
      fc.assert(
        fc.property(
          fc.array(syncRecordArb(), { minLength: 1, maxLength: 10 }),
          (remoteRecords) => {
            // Empty local store — all remotes are new
            const { toInsert } = mergePulledEvents([], remoteRecords);

            expect(toInsert).toHaveLength(remoteRecords.length);

            for (let i = 0; i < remoteRecords.length; i++) {
              const remote = remoteRecords[i];
              const inserted = toInsert[i];

              expect(inserted.id).toBe(remote.id);
              expect(inserted.eventType).toBe(remote.eventType);
              expect(inserted.eventTypeId).toBe(remote.eventTypeId);
              expect(inserted.startDay).toBe(remote.startDay);
              expect(inserted.endDay).toBe(remote.endDay);
              expect(inserted.startTime).toBe(remote.startTime);
              expect(inserted.endTime).toBe(remote.endTime);
              expect(inserted.totalHours).toBe(remote.totalHours);
              expect(inserted.notes).toBe(remote.notes);
              expect(inserted.isDeleted).toBe(remote.isDeleted);
              expect(inserted.syncedAt).not.toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not insert remote records that already exist locally', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 1, maxLength: 10 }),
          (events) => {
            // Create sync records with same IDs as local events
            const syncRecords: CalendarEventSyncRecord[] = events.map((e) => ({
              id: e.id,
              eventType: e.eventType,
              eventTypeId: e.eventTypeId,
              startDay: e.startDay,
              endDay: e.endDay,
              startTime: e.startTime,
              endTime: e.endTime,
              totalHours: e.totalHours,
              notes: e.notes,
              modifiedAt: e.modifiedAt.toISOString(),
              isDeleted: e.isDeleted,
            }));

            const { toInsert } = mergePulledEvents(events, syncRecords);

            // None should be in toInsert since all IDs exist locally
            expect(toInsert).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 13: Sync pull overwrites unmodified local records
   *
   * For any local record where modifiedAt <= syncedAt (no local modifications)
   * and a remote record with the same ID, mergePulledEvents SHALL include the
   * remote record in toUpdate.
   *
   * **Validates: Requirements 10.7**
   */
  describe('Property 13: Sync pull overwrites unmodified local records', () => {
    it('should overwrite local records that have not been modified since last sync', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 1, maxLength: 10 }),
          dateArb,
          (baseEvents, baseDate) => {
            // Create local records where modifiedAt <= syncedAt (unmodified)
            const localEvents = baseEvents.map((e) => ({
              ...e,
              modifiedAt: new Date(baseDate.getTime()),
              syncedAt: new Date(baseDate.getTime() + 1000),
            }));

            // Create remote records with same IDs and later modifiedAt
            const remoteRecords: CalendarEventSyncRecord[] = localEvents.map((e) => ({
              id: e.id,
              eventType: e.eventType,
              eventTypeId: e.eventTypeId,
              startDay: e.startDay,
              endDay: e.endDay,
              startTime: e.startTime,
              endTime: e.endTime,
              totalHours: e.totalHours,
              notes: e.notes,
              modifiedAt: new Date(baseDate.getTime() + 5000).toISOString(),
              isDeleted: e.isDeleted,
            }));

            const { toUpdate } = mergePulledEvents(localEvents, remoteRecords);
            expect(toUpdate).toHaveLength(localEvents.length);

            for (const updated of toUpdate) {
              expect(updated.syncedAt).not.toBeNull();
              expect(updated.syncedAt).toBeInstanceOf(Date);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should NOT overwrite local records that have been modified since last sync when local wins', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 1, maxLength: 10 }),
          dateArb,
          (baseEvents, baseDate) => {
            // Create local records where modifiedAt > syncedAt (locally modified)
            // AND local.modifiedAt is later than remote (local wins LWW)
            const localEvents = baseEvents.map((e) => ({
              ...e,
              modifiedAt: new Date(baseDate.getTime() + 10000),
              syncedAt: new Date(baseDate.getTime()),
            }));

            // Create remote records with same IDs but earlier modifiedAt (local wins)
            const remoteRecords: CalendarEventSyncRecord[] = localEvents.map((e) => ({
              id: e.id,
              eventType: e.eventType,
              eventTypeId: e.eventTypeId,
              startDay: e.startDay,
              endDay: e.endDay,
              startTime: e.startTime,
              endTime: e.endTime,
              totalHours: e.totalHours,
              notes: e.notes,
              modifiedAt: new Date(baseDate.getTime() + 5000).toISOString(),
              isDeleted: e.isDeleted,
            }));

            const { toUpdate } = mergePulledEvents(localEvents, remoteRecords);
            expect(toUpdate).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should overwrite unmodified local records even when modifiedAt equals syncedAt exactly', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 1, maxLength: 10 }),
          dateArb,
          (baseEvents, baseDate) => {
            // Create local records where modifiedAt === syncedAt (exactly at sync boundary)
            const localEvents = baseEvents.map((e) => ({
              ...e,
              modifiedAt: new Date(baseDate.getTime()),
              syncedAt: new Date(baseDate.getTime()),
            }));

            // Remote records with same IDs
            const remoteRecords: CalendarEventSyncRecord[] = localEvents.map((e) => ({
              id: e.id,
              eventType: e.eventType,
              eventTypeId: e.eventTypeId,
              startDay: e.startDay,
              endDay: e.endDay,
              startTime: e.startTime,
              endTime: e.endTime,
              totalHours: e.totalHours,
              notes: e.notes,
              modifiedAt: new Date(baseDate.getTime() + 5000).toISOString(),
              isDeleted: e.isDeleted,
            }));

            const { toUpdate } = mergePulledEvents(localEvents, remoteRecords);
            expect(toUpdate).toHaveLength(localEvents.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should set syncedAt to a recent timestamp on updated records', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 1, maxLength: 10 }),
          dateArb,
          (baseEvents, baseDate) => {
            const localEvents = baseEvents.map((e) => ({
              ...e,
              modifiedAt: new Date(baseDate.getTime()),
              syncedAt: new Date(baseDate.getTime()),
            }));

            const remoteRecords: CalendarEventSyncRecord[] = localEvents.map((e) => ({
              id: e.id,
              eventType: e.eventType,
              eventTypeId: e.eventTypeId,
              startDay: e.startDay,
              endDay: e.endDay,
              startTime: e.startTime,
              endTime: e.endTime,
              totalHours: e.totalHours,
              notes: e.notes,
              modifiedAt: new Date(baseDate.getTime() + 5000).toISOString(),
              isDeleted: e.isDeleted,
            }));

            const before = new Date();
            const { toUpdate } = mergePulledEvents(localEvents, remoteRecords);

            for (const updated of toUpdate) {
              expect(updated.syncedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
