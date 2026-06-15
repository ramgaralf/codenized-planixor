import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';
import { PREDEFINED_PALETTE } from '@features/reminders/constants';

import { create, deactivate, getActiveForSelection } from './reminderService';

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

describe('reminderService — Calendar Event Selection Property Tests', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.reminders.clear();
  });

  /**
   * Property 9: Inactive reminders excluded from calendar event selection
   *
   * For any collection of reminders with varying isActive states, the list of
   * selectable reminders for calendar event creation contains only reminders
   * where isActive is true.
   *
   * **Validates: Requirements 4.6**
   */
  describe('Property 9: Inactive reminders excluded from calendar event selection', () => {
    it('should return only active reminders for calendar event selection', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              input: validCreateInputArb,
              shouldDeactivate: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          async (reminderSpecs) => {
            await db.reminders.clear();

            const createdReminders = [];
            for (const spec of reminderSpecs) {
              const reminder = await create(spec.input);
              createdReminders.push({ reminder, shouldDeactivate: spec.shouldDeactivate });
            }

            for (const { reminder, shouldDeactivate } of createdReminders) {
              if (shouldDeactivate) {
                await deactivate(reminder.id);
              }
            }

            const selectable = await getActiveForSelection();

            const expectedActive = createdReminders.filter((s) => !s.shouldDeactivate);
            expect(selectable).toHaveLength(expectedActive.length);

            for (const r of selectable) {
              expect(r.isActive).toBe(true);
            }

            const deactivatedIds = new Set(
              createdReminders.filter((s) => s.shouldDeactivate).map((s) => s.reminder.id),
            );
            for (const r of selectable) {
              expect(deactivatedIds.has(r.id)).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);

    it('should return an empty list when all reminders are inactive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validCreateInputArb, { minLength: 1, maxLength: 3 }),
          async (inputs) => {
            await db.reminders.clear();

            for (const input of inputs) {
              const reminder = await create(input);
              await deactivate(reminder.id);
            }

            const selectable = await getActiveForSelection();
            expect(selectable).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);

    it('should return all reminders when none are deactivated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validCreateInputArb, { minLength: 1, maxLength: 3 }),
          async (inputs) => {
            await db.reminders.clear();

            const created = [];
            for (const input of inputs) {
              const reminder = await create(input);
              created.push(reminder);
            }

            const selectable = await getActiveForSelection();
            expect(selectable).toHaveLength(created.length);

            for (const r of selectable) {
              expect(r.isActive).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);

    it('should order selectable reminders by createdAt ascending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validCreateInputArb, { minLength: 2, maxLength: 5 }),
          async (inputs) => {
            await db.reminders.clear();

            for (const input of inputs) {
              await create(input);
            }

            const selectable = await getActiveForSelection();

            for (let i = 1; i < selectable.length; i++) {
              expect(selectable[i].createdAt.getTime()).toBeGreaterThanOrEqual(
                selectable[i - 1].createdAt.getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });
});
