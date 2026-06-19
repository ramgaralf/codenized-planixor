import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';

import { validateAnnualConfig } from './useAnnualConfig';

/**
 * Property-based tests for the AnnualHoursConfig store (Properties 7, 8, 13).
 * Uses fast-check with minimum 100 iterations per property.
 */

const NUM_RUNS = 100;

/**
 * Helper to invoke hook functions outside React context.
 * Since useAnnualConfig uses useCallback internally, we test the underlying
 * logic directly via the exported `validateAnnualConfig` and by calling the
 * hook's functions. For the DB operations, we replicate the hook's save logic
 * directly against the db since the hook's callbacks are pure wrappers.
 */

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MIN_HOURS = 1;
const MAX_HOURS = 8784;

/** Arbitrary for valid year values */
const validYearArb = fc.integer({ min: MIN_YEAR, max: MAX_YEAR });

/** Arbitrary for valid configuredHours values */
const validHoursArb = fc.integer({ min: MIN_HOURS, max: MAX_HOURS });

/**
 * Replicates the save logic from useAnnualConfig hook for testing purposes.
 * This avoids needing to render a React component just to call the hook.
 */
const save = async (year: number, configuredHours: number): Promise<void> => {
  const validation = validateAnnualConfig(year, configuredHours);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const now = new Date();

  const existing = await db.annualHoursConfig
    .where('year')
    .equals(year)
    .filter((r) => r.isDeleted === false)
    .first();

  if (existing) {
    await db.annualHoursConfig.update(existing.id, {
      configuredHours,
      modifiedAt: now,
      syncedAt: null,
    });
  } else {
    await db.annualHoursConfig.add({
      id: crypto.randomUUID(),
      year,
      configuredHours,
      modifiedAt: now,
      syncedAt: null,
      isDeleted: false,
    });
  }
};

