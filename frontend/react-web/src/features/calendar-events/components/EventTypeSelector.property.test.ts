/* eslint-disable sonarjs/assertions-in-tests */
import { describe, it } from 'vitest';
import fc from 'fast-check';

import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';

/**
 * Property-based tests for EventTypeSelector filtering logic.
 * Feature: gh8-calendar-event-management
 *
 * Tests the pure filtering/sorting logic extracted from the component,
 * since the component itself uses useLiveQuery (Dexie hooks) which
 * requires a React rendering context.
 */

interface EventTypeOption {
  eventType: 'shift' | 'reminder';
  eventTypeId: string;
  displayName: string;
  name: string;
  icon: string;
  backgroundColor: string;
}

/**
 * Pure filtering logic matching what EventTypeSelector does internally:
 * 1. Filter shifts where isActive === true AND isDeleted === false
 * 2. Filter reminders where isActive === true AND isDeleted === false
 * 3. Format as "{type}: {name}"
 * 4. Sort alphabetically by displayName
 */
function filterAndFormatEventTypeOptions(
  shifts: Shift[],
  reminders: Reminder[],
  shiftPrefix: string,
  reminderPrefix: string,
): EventTypeOption[] {
  const activeShifts = shifts.filter(
    (shift) => shift.isActive === true && shift.isDeleted === false,
  );

  const activeReminders = reminders.filter(
    (reminder) => reminder.isActive === true && reminder.isDeleted === false,
  );

  const shiftOptions: EventTypeOption[] = activeShifts.map((shift) => ({
    eventType: 'shift' as const,
    eventTypeId: shift.id,
    displayName: `${shiftPrefix}: ${shift.name}`,
    name: shift.name,
    icon: shift.icon,
    backgroundColor: shift.backgroundColor,
  }));

  const reminderOptions: EventTypeOption[] = activeReminders.map((reminder) => ({
    eventType: 'reminder' as const,
    eventTypeId: reminder.id,
    displayName: `${reminderPrefix}: ${reminder.name}`,
    name: reminder.name,
    icon: reminder.icon,
    backgroundColor: reminder.backgroundColor,
  }));

  return [...shiftOptions, ...reminderOptions].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

/** Arbitrary for generating shifts with arbitrary isActive/isDeleted states */
const shiftArb: fc.Arbitrary<Shift> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.constantFrom('🏢', '🌙', '☀️', '🔧', '💼'),
  backgroundColor: fc.constantFrom('#EF4444', '#10B981', '#2563EB', '#7C3AED', '#F97316'),
  startTime: fc.integer({ min: 0, max: 1438 }),
  endTime: fc.integer({ min: 1, max: 1439 }),
  hoursWorked: fc.integer({ min: 1, max: 1440 }),
  isActive: fc.boolean(),
  createdAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
  modifiedAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
  syncedAt: fc.oneof(fc.constant(null), fc.constant(new Date('2024-01-01T00:00:00Z'))),
  isDeleted: fc.boolean(),
});

/** Arbitrary for generating reminders with arbitrary isActive/isDeleted states */
const reminderArb: fc.Arbitrary<Reminder> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.constantFrom('💊', '🏋️', '📞', '🎂', '📝'),
  backgroundColor: fc.constantFrom('#EF4444', '#10B981', '#2563EB', '#7C3AED', '#F97316'),
  isActive: fc.boolean(),
  createdAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
  modifiedAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
  syncedAt: fc.oneof(fc.constant(null), fc.constant(new Date('2024-01-01T00:00:00Z'))),
  isDeleted: fc.boolean(),
});

