import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import type { AnnualHoursConfig } from '../models';

import { resolveConflict, batchForPush } from './annualHoursConfigSync';

/**
 * Property-based tests for the AnnualHoursConfig sync service.
 * Uses fast-check with minimum 100 iterations per property.
 */

const NUM_RUNS = 100;

/**
 * Arbitrary generator for AnnualHoursConfig records.
 */
const annualHoursConfigArb = fc.record({
  id: fc.uuid(),
  year: fc.integer({ min: 2000, max: 2100 }),
  configuredHours: fc.integer({ min: 1, max: 8784 }),
  modifiedAt: fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') }),
  syncedAt: fc.option(
    fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') }),
    { nil: null },
  ),
  isDeleted: fc.boolean(),
}) as fc.Arbitrary<AnnualHoursConfig>;

describe('annualHoursConfigSync — Property Tests (Properties 12, 14)', () => {
  /**
   * Property 12: Sync conflict resolution — last writer wins, remote on tie
   * For any two AnnualHoursConfig records with the same id, resolveConflict
   * retains the record with the later modifiedAt. If both modifiedAt values
   * are identical, the remote record is preferred.
   *
   * **Validates: Requirements 10.2**
   */
  describe('Property 12: Sync conflict resolution — last writer wins, remote on tie', () => {
    it('should retain the record with the later modifiedAt timestamp', () => {
      fc.assert(
        fc.property(
          annualHoursConfigArb,
          annualHoursConfigArb,
          (record1, record2) => {
            // Ensure records have the same id (simulating a conflict)
            const local = { ...record1 };
            const remote = { ...record2, id: local.id };

            const result = resolveConflict(local, remote);

            if (local.modifiedAt.getTime() > remote.modifiedAt.getTime()) {
              expect(result).toBe(local);
            } else if (remote.modifiedAt.getTime() > local.modifiedAt.getTime()) {
              expect(result).toBe(remote);
            } else {
              // Tie: remote wins
              expect(result).toBe(remote);
            }
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should prefer remote record when both modifiedAt timestamps are identical', () => {
      fc.assert(
        fc.property(
          annualHoursConfigArb,
          (record) => {
            const sharedDate = new Date(record.modifiedAt);
            const local = { ...record, modifiedAt: sharedDate };
            const remote = { ...record, modifiedAt: new Date(sharedDate.getTime()) };

            const result = resolveConflict(local, remote);

            expect(result).toBe(remote);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should retain local when local modifiedAt is strictly later', () => {
      fc.assert(
        fc.property(
          annualHoursConfigArb,
          fc.integer({ min: 1, max: 1000000 }),
          (record, offsetMs) => {
            const local = { ...record, modifiedAt: new Date(record.modifiedAt.getTime() + offsetMs) };
            const remote = { ...record, modifiedAt: new Date(record.modifiedAt.getTime()) };

            const result = resolveConflict(local, remote);

            expect(result).toBe(local);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });

  /**
   * Property 14: Sync push respects batch size limit
   * For any number of pending records, batchForPush produces batches where
   * each batch contains at most 100 records. All records must be included (no loss).
   *
   * **Validates: Requirements 10.1**
   */
  describe('Property 14: Sync push respects batch size limit', () => {
    it('should produce batches where each batch contains at most 100 records', () => {
      fc.assert(
        fc.property(
          fc.array(annualHoursConfigArb, { minLength: 0, maxLength: 500 }),
          (records) => {
            const batches = batchForPush(records);

            for (const batch of batches) {
              expect(batch.length).toBeLessThanOrEqual(100);
            }
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should include all records across batches (no loss)', () => {
      fc.assert(
        fc.property(
          fc.array(annualHoursConfigArb, { minLength: 0, maxLength: 500 }),
          (records) => {
            const batches = batchForPush(records);

            const totalRecordsInBatches = batches.reduce(
              (sum, batch) => sum + batch.length,
              0,
            );

            expect(totalRecordsInBatches).toBe(records.length);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should preserve record order within and across batches', () => {
      fc.assert(
        fc.property(
          fc.array(annualHoursConfigArb, { minLength: 0, maxLength: 500 }),
          (records) => {
            const batches = batchForPush(records);

            const flattened = batches.flat();

            for (let i = 0; i < records.length; i++) {
              expect(flattened[i]).toBe(records[i]);
            }
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should produce non-empty batches when records are provided', () => {
      fc.assert(
        fc.property(
          fc.array(annualHoursConfigArb, { minLength: 1, maxLength: 500 }),
          (records) => {
            const batches = batchForPush(records);

            expect(batches.length).toBeGreaterThan(0);
            for (const batch of batches) {
              expect(batch.length).toBeGreaterThan(0);
            }
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });
});
