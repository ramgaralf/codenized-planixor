import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { PREDEFINED_PALETTE } from '@features/reminders/constants';

import {
  getPushCandidates,
  batchForPush,
  resolveConflict,
  mergePulledReminders,
  PUSH_BATCH_SIZE,
} from './reminderSync';

import type { Reminder } from '@features/reminders/models';

/**
 * Arbitraries for generating Reminder records with varying sync states.
 */
const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '⭐', '🎯'];

const validNameArb = fc
  .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);

const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);

const validBackgroundColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter((d) => !isNaN(d.getTime()));

const uuidArb = fc.uuid();

/**
 * Generates a full Reminder record with configurable sync state.
 */
const reminderArb = (overrides?: Partial<Record<string, fc.Arbitrary<unknown>>>): fc.Arbitrary<Reminder> =>
  fc.record({
    id: (overrides?.['id'] as fc.Arbitrary<string>) ?? uuidArb,
    name: validNameArb,
    icon: validIconArb,
    backgroundColor: validBackgroundColorArb,
    isActive: fc.boolean(),
    createdAt: dateArb,
    modifiedAt: dateArb,
    syncedAt: fc.option(dateArb, { nil: null }),
    isDeleted: fc.boolean(),
  }) as fc.Arbitrary<Reminder>;

/**
 * Generates a reminder that is a push candidate:
 * syncedAt is null OR modifiedAt > syncedAt.
 */
const pushCandidateArb: fc.Arbitrary<Reminder> = fc.oneof(
  // Case 1: syncedAt is null (never synced)
  reminderArb().map((r) => ({ ...r, syncedAt: null })),
  // Case 2: modifiedAt > syncedAt
  fc.record({
    id: uuidArb,
    name: validNameArb,
    icon: validIconArb,
    backgroundColor: validBackgroundColorArb,
    isActive: fc.boolean(),
    createdAt: dateArb,
    modifiedAt: dateArb,
    syncedAt: dateArb,
    isDeleted: fc.boolean(),
  }).filter((r) => r.modifiedAt.getTime() > r.syncedAt.getTime()) as fc.Arbitrary<Reminder>,
);

/**
 * Generates a reminder that is NOT a push candidate:
 * syncedAt is not null AND modifiedAt <= syncedAt.
 */
const nonPushCandidateArb: fc.Arbitrary<Reminder> = fc
  .record({
    id: uuidArb,
    name: validNameArb,
    icon: validIconArb,
    backgroundColor: validBackgroundColorArb,
    isActive: fc.boolean(),
    createdAt: dateArb,
    modifiedAt: dateArb,
    syncedAt: dateArb,
    isDeleted: fc.boolean(),
  })
  .filter((r) => r.modifiedAt.getTime() <= r.syncedAt.getTime()) as fc.Arbitrary<Reminder>;

