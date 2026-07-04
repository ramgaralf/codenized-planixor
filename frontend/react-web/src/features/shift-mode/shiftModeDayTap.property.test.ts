import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { checkPrerequisites } from '@features/calendar-events/services/prerequisiteService';


/**
 * Property-based tests for day-tap routing logic in Shift Mode.
 * Feature: gh35-shift-mode, Properties 3, 4, 5
 *
 * Tests the pure decision logic for what happens when a user taps a day
 * in Month/Year view while Shift Mode is active. The routing decisions are:
 * - Empty day + prerequisites met → open form (Property 3)
 * - Empty day + prerequisites NOT met → show prerequisite modal (Property 4)
 * - Day with content → show Day_Action_Modal (Property 5)
 *
 * Uses fast-check with minimum 100 iterations per property.
 */

/**
 * Represents the result of the day-tap routing decision.
 */
type DayTapAction = 'openForm' | 'showPrerequisiteModal' | 'showDayActionModal';

/**
 * Pure function that encodes the day-tap routing logic from the implementation.
 * This mirrors the logic in calendar-events.tsx handleMonthDayClick / handleYearDayClick.
 *
 * @param shiftOrReminderEvents - non-deleted shift/reminder events on the tapped day
 * @param activeShiftCount - number of active (non-deleted) shifts in local storage
 * @param activeReminderCount - number of active (non-deleted) reminders in local storage
 */
const determineDayTapAction = (
  shiftOrReminderEvents: { eventType: 'shift' | 'reminder' }[],
  activeShiftCount: number,
  activeReminderCount: number,
): DayTapAction => {
  if (shiftOrReminderEvents.length === 0) {
    const prerequisite = checkPrerequisites(activeShiftCount, activeReminderCount);
    if (prerequisite.canCreate) {
      return 'openForm';
    }
    return 'showPrerequisiteModal';
  }
  return 'showDayActionModal';
};

/** Arbitrary for a valid ISO date string (YYYY-MM-DD) */
const isoDateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2035 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) => {
    const m = month.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  });

describe('Shift Mode Day-Tap Routing — Property Tests', () => {
  /**
   * Feature: gh35-shift-mode, Property 3: Empty day tap opens form in Shift Mode
   *
   * For any date in Month or Year view where the day has zero non-deleted calendar
   * events referencing a shift AND zero non-deleted calendar events referencing a
   * reminder for that day, AND at least one Shift or Reminder with isDeleted=false
   * exists in local storage, tapping that day SHALL open the Calendar_Event_Form
   * with that date preselected as the start day.
   *
   * **Validates: Requirements 5.1, 7.1**
   */
  describe('Property 3: Empty day tap opens form in Shift Mode', () => {
    it('should route to openForm when day is empty and at least one active shift exists', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (_date, activeShiftCount, activeReminderCount) => {
            const emptyDayEvents: { eventType: 'shift' | 'reminder' }[] = [];

            const action = determineDayTapAction(emptyDayEvents, activeShiftCount, activeReminderCount);

            expect(action).toBe('openForm');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should route to openForm when day is empty and at least one active reminder exists (no shifts)', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.integer({ min: 1, max: 100 }),
          (_date, activeReminderCount) => {
            const emptyDayEvents: { eventType: 'shift' | 'reminder' }[] = [];

            const action = determineDayTapAction(emptyDayEvents, 0, activeReminderCount);

            expect(action).toBe('openForm');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should route to openForm for any date when prerequisites are met and day is empty', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (_date, activeShiftCount, activeReminderCount) => {
            // Filter: at least one active shift or reminder
            fc.pre(activeShiftCount > 0 || activeReminderCount > 0);

            const emptyDayEvents: { eventType: 'shift' | 'reminder' }[] = [];
            const action = determineDayTapAction(emptyDayEvents, activeShiftCount, activeReminderCount);

            expect(action).toBe('openForm');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: gh35-shift-mode, Property 4: Prerequisite check failure shows modal
   *
   * For any date in Month or Year view where the day has zero non-deleted
   * shift/reminder calendar events AND zero active (non-deleted) Shifts AND zero
   * active (non-deleted) Reminders exist in local storage, tapping that day SHALL
   * display the Prerequisite_Modal instead of opening the Calendar_Event_Form.
   *
   * **Validates: Requirements 5.2, 7.2**
   */
  describe('Property 4: Prerequisite check failure shows modal', () => {
    it('should route to showPrerequisiteModal when day is empty and zero active shifts AND zero active reminders', () => {
      fc.assert(
        fc.property(isoDateArb, () => {
          const emptyDayEvents: { eventType: 'shift' | 'reminder' }[] = [];

          const action = determineDayTapAction(emptyDayEvents, 0, 0);

          expect(action).toBe('showPrerequisiteModal');
        }),
        { numRuns: 100 },
      );
    });

    it('should never route to openForm when both counts are zero regardless of the date', () => {
      fc.assert(
        fc.property(isoDateArb, () => {
          const emptyDayEvents: { eventType: 'shift' | 'reminder' }[] = [];

          const action = determineDayTapAction(emptyDayEvents, 0, 0);

          expect(action).not.toBe('openForm');
          expect(action).toBe('showPrerequisiteModal');
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: gh35-shift-mode, Property 5: Day with content shows Day_Action_Modal
   *
   * For any date in Month or Year view where the day has at least one non-deleted
   * calendar event referencing a shift or at least one non-deleted calendar event
   * referencing a reminder, tapping that day SHALL display the Day_Action_Modal
   * for that date.
   *
   * **Validates: Requirements 6.1, 8.1**
   */
  describe('Property 5: Day with content shows Day_Action_Modal', () => {
    /** Arbitrary for a non-empty list of shift/reminder events */
    const nonEmptyEventsArb = fc.array(
      fc.record({
        eventType: fc.constantFrom('shift' as const, 'reminder' as const),
      }),
      { minLength: 1, maxLength: 20 },
    );

    it('should route to showDayActionModal when day has at least one shift or reminder event', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          nonEmptyEventsArb,
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (_date, dayEvents, activeShiftCount, activeReminderCount) => {
            const action = determineDayTapAction(dayEvents, activeShiftCount, activeReminderCount);

            expect(action).toBe('showDayActionModal');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should route to showDayActionModal even when prerequisite counts are zero (content takes priority)', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          nonEmptyEventsArb,
          (_date, dayEvents) => {
            // Even with 0 active shifts and 0 active reminders globally,
            // if the day has existing events, show the modal
            const action = determineDayTapAction(dayEvents, 0, 0);

            expect(action).toBe('showDayActionModal');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should route to showDayActionModal regardless of event type mix (shift-only, reminder-only, or mixed)', () => {
      const shiftOnlyEventsArb = fc.array(
        fc.record({ eventType: fc.constant('shift' as const) }),
        { minLength: 1, maxLength: 10 },
      );

      const reminderOnlyEventsArb = fc.array(
        fc.record({ eventType: fc.constant('reminder' as const) }),
        { minLength: 1, maxLength: 10 },
      );

      // Shift-only days
      fc.assert(
        fc.property(shiftOnlyEventsArb, (dayEvents) => {
          const action = determineDayTapAction(dayEvents, 5, 5);
          expect(action).toBe('showDayActionModal');
        }),
        { numRuns: 100 },
      );

      // Reminder-only days
      fc.assert(
        fc.property(reminderOnlyEventsArb, (dayEvents) => {
          const action = determineDayTapAction(dayEvents, 5, 5);
          expect(action).toBe('showDayActionModal');
        }),
        { numRuns: 100 },
      );
    });
  });
});
