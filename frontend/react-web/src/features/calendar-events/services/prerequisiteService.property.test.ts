import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { checkPrerequisites } from './prerequisiteService';

/**
 * Property-based tests for prerequisiteService.
 * Feature: gh32-improvements-and-bug-fixes, Properties 5–6
 */
describe('prerequisiteService — Property Tests', () => {
  /**
   * Feature: gh32-improvements-and-bug-fixes, Property 5: Calendar event prerequisite classification
   *
   * For any pair of non-negative integers (activeShiftCount, activeReminderCount),
   * the prerequisite check function SHALL return the correct PrerequisiteResult.
   * canCreate is true when at least one of either type exists (OR logic).
   * canCreate is false only when BOTH are zero.
   *
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.8**
   */
  describe('Property 5: Calendar event prerequisite classification', () => {
    it('shifts > 0 and reminders > 0 → canCreate: true', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          (shiftCount, reminderCount) => {
            const result = checkPrerequisites(shiftCount, reminderCount);

            expect(result).toEqual({ canCreate: true });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('both shifts = 0 and reminders = 0 → canCreate: false, both missing', () => {
      const result = checkPrerequisites(0, 0);

      expect(result).toEqual({
        canCreate: false,
        missingShifts: true,
        missingReminders: true,
      });
    });

    it('shifts = 0, reminders > 0 → canCreate: true (OR logic)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          (reminderCount) => {
            const result = checkPrerequisites(0, reminderCount);

            expect(result).toEqual({ canCreate: true });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('shifts > 0, reminders = 0 → canCreate: true (OR logic)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          (shiftCount) => {
            const result = checkPrerequisites(shiftCount, 0);

            expect(result).toEqual({ canCreate: true });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('for any non-negative (shiftCount, reminderCount), result is consistent with OR classification rules', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000 }),
          fc.integer({ min: 0, max: 100000 }),
          (shiftCount, reminderCount) => {
            const result = checkPrerequisites(shiftCount, reminderCount);

            if (shiftCount > 0 || reminderCount > 0) {
              expect(result).toEqual({ canCreate: true });
            } else {
              expect(result).toEqual({
                canCreate: false,
                missingShifts: true,
                missingReminders: true,
              });
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: gh32-improvements-and-bug-fixes, Property 6: Prerequisite check uses only non-deleted records
   *
   * For any mixed collection of records (some with isDeleted=true, some false),
   * the check considers only isDeleted=false records. We test the invariant:
   * checkPrerequisites(countNonDeleted(shifts), countNonDeleted(reminders))
   * produces the same result as counting only active records from a mixed collection.
   *
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.8**
   */
  describe('Property 6: Prerequisite check uses only non-deleted records', () => {
    /** A record with an isDeleted flag */
    interface SyncRecord {
      id: string;
      isDeleted: boolean;
    }

    /** Count non-deleted records in a collection */
    const countNonDeleted = (records: SyncRecord[]): number =>
      records.filter((r) => !r.isDeleted).length;

    /** Arbitrary that generates a list of records with mixed isDeleted values */
    const mixedRecordsArb: fc.Arbitrary<SyncRecord[]> = fc.array(
      fc.record({
        id: fc.uuid(),
        isDeleted: fc.boolean(),
      }),
      { minLength: 0, maxLength: 50 },
    );

    it('for mixed isDeleted collections, result matches counting only isDeleted=false records', () => {
      fc.assert(
        fc.property(
          mixedRecordsArb,
          mixedRecordsArb,
          (shifts, reminders) => {
            const activeShiftCount = countNonDeleted(shifts);
            const activeReminderCount = countNonDeleted(reminders);

            const result = checkPrerequisites(activeShiftCount, activeReminderCount);

            if (activeShiftCount > 0 || activeReminderCount > 0) {
              expect(result).toEqual({ canCreate: true });
            } else {
              expect(result).toEqual({
                canCreate: false,
                missingShifts: true,
                missingReminders: true,
              });
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('all records deleted → both missing', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ id: fc.uuid(), isDeleted: fc.constant(true) }),
            { minLength: 1, maxLength: 20 },
          ),
          fc.array(
            fc.record({ id: fc.uuid(), isDeleted: fc.constant(true) }),
            { minLength: 1, maxLength: 20 },
          ),
          (shifts, reminders) => {
            const activeShiftCount = countNonDeleted(shifts);
            const activeReminderCount = countNonDeleted(reminders);

            expect(activeShiftCount).toBe(0);
            expect(activeReminderCount).toBe(0);

            const result = checkPrerequisites(activeShiftCount, activeReminderCount);

            expect(result).toEqual({
              canCreate: false,
              missingShifts: true,
              missingReminders: true,
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('at least one non-deleted in either collection → canCreate: true', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ id: fc.uuid(), isDeleted: fc.boolean() }),
            { minLength: 1, maxLength: 20 },
          ).filter((records) => records.some((r) => !r.isDeleted)),
          fc.array(
            fc.record({ id: fc.uuid(), isDeleted: fc.boolean() }),
            { minLength: 0, maxLength: 20 },
          ),
          (shifts, reminders) => {
            const activeShiftCount = countNonDeleted(shifts);
            const activeReminderCount = countNonDeleted(reminders);

            expect(activeShiftCount).toBeGreaterThan(0);

            const result = checkPrerequisites(activeShiftCount, activeReminderCount);

            expect(result).toEqual({ canCreate: true });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('deleted records do not contribute to the count regardless of quantity', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 0, max: 50 }),
          (activeShifts, deletedShifts, activeReminders, deletedReminders) => {
            // Build mixed collections
            const shifts: SyncRecord[] = [
              ...Array.from({ length: activeShifts }, (_, i) => ({
                id: `active-shift-${i}`,
                isDeleted: false,
              })),
              ...Array.from({ length: deletedShifts }, (_, i) => ({
                id: `deleted-shift-${i}`,
                isDeleted: true,
              })),
            ];

            const reminders: SyncRecord[] = [
              ...Array.from({ length: activeReminders }, (_, i) => ({
                id: `active-reminder-${i}`,
                isDeleted: false,
              })),
              ...Array.from({ length: deletedReminders }, (_, i) => ({
                id: `deleted-reminder-${i}`,
                isDeleted: true,
              })),
            ];

            const activeShiftCount = countNonDeleted(shifts);
            const activeReminderCount = countNonDeleted(reminders);

            // The count should equal the number of records we explicitly created as active
            expect(activeShiftCount).toBe(activeShifts);
            expect(activeReminderCount).toBe(activeReminders);

            // And the prerequisite result should match
            const result = checkPrerequisites(activeShiftCount, activeReminderCount);

            if (activeShifts > 0 || activeReminders > 0) {
              expect(result).toEqual({ canCreate: true });
            } else {
              expect(result).toEqual({
                canCreate: false,
                missingShifts: true,
                missingReminders: true,
              });
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