describe('reminderSync — Property Tests', () => {
  /**
   * Property 11: Push sync selects correct records and respects batch size
   *
   * For any collection of reminder records with varying modifiedAt and syncedAt values,
   * getPushCandidates selects exactly those records where syncedAt is null or
   * modifiedAt > syncedAt. batchForPush creates batches of no more than 100 records.
   *
   * **Validates: Requirements 6.1, 6.3, 6.5**
   */
  describe('Property 11: Push sync selects correct records and respects batch size', () => {
    it('should select records where syncedAt is null', () => {
      fc.assert(
        fc.property(
          fc.array(reminderArb().map((r) => ({ ...r, syncedAt: null })), { minLength: 1, maxLength: 20 }),
          (reminders) => {
            const candidates = getPushCandidates(reminders);
            expect(candidates).toHaveLength(reminders.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should select records where modifiedAt > syncedAt', () => {
      fc.assert(
        fc.property(
          fc.array(pushCandidateArb, { minLength: 1, maxLength: 20 }),
          (reminders) => {
            const candidates = getPushCandidates(reminders);
            expect(candidates).toHaveLength(reminders.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should exclude records where modifiedAt <= syncedAt', () => {
      fc.assert(
        fc.property(
          fc.array(nonPushCandidateArb, { minLength: 1, maxLength: 20 }),
          (reminders) => {
            const candidates = getPushCandidates(reminders);
            expect(candidates).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should correctly partition a mixed list of candidates and non-candidates', () => {
      fc.assert(
        fc.property(
          fc.array(pushCandidateArb, { minLength: 0, maxLength: 10 }),
          fc.array(nonPushCandidateArb, { minLength: 0, maxLength: 10 }),
          (candidates, nonCandidates) => {
            const all = [...candidates, ...nonCandidates];
            const result = getPushCandidates(all);
            expect(result).toHaveLength(candidates.length);

            const resultIds = new Set(result.map((r) => r.id));
            for (const c of candidates) {
              expect(resultIds.has(c.id)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should create batches of no more than PUSH_BATCH_SIZE records', () => {
      fc.assert(
        fc.property(
          fc.array(pushCandidateArb, { minLength: 0, maxLength: 350 }),
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
          fc.array(pushCandidateArb, { minLength: 0, maxLength: 350 }),
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
          fc.array(pushCandidateArb, { minLength: 1, maxLength: 350 }),
          (candidates) => {
            const batches = batchForPush(candidates);
            const expectedBatchCount = Math.ceil(candidates.length / PUSH_BATCH_SIZE);
            expect(batches).toHaveLength(expectedBatchCount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 12: Conflict resolution applies last-writer-wins with remote tie-break
   *
   * For any pair of local and remote reminder records with the same id,
   * resolveConflict returns the record with the later modifiedAt timestamp.
   * If both modifiedAt timestamps are identical, the remote record is returned.
   *
   * **Validates: Requirements 6.1, 6.3, 6.5**
   */
  describe('Property 12: Conflict resolution applies last-writer-wins with remote tie-break', () => {
    it('should return local when local.modifiedAt > remote.modifiedAt', () => {
      fc.assert(
        fc.property(
          reminderArb(),
          reminderArb(),
          dateArb,
          (local, remote, baseDate) => {
            const sharedId = local.id;
            const localRecord = {
              ...local,
              id: sharedId,
              modifiedAt: new Date(baseDate.getTime() + 1000),
            };
            const remoteRecord = {
              ...remote,
              id: sharedId,
              modifiedAt: new Date(baseDate.getTime()),
            };

            const winner = resolveConflict(localRecord, remoteRecord);
            expect(winner).toBe(localRecord);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return remote when remote.modifiedAt > local.modifiedAt', () => {
      fc.assert(
        fc.property(
          reminderArb(),
          reminderArb(),
          dateArb,
          (local, remote, baseDate) => {
            const sharedId = local.id;
            const localRecord = {
              ...local,
              id: sharedId,
              modifiedAt: new Date(baseDate.getTime()),
            };
            const remoteRecord = {
              ...remote,
              id: sharedId,
              modifiedAt: new Date(baseDate.getTime() + 1000),
            };

            const winner = resolveConflict(localRecord, remoteRecord);
            expect(winner).toBe(remoteRecord);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return remote when both modifiedAt timestamps are identical (tie-break)', () => {
      fc.assert(
        fc.property(
          reminderArb(),
          reminderArb(),
          dateArb,
          (local, remote, tieDate) => {
            const sharedId = local.id;
            const localRecord = {
              ...local,
              id: sharedId,
              modifiedAt: new Date(tieDate.getTime()),
            };
            const remoteRecord = {
              ...remote,
              id: sharedId,
              modifiedAt: new Date(tieDate.getTime()),
            };

            const winner = resolveConflict(localRecord, remoteRecord);
            expect(winner).toBe(remoteRecord);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 13: Pull merge inserts new and overwrites unmodified locals
   *
   * For any set of pulled remote records and a local collection:
   * - If a pulled record does not exist locally, it goes into toInsert with syncedAt set to now
   * - If it exists locally and remote wins conflict resolution, it goes into toUpdate with syncedAt set to now
   *
   * **Validates: Requirements 6.1, 6.3, 6.5**
   */
  describe('Property 13: Pull merge inserts new and overwrites unmodified locals', () => {
    it('should insert all remote records that do not exist locally', () => {
      fc.assert(
        fc.property(
          fc.array(reminderArb(), { minLength: 1, maxLength: 10 }),
          fc.array(reminderArb(), { minLength: 1, maxLength: 10 }),
          (localReminders, remoteReminders) => {
            // Ensure remote IDs do not overlap with local IDs
            const localIds = new Set(localReminders.map((r) => r.id));
            const nonOverlapping = remoteReminders.filter((r) => !localIds.has(r.id));

            if (nonOverlapping.length === 0) return;

            const { toInsert } = mergePulledReminders(localReminders, nonOverlapping);
            expect(toInsert).toHaveLength(nonOverlapping.length);

            for (const inserted of toInsert) {
              expect(inserted.syncedAt).not.toBeNull();
              expect(inserted.syncedAt).toBeInstanceOf(Date);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should place into toUpdate when remote wins conflict for existing local records', () => {
      fc.assert(
        fc.property(
          fc.array(reminderArb(), { minLength: 1, maxLength: 10 }),
          dateArb,
          (baseReminders, baseDate) => {
            // Create local records with older modifiedAt
            const localReminders = baseReminders.map((r) => ({
              ...r,
              modifiedAt: new Date(baseDate.getTime()),
              syncedAt: new Date(baseDate.getTime()),
            }));

            // Create remote records with same IDs but later modifiedAt (remote wins)
            const remoteReminders = localReminders.map((r) => ({
              ...r,
              modifiedAt: new Date(baseDate.getTime() + 5000),
            }));

            const { toUpdate } = mergePulledReminders(localReminders, remoteReminders);
            expect(toUpdate).toHaveLength(remoteReminders.length);

            for (const updated of toUpdate) {
              expect(updated.syncedAt).not.toBeNull();
              expect(updated.syncedAt).toBeInstanceOf(Date);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should NOT place into toUpdate when local wins conflict', () => {
      fc.assert(
        fc.property(
          fc.array(reminderArb(), { minLength: 1, maxLength: 10 }),
          dateArb,
          (baseReminders, baseDate) => {
            // Create local records with later modifiedAt (local wins)
            const localReminders = baseReminders.map((r) => ({
              ...r,
              modifiedAt: new Date(baseDate.getTime() + 5000),
              syncedAt: new Date(baseDate.getTime()),
            }));

            // Create remote records with same IDs but older modifiedAt
            const remoteReminders = localReminders.map((r) => ({
              ...r,
              modifiedAt: new Date(baseDate.getTime()),
            }));

            const { toUpdate } = mergePulledReminders(localReminders, remoteReminders);
            expect(toUpdate).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should set syncedAt to a recent timestamp on inserted records', () => {
      fc.assert(
        fc.property(
          fc.array(reminderArb(), { minLength: 1, maxLength: 10 }),
          (remoteReminders) => {
            const before = new Date();
            const { toInsert } = mergePulledReminders([], remoteReminders);

            expect(toInsert).toHaveLength(remoteReminders.length);
            for (const inserted of toInsert) {
              expect(inserted.syncedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should set syncedAt to a recent timestamp on updated records', () => {
      fc.assert(
        fc.property(
          fc.array(reminderArb(), { minLength: 1, maxLength: 10 }),
          dateArb,
          (baseReminders, baseDate) => {
            const localReminders = baseReminders.map((r) => ({
              ...r,
              modifiedAt: new Date(baseDate.getTime()),
              syncedAt: new Date(baseDate.getTime()),
            }));

            const remoteReminders = localReminders.map((r) => ({
              ...r,
              modifiedAt: new Date(baseDate.getTime() + 5000),
            }));

            const before = new Date();
            const { toUpdate } = mergePulledReminders(localReminders, remoteReminders);

            for (const updated of toUpdate) {
              expect(updated.syncedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle a mixed collection with new and existing records', () => {
      fc.assert(
        fc.property(
          fc.array(reminderArb(), { minLength: 1, maxLength: 5 }),
          fc.array(reminderArb(), { minLength: 1, maxLength: 5 }),
          dateArb,
          (localBase, remoteNewBase, baseDate) => {
            // Local records that remote will try to overwrite (remote wins)
            const localReminders = localBase.map((r) => ({
              ...r,
              modifiedAt: new Date(baseDate.getTime()),
              syncedAt: new Date(baseDate.getTime()),
            }));

            // Remote versions of existing records (later modifiedAt → wins)
            const remoteExisting = localReminders.map((r) => ({
              ...r,
              modifiedAt: new Date(baseDate.getTime() + 5000),
            }));

            // Remote records with IDs not in local
            const localIds = new Set(localReminders.map((r) => r.id));
            const remoteNew = remoteNewBase.filter((r) => !localIds.has(r.id));

            const allRemote = [...remoteExisting, ...remoteNew];

            const { toInsert, toUpdate } = mergePulledReminders(localReminders, allRemote);
            expect(toInsert).toHaveLength(remoteNew.length);
            expect(toUpdate).toHaveLength(remoteExisting.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
