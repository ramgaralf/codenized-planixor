import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { PREDEFINED_PALETTE } from '@features/shifts/constants';

import { getPushCandidates, resolveConflict, mergePulledShifts } from './shiftSync';

import type { Shift } from '@features/shifts/models';

/**
 * Arbitraries for generating valid Shift records.
 */
const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '⭐', '🎯'];

const validNameArb = fc
  .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);

const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);
const validBackgroundColorArb = fc.constantFrom(...PREDEFINED_PALETTE);
const validTimeArb = fc.integer({ min: 0, max: 1439 });
const validHoursWorkedArb = fc.integer({ min: 1, max: 1440 });

const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });

const shiftArb = (overrides?: Partial<Record<keyof Shift, fc.Arbitrary<unknown>>>): fc.Arbitrary<Shift> =>
  fc.record({
    id: overrides?.id ?? (fc.uuid() as fc.Arbitrary<unknown>),
    name: overrides?.name ?? (validNameArb as fc.Arbitrary<unknown>),
    icon: overrides?.icon ?? (validIconArb as fc.Arbitrary<unknown>),
    backgroundColor: overrides?.backgroundColor ?? (validBackgroundColorArb as fc.Arbitrary<unknown>),
    startTime: overrides?.startTime ?? (validTimeArb as fc.Arbitrary<unknown>),
    endTime: overrides?.endTime ?? (validTimeArb as fc.Arbitrary<unknown>),
    hoursWorked: overrides?.hoursWorked ?? (validHoursWorkedArb as fc.Arbitrary<unknown>),
    isActive: overrides?.isActive ?? (fc.boolean() as fc.Arbitrary<unknown>),
    createdAt: overrides?.createdAt ?? (dateArb as fc.Arbitrary<unknown>),
    modifiedAt: overrides?.modifiedAt ?? (dateArb as fc.Arbitrary<unknown>),
    syncedAt: overrides?.syncedAt ?? (fc.option(dateArb, { nil: null }) as fc.Arbitrary<unknown>),
    isDeleted: overrides?.isDeleted ?? (fc.boolean() as fc.Arbitrary<unknown>),
  }) as unknown as fc.Arbitrary<Shift>;

/**
 * Generates a shift that has never been synced (syncedAt = null).
 */
const neverSyncedShiftArb: fc.Arbitrary<Shift> = shiftArb({
  syncedAt: fc.constant(null) as fc.Arbitrary<unknown>,
});

/**
 * Generates a shift where modifiedAt > syncedAt (modified since last sync).
 */
const modifiedAfterSyncShiftArb: fc.Arbitrary<Shift> = fc
  .record({
    syncedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-06-01') }),
    offsetMs: fc.integer({ min: 1, max: 86_400_000 }),
  })
  .chain(({ syncedAt, offsetMs }) =>
    shiftArb({
      syncedAt: fc.constant(syncedAt) as fc.Arbitrary<unknown>,
      modifiedAt: fc.constant(new Date(syncedAt.getTime() + offsetMs)) as fc.Arbitrary<unknown>,
    }),
  );

/**
 * Generates a shift where modifiedAt <= syncedAt (already synced, no local changes).
 */
const syncedUpToDateShiftArb: fc.Arbitrary<Shift> = fc
  .record({
    modifiedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-06-01') }),
    offsetMs: fc.integer({ min: 0, max: 86_400_000 }),
  })
  .chain(({ modifiedAt, offsetMs }) =>
    shiftArb({
      modifiedAt: fc.constant(modifiedAt) as fc.Arbitrary<unknown>,
      syncedAt: fc.constant(new Date(modifiedAt.getTime() + offsetMs)) as fc.Arbitrary<unknown>,
    }),
  );

