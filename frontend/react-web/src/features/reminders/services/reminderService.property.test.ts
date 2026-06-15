import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';
import { PREDEFINED_PALETTE } from '@features/reminders/constants';

import { create, getAll, update, softDelete, deactivate, activate } from './reminderService';

import type { CreateReminderInput } from './reminderService';

/**
 * Arbitraries for generating valid reminder inputs.
 */
const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '⭐', '🎯'];

const validNameArb = fc
  .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);

const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);

const validBackgroundColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

const validCreateInputArb: fc.Arbitrary<CreateReminderInput> = fc.record({
  name: validNameArb,
  icon: validIconArb,
  backgroundColor: validBackgroundColorArb,
});

/**
 * UUID v4 regex pattern for validation.
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('reminderService — Property Tests', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.reminders.clear();
  });

  /**
   * Property 1: Creation produces a valid reminder record
   *
   * For any valid reminder input, creating a reminder produces a record where:
   * id is a valid UUID, isActive=true, modifiedAt is recent, syncedAt=null,
   * isDeleted=false, and all user-provided field values are preserved exactly.
   *
   * **Validates: Requirements 1.1, 4.7**
   */
  describe('Property 1: Creation produces a valid reminder record', () => {
    it('should generate a valid UUID v4 as id', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const reminder = await create(input);
          expect(reminder.id).toMatch(UUID_V4_REGEX);
        }),
        { numRuns: 100 },
      );
    });

    it('should set isActive to true', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const reminder = await create(input);
          expect(reminder.isActive).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should set syncedAt to null', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const reminder = await create(input);
          expect(reminder.syncedAt).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('should set isDeleted to false', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const reminder = await create(input);
          expect(reminder.isDeleted).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('should set modifiedAt to a timestamp no earlier than before creation', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const before = new Date();
          const reminder = await create(input);
          expect(reminder.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve all user-provided field values exactly', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const reminder = await create(input);
          expect(reminder.name).toBe(input.name);
          expect(reminder.icon).toBe(input.icon);
          expect(reminder.backgroundColor).toBe(input.backgroundColor);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 3: Display excludes deleted and orders by creation date
   *
   * For any collection of reminder records with varying isDeleted and createdAt values,
   * getAll() returns only records where isDeleted=false, ordered by createdAt ASC.
   *
   * **Validates: Requirements 2.1, 5.4**
   */
  describe('Property 3: Display excludes deleted and orders by creation date', () => {
    it('should return only non-deleted reminders ordered by createdAt ASC', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              input: validCreateInputArb,
              shouldDelete: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          async (reminderSpecs) => {
            await db.reminders.clear();

            const createdReminders = [];
            for (const spec of reminderSpecs) {
              const reminder = await create(spec.input);
              createdReminders.push({ reminder, shouldDelete: spec.shouldDelete });
            }

            for (const { reminder, shouldDelete } of createdReminders) {
              if (shouldDelete) {
                await softDelete(reminder.id);
              }
            }

            const result = await getAll();

            const expectedNonDeleted = createdReminders.filter((s) => !s.shouldDelete);
            expect(result).toHaveLength(expectedNonDeleted.length);

            for (const r of result) {
              expect(r.isDeleted).toBe(false);
            }

            const deletedIds = new Set(
              createdReminders.filter((s) => s.shouldDelete).map((s) => s.reminder.id),
            );
            for (const r of result) {
              expect(deletedIds.has(r.id)).toBe(false);
            }

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
   * Property 6: Edit preserves system fields and updates modifiedAt
   *
   * For any existing reminder and any valid set of new field values, submitting
   * an edit preserves id, syncedAt, isDeleted, updates modifiedAt, and sets
   * user fields to the new values.
   *
   * **Validates: Requirements 3.2**
   */
  describe('Property 6: Edit preserves system fields and updates modifiedAt', () => {
    it('should preserve id, syncedAt, and isDeleted after update', async () => {
      await fc.assert(
        fc.asyncProperty(
          validCreateInputArb,
          fc.record({
            name: validNameArb,
            icon: validIconArb,
            backgroundColor: validBackgroundColorArb,
          }),
          async (createInput, updateData) => {
            const original = await create(createInput);

            const before = new Date();
            await update(original.id, updateData);

            const updated = await db.reminders.get(original.id);
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
          }),
          async (createInput, updateData) => {
            const original = await create(createInput);

            await update(original.id, updateData);

            const updated = await db.reminders.get(original.id);
            expect(updated).toBeDefined();
            expect(updated!.name).toBe(updateData.name);
            expect(updated!.icon).toBe(updateData.icon);
            expect(updated!.backgroundColor).toBe(updateData.backgroundColor);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: Toggle active state updates isActive and modifiedAt
   *
   * For any reminder record, toggling the active state flips isActive
   * and updates modifiedAt, while preserving all other fields unchanged.
   *
   * **Validates: Requirements 4.2, 4.5**
   */
  describe('Property 7: Toggle active state updates isActive and modifiedAt', () => {
    it('should set isActive to false and update modifiedAt on deactivate', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const reminder = await create(input);
          expect(reminder.isActive).toBe(true);

          const before = new Date();
          await deactivate(reminder.id);

          const deactivated = await db.reminders.get(reminder.id);
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
          const reminder = await create(input);

          await deactivate(reminder.id);
          const deactivated = await db.reminders.get(reminder.id);
          expect(deactivated!.isActive).toBe(false);

          const before = new Date();
          await activate(reminder.id);

          const activated = await db.reminders.get(reminder.id);
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
          const reminder = await create(input);

          await deactivate(reminder.id);
          const deactivated = await db.reminders.get(reminder.id);

          expect(deactivated!.id).toBe(reminder.id);
          expect(deactivated!.name).toBe(reminder.name);
          expect(deactivated!.icon).toBe(reminder.icon);
          expect(deactivated!.backgroundColor).toBe(reminder.backgroundColor);
          expect(deactivated!.syncedAt).toEqual(reminder.syncedAt);
          expect(deactivated!.isDeleted).toBe(reminder.isDeleted);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 10: Soft-delete sets correct field values
   *
   * For any reminder record, performing a soft-delete sets isDeleted=true,
   * syncedAt=null, and updates modifiedAt to a recent timestamp.
   *
   * **Validates: Requirements 5.2**
   */
  describe('Property 10: Soft-delete sets correct field values', () => {
    it('should set isDeleted to true and syncedAt to null', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const reminder = await create(input);

          await softDelete(reminder.id);

          const deleted = await db.reminders.get(reminder.id);
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
          const reminder = await create(input);

          const before = new Date();
          await softDelete(reminder.id);

          const deleted = await db.reminders.get(reminder.id);
          expect(deleted).toBeDefined();
          expect(deleted!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        }),
        { numRuns: 100 },
      );
    });

    it('should not modify id or content fields', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateInputArb, async (input) => {
          const reminder = await create(input);

          await softDelete(reminder.id);

          const deleted = await db.reminders.get(reminder.id);
          expect(deleted).toBeDefined();
          expect(deleted!.id).toBe(reminder.id);
          expect(deleted!.name).toBe(reminder.name);
          expect(deleted!.icon).toBe(reminder.icon);
          expect(deleted!.backgroundColor).toBe(reminder.backgroundColor);
          expect(deleted!.isActive).toBe(reminder.isActive);
        }),
        { numRuns: 100 },
      );
    });
  });
});