describe('useAnnualConfig — Property Tests (Properties 7, 8, 13)', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.annualHoursConfig.clear();
  });

  /**
   * Property 7: Annual config uniqueness — one non-deleted record per year
   *
   * At most one non-deleted record per year value at any point in time.
   * After any sequence of save operations for the same year, querying the store
   * must return at most one non-deleted record for that year.
   *
   * **Validates: Requirements 9.2**
   */
  describe('Property 7: Annual config uniqueness — one non-deleted record per year', () => {
    it('should have at most one non-deleted record per year after multiple saves to the same year', async () => {
      await fc.assert(
        fc.asyncProperty(
          validYearArb,
          fc.array(validHoursArb, { minLength: 1, maxLength: 10 }),
          async (year, hoursSequence) => {
            await db.annualHoursConfig.clear();

            // Perform multiple saves to the same year
            for (const hours of hoursSequence) {
              await save(year, hours);
            }

            // Query all non-deleted records for this year
            const records = await db.annualHoursConfig
              .where('year')
              .equals(year)
              .filter((r) => r.isDeleted === false)
              .toArray();

            expect(records.length).toBeLessThanOrEqual(1);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should have at most one non-deleted record per year after saves to different years', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              year: validYearArb,
              configuredHours: validHoursArb,
            }),
            { minLength: 1, maxLength: 10 },
          ),
          async (operations) => {
            await db.annualHoursConfig.clear();

            for (const op of operations) {
              await save(op.year, op.configuredHours);
            }

            // For each distinct year, there should be at most one non-deleted record
            const distinctYears = [...new Set(operations.map((op) => op.year))];

            for (const year of distinctYears) {
              const records = await db.annualHoursConfig
                .where('year')
                .equals(year)
                .filter((r) => r.isDeleted === false)
                .toArray();

              expect(records.length).toBeLessThanOrEqual(1);
            }
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should preserve the same id when updating an existing year config', async () => {
      await fc.assert(
        fc.asyncProperty(
          validYearArb,
          validHoursArb,
          validHoursArb,
          async (year, hours1, hours2) => {
            await db.annualHoursConfig.clear();

            await save(year, hours1);
            const firstRecord = await db.annualHoursConfig
              .where('year')
              .equals(year)
              .filter((r) => r.isDeleted === false)
              .first();

            await save(year, hours2);
            const secondRecord = await db.annualHoursConfig
              .where('year')
              .equals(year)
              .filter((r) => r.isDeleted === false)
              .first();

            expect(firstRecord).toBeDefined();
            expect(secondRecord).toBeDefined();
            expect(secondRecord!.id).toBe(firstRecord!.id);
            expect(secondRecord!.configuredHours).toBe(hours2);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });

  /**
   * Property 8: Validation rejects out-of-range year or configuredHours
   *
   * For year outside [2000, 2100] or configuredHours outside [1, 8784],
   * validateAnnualConfig returns { valid: false }.
   *
   * **Validates: Requirements 8.11, 9.6**
   */
  describe('Property 8: Validation rejects out-of-range year or configuredHours', () => {
    it('should reject year below 2000', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000, max: MIN_YEAR - 1 }),
          validHoursArb,
          (year, hours) => {
            const result = validateAnnualConfig(year, hours);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should reject year above 2100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MAX_YEAR + 1, max: 100000 }),
          validHoursArb,
          (year, hours) => {
            const result = validateAnnualConfig(year, hours);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should reject configuredHours below 1', () => {
      fc.assert(
        fc.property(
          validYearArb,
          fc.integer({ min: -10000, max: MIN_HOURS - 1 }),
          (year, hours) => {
            const result = validateAnnualConfig(year, hours);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should reject configuredHours above 8784', () => {
      fc.assert(
        fc.property(
          validYearArb,
          fc.integer({ min: MAX_HOURS + 1, max: 100000 }),
          (year, hours) => {
            const result = validateAnnualConfig(year, hours);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should reject non-integer year values', () => {
      fc.assert(
        fc.property(
          fc.double({ min: MIN_YEAR, max: MAX_YEAR, noNaN: true }).filter(
            (v) => !Number.isInteger(v),
          ),
          validHoursArb,
          (year, hours) => {
            const result = validateAnnualConfig(year, hours);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should reject non-integer configuredHours values', () => {
      fc.assert(
        fc.property(
          validYearArb,
          fc.double({ min: MIN_HOURS, max: MAX_HOURS, noNaN: true }).filter(
            (v) => !Number.isInteger(v),
          ),
          (year, hours) => {
            const result = validateAnnualConfig(year, hours);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should accept valid year and configuredHours', () => {
      fc.assert(
        fc.property(validYearArb, validHoursArb, (year, hours) => {
          const result = validateAnnualConfig(year, hours);
          expect(result.valid).toBe(true);
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it('should reject save and leave store unchanged for invalid inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer({ min: -10000, max: MIN_YEAR - 1 }),
            fc.integer({ min: MAX_YEAR + 1, max: 100000 }),
          ),
          fc.oneof(
            fc.integer({ min: -10000, max: MIN_HOURS - 1 }),
            fc.integer({ min: MAX_HOURS + 1, max: 100000 }),
          ),
          async (invalidYear, invalidHours) => {
            await db.annualHoursConfig.clear();

            // Try to save with invalid year
            await expect(save(invalidYear, MIN_HOURS)).rejects.toThrow();

            // Try to save with invalid hours
            await expect(save(MIN_YEAR, invalidHours)).rejects.toThrow();

            // Store should remain empty
            const count = await db.annualHoursConfig.count();
            expect(count).toBe(0);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });

  /**
   * Property 13: Config save sets modifiedAt to current UTC and clears syncedAt
   *
   * After save, the resulting record has modifiedAt approximately current time
   * and syncedAt is null.
   *
   * **Validates: Requirements 9.4**
   */
  describe('Property 13: Config save sets modifiedAt to current UTC and clears syncedAt', () => {
    it('should set modifiedAt to approximately current time on create', async () => {
      await fc.assert(
        fc.asyncProperty(validYearArb, validHoursArb, async (year, hours) => {
          await db.annualHoursConfig.clear();

          const before = Date.now();
          await save(year, hours);
          const after = Date.now();

          const record = await db.annualHoursConfig
            .where('year')
            .equals(year)
            .filter((r) => r.isDeleted === false)
            .first();

          expect(record).toBeDefined();
          expect(record!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before);
          expect(record!.modifiedAt.getTime()).toBeLessThanOrEqual(after);
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it('should set syncedAt to null on create', async () => {
      await fc.assert(
        fc.asyncProperty(validYearArb, validHoursArb, async (year, hours) => {
          await db.annualHoursConfig.clear();

          await save(year, hours);

          const record = await db.annualHoursConfig
            .where('year')
            .equals(year)
            .filter((r) => r.isDeleted === false)
            .first();

          expect(record).toBeDefined();
          expect(record!.syncedAt).toBeNull();
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it('should set modifiedAt to approximately current time on update', async () => {
      await fc.assert(
        fc.asyncProperty(
          validYearArb,
          validHoursArb,
          validHoursArb,
          async (year, hours1, hours2) => {
            await db.annualHoursConfig.clear();

            // Create initial record
            await save(year, hours1);

            // Simulate a synced state by manually setting syncedAt
            const initial = await db.annualHoursConfig
              .where('year')
              .equals(year)
              .filter((r) => r.isDeleted === false)
              .first();
            if (initial) {
              await db.annualHoursConfig.update(initial.id, {
                syncedAt: new Date(),
              });
            }

            // Now update
            const before = Date.now();
            await save(year, hours2);
            const after = Date.now();

            const record = await db.annualHoursConfig
              .where('year')
              .equals(year)
              .filter((r) => r.isDeleted === false)
              .first();

            expect(record).toBeDefined();
            expect(record!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before);
            expect(record!.modifiedAt.getTime()).toBeLessThanOrEqual(after);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });

    it('should clear syncedAt to null on update (even if previously synced)', async () => {
      await fc.assert(
        fc.asyncProperty(
          validYearArb,
          validHoursArb,
          validHoursArb,
          async (year, hours1, hours2) => {
            await db.annualHoursConfig.clear();

            // Create initial record
            await save(year, hours1);

            // Simulate a synced state
            const initial = await db.annualHoursConfig
              .where('year')
              .equals(year)
              .filter((r) => r.isDeleted === false)
              .first();
            if (initial) {
              await db.annualHoursConfig.update(initial.id, {
                syncedAt: new Date(),
              });
            }

            // Verify syncedAt was set
            const synced = await db.annualHoursConfig
              .where('year')
              .equals(year)
              .filter((r) => r.isDeleted === false)
              .first();
            expect(synced!.syncedAt).not.toBeNull();

            // Update again — should clear syncedAt
            await save(year, hours2);

            const record = await db.annualHoursConfig
              .where('year')
              .equals(year)
              .filter((r) => r.isDeleted === false)
              .first();

            expect(record).toBeDefined();
            expect(record!.syncedAt).toBeNull();
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });
});