describe('EventTypeSelector — Property Tests', () => {
  // Feature: gh8-calendar-event-management, Property 4: Event type selector filters to active non-deleted items
  // **Validates: Requirements 1.5, 13.4**
  describe('Property 4: Event type selector filters to active non-deleted items', () => {
    const SHIFT_PREFIX = 'Shift';
    const REMINDER_PREFIX = 'Reminder';

    it('should display only items where isActive is true AND isDeleted is false', () => {
      fc.assert(
        fc.property(
          fc.array(shiftArb, { minLength: 0, maxLength: 15 }),
          fc.array(reminderArb, { minLength: 0, maxLength: 15 }),
          (shifts, reminders) => {
            const result = filterAndFormatEventTypeOptions(
              shifts,
              reminders,
              SHIFT_PREFIX,
              REMINDER_PREFIX,
            );

            // Every item in the result must correspond to an active, non-deleted item
            const activeShiftIds = shifts
              .filter((s) => s.isActive === true && s.isDeleted === false)
              .map((s) => s.id);
            const activeReminderIds = reminders
              .filter((r) => r.isActive === true && r.isDeleted === false)
              .map((r) => r.id);

            const resultShiftIds = result
              .filter((o) => o.eventType === 'shift')
              .map((o) => o.eventTypeId);
            const resultReminderIds = result
              .filter((o) => o.eventType === 'reminder')
              .map((o) => o.eventTypeId);

            // Result shift IDs must match exactly the active non-deleted shifts
            const shiftsMatch =
              resultShiftIds.length === activeShiftIds.length &&
              resultShiftIds.every((id) => activeShiftIds.includes(id));

            // Result reminder IDs must match exactly the active non-deleted reminders
            const remindersMatch =
              resultReminderIds.length === activeReminderIds.length &&
              resultReminderIds.every((id) => activeReminderIds.includes(id));

            return shiftsMatch && remindersMatch;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should format options as "{type}: {name}"', () => {
      fc.assert(
        fc.property(
          fc.array(shiftArb, { minLength: 0, maxLength: 10 }),
          fc.array(reminderArb, { minLength: 0, maxLength: 10 }),
          (shifts, reminders) => {
            const result = filterAndFormatEventTypeOptions(
              shifts,
              reminders,
              SHIFT_PREFIX,
              REMINDER_PREFIX,
            );

            return result.every((option) => {
              if (option.eventType === 'shift') {
                return option.displayName === `${SHIFT_PREFIX}: ${option.name}`;
              }
              return option.displayName === `${REMINDER_PREFIX}: ${option.name}`;
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should order results alphabetically by display name', () => {
      fc.assert(
        fc.property(
          fc.array(shiftArb, { minLength: 0, maxLength: 10 }),
          fc.array(reminderArb, { minLength: 0, maxLength: 10 }),
          (shifts, reminders) => {
            const result = filterAndFormatEventTypeOptions(
              shifts,
              reminders,
              SHIFT_PREFIX,
              REMINDER_PREFIX,
            );

            // Verify the result is sorted alphabetically by displayName
            for (let i = 1; i < result.length; i++) {
              if (result[i - 1].displayName.localeCompare(result[i].displayName) > 0) {
                return false;
              }
            }
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should never include inactive items (isActive === false)', () => {
      fc.assert(
        fc.property(
          fc.array(shiftArb, { minLength: 1, maxLength: 10 }),
          fc.array(reminderArb, { minLength: 1, maxLength: 10 }),
          (shifts, reminders) => {
            const result = filterAndFormatEventTypeOptions(
              shifts,
              reminders,
              SHIFT_PREFIX,
              REMINDER_PREFIX,
            );

            // Collect all IDs of inactive items
            const inactiveShiftIds = shifts
              .filter((s) => s.isActive === false)
              .map((s) => s.id);
            const inactiveReminderIds = reminders
              .filter((r) => r.isActive === false)
              .map((r) => r.id);

            // None of the inactive IDs should appear in the result
            const noInactiveShifts = result
              .filter((o) => o.eventType === 'shift')
              .every((o) => !inactiveShiftIds.includes(o.eventTypeId));
            const noInactiveReminders = result
              .filter((o) => o.eventType === 'reminder')
              .every((o) => !inactiveReminderIds.includes(o.eventTypeId));

            return noInactiveShifts && noInactiveReminders;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should never include deleted items (isDeleted === true)', () => {
      fc.assert(
        fc.property(
          fc.array(shiftArb, { minLength: 1, maxLength: 10 }),
          fc.array(reminderArb, { minLength: 1, maxLength: 10 }),
          (shifts, reminders) => {
            const result = filterAndFormatEventTypeOptions(
              shifts,
              reminders,
              SHIFT_PREFIX,
              REMINDER_PREFIX,
            );

            // Collect all IDs of deleted items
            const deletedShiftIds = shifts
              .filter((s) => s.isDeleted === true)
              .map((s) => s.id);
            const deletedReminderIds = reminders
              .filter((r) => r.isDeleted === true)
              .map((r) => r.id);

            // None of the deleted IDs should appear in the result
            const noDeletedShifts = result
              .filter((o) => o.eventType === 'shift')
              .every((o) => !deletedShiftIds.includes(o.eventTypeId));
            const noDeletedReminders = result
              .filter((o) => o.eventType === 'reminder')
              .every((o) => !deletedReminderIds.includes(o.eventTypeId));

            return noDeletedShifts && noDeletedReminders;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