describe('Shift Sync Logic — Property Tests', () => {
  /**
   * Property 8: Sync push filter selects unsynced records
   *
   * For any collection of shifts, getPushCandidates selects exactly those
   * where syncedAt is null OR modifiedAt > syncedAt.
   *
   * **Validates: Requirements 6.1**
   */
  describe('Property 8: Sync push filter selects unsynced records', () => {
    it('should select shifts where syncedAt is null', () => {
      fc.assert(
        fc.property(
          fc.array(neverSyncedShiftArb, { minLength: 1, maxLength: 20 }),
          (shifts) => {
            const candidates = getPushCandidates(shifts);
            expect(candidates).toHaveLength(shifts.length);
            for (const candidate of candidates) {
              expect(candidate.syncedAt).toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should select shifts where modifiedAt > syncedAt', () => {
      fc.assert(
        fc.property(
          fc.array(modifiedAfterSyncShiftArb, { minLength: 1, maxLength: 20 }),
          (shifts) => {
            const candidates = getPushCandidates(shifts);
            expect(candidates).toHaveLength(shifts.length);
            for (const candidate of candidates) {
              expect(candidate.modifiedAt.getTime()).toBeGreaterThan(
                candidate.syncedAt!.getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should NOT select shifts where modifiedAt <= syncedAt', () => {
      fc.assert(
        fc.property(
          fc.array(syncedUpToDateShiftArb, { minLength: 1, maxLength: 20 }),
          (shifts) => {
            const candidates = getPushCandidates(shifts);
            expect(candidates).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should select exactly the unsynced subset from a mixed collection', () => {
      fc.assert(
        fc.property(
          fc.array(neverSyncedShiftArb, { minLength: 0, maxLength: 10 }),
          fc.array(modifiedAfterSyncShiftArb, { minLength: 0, maxLength: 10 }),
          fc.array(syncedUpToDateShiftArb, { minLength: 0, maxLength: 10 }),
          (neverSynced, modifiedAfterSync, upToDate) => {
            const allShifts = [...neverSynced, ...modifiedAfterSync, ...upToDate];
            const candidates = getPushCandidates(allShifts);

            const expectedCount = neverSynced.length + modifiedAfterSync.length;
            expect(candidates).toHaveLength(expectedCount);

            // Every candidate must satisfy the push condition
            for (const candidate of candidates) {
              const isPushable =
                candidate.syncedAt === null ||
                candidate.modifiedAt.getTime() > candidate.syncedAt.getTime();
              expect(isPushable).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 9: Conflict resolution — last writer wins with remote tie-break
   *
   * For any pair (local, remote) with same id:
   * - remote.modifiedAt > local → remote wins
   * - local.modifiedAt > remote → local wins
   * - equal → remote wins
   *
   * **Validates: Requirements 6.3**
   */
  describe('Property 9: Conflict resolution — last writer wins with remote tie-break', () => {
    it('should return remote when remote.modifiedAt > local.modifiedAt', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-06-01') }),
          fc.integer({ min: 1, max: 86_400_000 }),
          (id, localModifiedAt, offsetMs) => {
            const remoteModifiedAt = new Date(localModifiedAt.getTime() + offsetMs);

            const local: Shift = buildShift({ id, modifiedAt: localModifiedAt });
            const remote: Shift = buildShift({ id, modifiedAt: remoteModifiedAt });

            const winner = resolveConflict(local, remote);
            expect(winner).toBe(remote);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return local when local.modifiedAt > remote.modifiedAt', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-06-01') }),
          fc.integer({ min: 1, max: 86_400_000 }),
          (id, remoteModifiedAt, offsetMs) => {
            const localModifiedAt = new Date(remoteModifiedAt.getTime() + offsetMs);

            const local: Shift = buildShift({ id, modifiedAt: localModifiedAt });
            const remote: Shift = buildShift({ id, modifiedAt: remoteModifiedAt });

            const winner = resolveConflict(local, remote);
            expect(winner).toBe(local);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return remote when modifiedAt values are equal (tie-break)', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          (id, sharedModifiedAt) => {
            const local: Shift = buildShift({ id, modifiedAt: sharedModifiedAt });
            const remote: Shift = buildShift({ id, modifiedAt: new Date(sharedModifiedAt.getTime()) });

            const winner = resolveConflict(local, remote);
            expect(winner).toBe(remote);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 10: Pull merge inserts new remote records
   *
   * For any remote shift whose id does not exist in local,
   * mergePulledShifts places it in toInsert with syncedAt set to a recent timestamp.
   *
   * **Validates: Requirements 6.5**
   */
  describe('Property 10: Pull merge inserts new remote records', () => {
    it('should insert remote shifts whose ids do not exist locally', () => {
      fc.assert(
        fc.property(
          fc.array(shiftArb(), { minLength: 1, maxLength: 10 }),
          fc.array(shiftArb(), { minLength: 1, maxLength: 10 }),
          (localShifts, remoteShifts) => {
            // Ensure remote ids are distinct from local ids
            const localIds = new Set(localShifts.map((s) => s.id));
            const uniqueRemotes = remoteShifts.filter((r) => !localIds.has(r.id));
            fc.pre(uniqueRemotes.length > 0);

            const before = new Date();
            const result = mergePulledShifts(localShifts, uniqueRemotes);

            expect(result.toInsert).toHaveLength(uniqueRemotes.length);
            expect(result.toUpdate).toHaveLength(0);

            for (const inserted of result.toInsert) {
              // syncedAt must be set to a recent timestamp (not null)
              expect(inserted.syncedAt).not.toBeNull();
              expect(inserted.syncedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve all remote shift fields (except syncedAt) in toInsert', () => {
      fc.assert(
        fc.property(
          fc.array(shiftArb(), { minLength: 1, maxLength: 10 }),
          (remoteShifts) => {
            // Empty local store — all remotes are new
            const result = mergePulledShifts([], remoteShifts);

            expect(result.toInsert).toHaveLength(remoteShifts.length);

            for (let i = 0; i < remoteShifts.length; i++) {
              const remote = remoteShifts[i];
              const inserted = result.toInsert[i];

              expect(inserted.id).toBe(remote.id);
              expect(inserted.name).toBe(remote.name);
              expect(inserted.icon).toBe(remote.icon);
              expect(inserted.backgroundColor).toBe(remote.backgroundColor);
              expect(inserted.startTime).toBe(remote.startTime);
              expect(inserted.endTime).toBe(remote.endTime);
              expect(inserted.hoursWorked).toBe(remote.hoursWorked);
              expect(inserted.isActive).toBe(remote.isActive);
              expect(inserted.isDeleted).toBe(remote.isDeleted);
              expect(inserted.syncedAt).not.toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not insert remote shifts that already exist locally', () => {
      fc.assert(
        fc.property(
          fc.array(shiftArb(), { minLength: 1, maxLength: 10 }),
          (shifts) => {
            // Use the same shifts as both local and remote (same ids)
            const result = mergePulledShifts(shifts, shifts);

            // None should be in toInsert since all ids exist locally
            expect(result.toInsert).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

/**
 * Helper to build a Shift with sensible defaults and specific overrides.
 */
function buildShift(overrides: Partial<Shift>): Shift {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Shift',
    icon: overrides.icon ?? '😀',
    backgroundColor: overrides.backgroundColor ?? PREDEFINED_PALETTE[0],
    startTime: overrides.startTime ?? 480,
    endTime: overrides.endTime ?? 960,
    hoursWorked: overrides.hoursWorked ?? 480,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
    modifiedAt: overrides.modifiedAt ?? new Date('2024-06-15'),
    syncedAt: overrides.syncedAt ?? null,
    isDeleted: overrides.isDeleted ?? false,
  };
}
