import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';
import { PREDEFINED_PALETTE } from '@features/shifts/constants';

import { create, getAll, update, softDelete, deactivate, activate } from './shiftService';

import type { CreateShiftInput } from './shiftService';

/**
 * Arbitraries for generating valid shift inputs.
 */
const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '⭐', '🎯'];

const validNameArb = fc
  .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);

const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);

const validBackgroundColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

const validStartTimeArb = fc.integer({ min: 0, max: 1439 });

const validEndTimeArb = fc.integer({ min: 0, max: 1439 });

const validHoursWorkedArb = fc.integer({ min: 1, max: 1440 });

const validCreateInputArb: fc.Arbitrary<CreateShiftInput> = fc.record({
  name: validNameArb,
  icon: validIconArb,
  backgroundColor: validBackgroundColorArb,
  startTime: validStartTimeArb,
  endTime: validEndTimeArb,
  hoursWorked: validHoursWorkedArb,
});

/**
 * UUID v4 regex pattern for validation.
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('shiftService — Property Tests', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.shifts.clear();
  });

  /**
   * Property 1: Shift creation persists correct system fields
   *
   * For any valid create input, resulting shift has UUID id, modifiedAt >= before,
   * syncedAt = null, isDeleted = false, isActive = true, all fields preserved.
   *
   * **Validates: Requirements 1.1, 4.7**
   */
  describe('Property 1: Shift creation persists correct system fields', () => {
    it('should generate a valid UUID v4 as id', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);
          expect(shift.id).toMatch(UUID_V4_REGEX);
        }),
        { numRuns: 100 },
      );
    });

    it('should set modifiedAt to a timestamp no earlier than before creation', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const before = new Date();
          const shift = await create(input);
          expect(shift.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        }),
        { numRuns: 100 },
      );
    });

    it('should set syncedAt to null', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);
          expect(shift.syncedAt).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('should set isDeleted to false', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);
          expect(shift.isDeleted).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('should set isActive to true', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);
          expect(shift.isActive).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve all user-provided field values exactly', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);
          expect(shift.name).toBe(input.name);
          expect(shift.icon).toBe(input.icon);
          expect(shift.backgroundColor).toBe(input.backgroundColor);
          expect(shift.startTime).toBe(input.startTime);
          expect(shift.endTime).toBe(input.endTime);
          expect(shift.hoursWorked).toBe(input.hoursWorked);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: Shift listing filter and ordering
   *
   * For any collection of shifts with mixed isDeleted values,
   * getAll returns only non-deleted ordered by createdAt ASC.
   *
   * **Validates: Requirements 2.1, 5.4**
   */
  describe('Property 4: Shift listing filter and ordering', () => {
    it('should return only non-deleted shifts ordered by createdAt ASC', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              input: validCreateInputArb,
              shouldDelete: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          async (shiftSpecs) => {
            // Clear the table between iterations
            await db.shifts.clear();

            // Create shifts sequentially
            const createdShifts = [];
            for (const spec of shiftSpecs) {
              const shift = await create(spec.input);
              createdShifts.push({ shift, shouldDelete: spec.shouldDelete });
            }

            // Soft-delete the ones marked for deletion
            for (const { shift, shouldDelete } of createdShifts) {
              if (shouldDelete) {
                await softDelete(shift.id);
              }
            }

            // Get all non-deleted shifts
            const result = await getAll();

            // Should only contain non-deleted shifts
            const expectedNonDeleted = createdShifts.filter((s) => !s.shouldDelete);
            expect(result).toHaveLength(expectedNonDeleted.length);

            // Every returned shift should be non-deleted
            for (const s of result) {
              expect(s.isDeleted).toBe(false);
            }

            // No deleted shift should appear in the result
            const deletedIds = new Set(
              createdShifts.filter((s) => s.shouldDelete).map((s) => s.shift.id),
            );
            for (const s of result) {
              expect(deletedIds.has(s.id)).toBe(false);
            }

            // Should be ordered by createdAt ASC
            for (let i = 1; i < result.length; i++) {
              expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
                result[i - 1].createdAt.getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  /**
   * Property 5: Shift update preserves identity fields
   *
   * For any existing shift + valid modifications, update preserves
   * id/syncedAt/isDeleted, sets modifiedAt >= before.
   *
   * **Validates: Requirements 3.2**
   */
  describe('Property 5: Shift update preserves identity fields', () => {
    it('should preserve id, syncedAt, and isDeleted after update', async () => {
      await fc.assert(
        fc.asyncProperty(
          validCreateInputArb,
          fc.record({
            name: validNameArb,
            icon: validIconArb,
            backgroundColor: validBackgroundColorArb,
            startTime: validStartTimeArb,
            endTime: validEndTimeArb,
            hoursWorked: validHoursWorkedArb,
          }),
          async (createInput, updateData) => {
            const original = await create(createInput);

            const before = new Date();
            await update(original.id, updateData);

            const updated = await db.shifts.get(original.id);
            expect(updated).toBeDefined();
            expect(updated!.id).toBe(original.id);
            expect(updated!.syncedAt).toEqual(original.syncedAt);
            expect(updated!.isDeleted).toBe(original.isDeleted);
            expect(updated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should persist all new field values after update', async () => {
      await fc.assert(
        fc.asyncProperty(
          validCreateInputArb,
          fc.record({
            name: validNameArb,
            icon: validIconArb,
            backgroundColor: validBackgroundColorArb,
            startTime: validStartTimeArb,
            endTime: validEndTimeArb,
            hoursWorked: validHoursWorkedArb,
          }),
          async (createInput, updateData) => {
            const original = await create(createInput);

            await update(original.id, updateData);

            const updated = await db.shifts.get(original.id);
            expect(updated).toBeDefined();
            expect(updated!.name).toBe(updateData.name);
            expect(updated!.icon).toBe(updateData.icon);
            expect(updated!.backgroundColor).toBe(updateData.backgroundColor);
            expect(updated!.startTime).toBe(updateData.startTime);
            expect(updated!.endTime).toBe(updateData.endTime);
            expect(updated!.hoursWorked).toBe(updateData.hoursWorked);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Toggle active status
   *
   * For any shift, deactivate sets isActive=false and activate sets isActive=true,
   * both update modifiedAt.
   *
   * **Validates: Requirements 4.2, 4.5**
   */
  describe('Property 6: Toggle active status', () => {
    it('should set isActive to false and update modifiedAt on deactivate', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);
          expect(shift.isActive).toBe(true);

          const before = new Date();
          await deactivate(shift.id);

          const deactivated = await db.shifts.get(shift.id);
          expect(deactivated).toBeDefined();
          expect(deactivated!.isActive).toBe(false);
          expect(deactivated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        }),
        { numRuns: 100 },
      );
    });

    it('should set isActive to true and update modifiedAt on activate', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);

          // First deactivate
          await deactivate(shift.id);
          const deactivated = await db.shifts.get(shift.id);
          expect(deactivated!.isActive).toBe(false);

          // Now activate
          const before = new Date();
          await activate(shift.id);

          const activated = await db.shifts.get(shift.id);
          expect(activated).toBeDefined();
          expect(activated!.isActive).toBe(true);
          expect(activated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        }),
        { numRuns: 100 },
      );
    });

    it('should not modify other fields when toggling active status', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);

          await deactivate(shift.id);
          const deactivated = await db.shifts.get(shift.id);

          expect(deactivated!.id).toBe(shift.id);
          expect(deactivated!.name).toBe(shift.name);
          expect(deactivated!.icon).toBe(shift.icon);
          expect(deactivated!.backgroundColor).toBe(shift.backgroundColor);
          expect(deactivated!.startTime).toBe(shift.startTime);
          expect(deactivated!.endTime).toBe(shift.endTime);
          expect(deactivated!.hoursWorked).toBe(shift.hoursWorked);
          expect(deactivated!.syncedAt).toEqual(shift.syncedAt);
          expect(deactivated!.isDeleted).toBe(shift.isDeleted);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: Soft delete sets correct flags
   *
   * For any shift, softDelete sets isDeleted=true, syncedAt=null,
   * modifiedAt >= before.
   *
   * **Validates: Requirements 5.2**
   */
  describe('Property 7: Soft delete sets correct flags', () => {
    it('should set isDeleted to true and syncedAt to null', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);

          await softDelete(shift.id);

          const deleted = await db.shifts.get(shift.id);
          expect(deleted).toBeDefined();
          expect(deleted!.isDeleted).toBe(true);
          expect(deleted!.syncedAt).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('should update modifiedAt to a timestamp no earlier than before deletion', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);

          const before = new Date();
          await softDelete(shift.id);

          const deleted = await db.shifts.get(shift.id);
          expect(deleted).toBeDefined();
          expect(deleted!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        }),
        { numRuns: 100 },
      );
    });

    it('should not modify id or content fields', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const shift = await create(input);

          await softDelete(shift.id);

          const deleted = await db.shifts.get(shift.id);
          expect(deleted).toBeDefined();
          expect(deleted!.id).toBe(shift.id);
          expect(deleted!.name).toBe(shift.name);
          expect(deleted!.icon).toBe(shift.icon);
          expect(deleted!.backgroundColor).toBe(shift.backgroundColor);
          expect(deleted!.startTime).toBe(shift.startTime);
          expect(deleted!.endTime).toBe(shift.endTime);
          expect(deleted!.hoursWorked).toBe(shift.hoursWorked);
          expect(deleted!.isActive).toBe(shift.isActive);
        }),
        { numRuns: 100 },
      );
    });
  });
});
