import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateDayRange,
  validateTimeForReminder,
  computeEndDayForShift,
  computeTotalHours,
  checkOneShiftPerDay,
  validateRequiredFields,
} from './validation';
import type { CalendarEvent } from './models';

/**
 * Helper: format a Date object as an ISO date string (YYYY-MM-DD).
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Arbitrary: generates a valid ISO date string (YYYY-MM-DD).
 * Constrains to dates between 2000-01-01 and 2099-12-31 for practical ranges.
 * Filters out invalid dates (NaN) that fc.date() may produce at boundaries.
 */
const dateArb = fc
  .date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
  .filter((d) => !isNaN(d.getTime()))
  .map(formatDate);

/**
 * Arbitrary: generates valid minutes from midnight (0–1439).
 */
const minutesArb = fc.integer({ min: 0, max: 1439 });

/**
 * Arbitrary: generates event types.
 */
const eventTypeArb = fc.constantFrom('shift', 'reminder') as fc.Arbitrary<
  'shift' | 'reminder'
>;

describe('Property 16: Day range validation rejects invalid intervals', () => {
  /**
   * Validates: Requirements 1.11, 11.5
   *
   * For any pair of startDay/endDay where endDay < startDay,
   * validateDayRange returns false. For endDay >= startDay, returns true.
   */

  it('should return false for any endDay strictly before startDay', () => {
    fc.assert(
      fc.property(dateArb, fc.integer({ min: 1, max: 365 }), (startDay, daysBack) => {
        const startDate = new Date(startDay);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() - daysBack);
        const endDay = formatDate(endDate);

        expect(validateDayRange(startDay, endDay)).toBe(false);
      }),
    );
  });

  it('should return true for any endDay on or after startDay', () => {
    fc.assert(
      fc.property(dateArb, fc.integer({ min: 0, max: 365 }), (startDay, daysForward) => {
        const startDate = new Date(startDay);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + daysForward);
        const endDay = formatDate(endDate);

        expect(validateDayRange(startDay, endDay)).toBe(true);
      }),
    );
  });
});

describe('Feature: gh18-calendar-shift-reminder-improvements, Property 2: Reminder same-day time validation allows equality', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 4.1**
   *
   * For any reminder event where endDay == startDay:
   *   - If endTime >= startTime → validation should return true
   *   - If endTime < startTime → validation should return false
   * For any reminder event where endDay > startDay:
   *   - Any combination of startTime (0-1439) and endTime (0-1439) should return true
   */

  it('should return true for same-day reminder with endTime >= startTime (includes equality)', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 0, max: 1439 }),
        fc.integer({ min: 0, max: 1439 }),
        (day, startTime, offset) => {
          // endTime = startTime + offset clamped to 1439 ensures endTime >= startTime
          const endTime = Math.min(startTime + offset, 1439);
          // Only test when endTime >= startTime
          fc.pre(endTime >= startTime);

          expect(validateTimeForReminder(day, day, startTime, endTime)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return false for same-day reminder with endTime < startTime', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 1439 }),
        fc.integer({ min: 0, max: 1438 }),
        (day, startTime, endTime) => {
          // Only test when endTime < startTime
          fc.pre(endTime < startTime);

          expect(validateTimeForReminder(day, day, startTime, endTime)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should always return true for multi-day reminder regardless of times', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 365 }),
        fc.integer({ min: 0, max: 1439 }),
        fc.integer({ min: 0, max: 1439 }),
        (startDay, daysForward, startTime, endTime) => {
          const startDate = new Date(startDay);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + daysForward);
          const endDay = formatDate(endDate);

          expect(validateTimeForReminder(startDay, endDay, startTime, endTime)).toBe(
            true,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 17: Crossing midnight or 24-hour shift auto-sets endDay', () => {
  /**
   * Validates: Requirements 1.6, 11.7
   *
   * For any startDay and times where endTime <= startTime (crossing midnight or 24-hour shift),
   * computeEndDayForShift returns a day that is exactly 1 day after startDay.
   * Where endTime > startTime, returns startDay itself.
   */

  it('should return startDay + 1 when endTime < startTime (crossing midnight)', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 1439 }),
        (startDay, startTime) => {
          // endTime must be strictly less than startTime (0..startTime-1)
          const endTime = fc.sample(
            fc.integer({ min: 0, max: startTime - 1 }),
            1,
          )[0];

          const result = computeEndDayForShift(startDay, startTime, endTime);

          const expectedDate = new Date(startDay);
          expectedDate.setDate(expectedDate.getDate() + 1);
          const expectedEndDay = formatDate(expectedDate);

          expect(result).toBe(expectedEndDay);
        },
      ),
    );
  });

  it('should return startDay + 1 when endTime === startTime (24-hour shift)', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 0, max: 1439 }),
        (startDay, time) => {
          const result = computeEndDayForShift(startDay, time, time);

          const expectedDate = new Date(startDay);
          expectedDate.setDate(expectedDate.getDate() + 1);
          const expectedEndDay = formatDate(expectedDate);

          expect(result).toBe(expectedEndDay);
        },
      ),
    );
  });

  it('should return startDay when endTime > startTime (same-day shift)', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 0, max: 1438 }),
        (startDay, startTime) => {
          // endTime > startTime (startTime+1..1439)
          const endTime = fc.sample(
            fc.integer({ min: startTime + 1, max: 1439 }),
            1,
          )[0];

          const result = computeEndDayForShift(startDay, startTime, endTime);

          expect(result).toBe(startDay);
        },
      ),
    );
  });
});

describe('Property 3: One-shift-per-day constraint enforcement', () => {
  /**
   * Validates: Requirements 2.1
   *
   * For any existing events list with a non-deleted shift on a given startDay,
   * checkOneShiftPerDay with eventType "shift" and the same startDay returns false.
   * With eventType "reminder" always returns true.
   * With excludeEventId matching the existing shift, returns true.
   */

  const createEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
    id: 'existing-shift-id',
    eventType: 'shift',
    eventTypeId: 'shift-type-1',
    startDay: '2024-01-15',
    endDay: '2024-01-15',
    startTime: 480,
    endTime: 960,
    totalHours: 480,
    notes: null,
    modifiedAt: new Date(),
    syncedAt: null,
    isDeleted: false,
    ...overrides,
  });

  it('should return false when a non-deleted shift exists for the same startDay', () => {
    fc.assert(
      fc.property(dateArb, fc.uuid(), (startDay, shiftId) => {
        const existingEvents = [
          createEvent({ id: shiftId, startDay, isDeleted: false }),
        ];

        expect(checkOneShiftPerDay(startDay, 'shift', existingEvents)).toBe(false);
      }),
    );
  });

  it('should always return true for reminder eventType regardless of existing shifts', () => {
    fc.assert(
      fc.property(dateArb, fc.uuid(), (startDay, shiftId) => {
        const existingEvents = [
          createEvent({ id: shiftId, startDay, isDeleted: false }),
        ];

        expect(checkOneShiftPerDay(startDay, 'reminder', existingEvents)).toBe(true);
      }),
    );
  });

  it('should return true when the conflicting shift is excluded by excludeEventId', () => {
    fc.assert(
      fc.property(dateArb, fc.uuid(), (startDay, shiftId) => {
        const existingEvents = [
          createEvent({ id: shiftId, startDay, isDeleted: false }),
        ];

        expect(checkOneShiftPerDay(startDay, 'shift', existingEvents, shiftId)).toBe(
          true,
        );
      }),
    );
  });

  it('should return true when existing shift on that day is soft-deleted', () => {
    fc.assert(
      fc.property(dateArb, fc.uuid(), (startDay, shiftId) => {
        const existingEvents = [
          createEvent({ id: shiftId, startDay, isDeleted: true }),
        ];

        expect(checkOneShiftPerDay(startDay, 'shift', existingEvents)).toBe(true);
      }),
    );
  });
});

describe('Property 14: Required fields validation rejects incomplete events', () => {
  /**
   * Validates: Requirements 1.2, 1.12
   *
   * For any event missing at least one required field
   * (eventType, eventTypeId, startDay, endDay, totalHours, startTime, endTime),
   * validateRequiredFields returns isValid=false.
   */

  const requiredFieldKeys = [
    'eventType',
    'eventTypeId',
    'startDay',
    'endDay',
    'totalHours',
    'startTime',
    'endTime',
  ] as const;

  it('should return isValid=false when at least one required field is removed', () => {
    fc.assert(
      fc.property(
        eventTypeArb,
        fc.uuid(),
        dateArb,
        fc.integer({ min: 0, max: 365 }),
        minutesArb,
        minutesArb,
        fc.integer({ min: 0, max: 1440 }),
        fc.subarray(requiredFieldKeys.slice(), { minLength: 1 }),
        (
          eventType,
          eventTypeId,
          startDay,
          dayOffset,
          startTime,
          endTime,
          totalHours,
          fieldsToRemove,
        ) => {
          const startDate = new Date(startDay);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + dayOffset);
          const endDay = formatDate(endDate);

          const event: Record<string, unknown> = {
            eventType,
            eventTypeId,
            startDay,
            endDay,
            totalHours,
            startTime,
            endTime,
          };

          // Remove at least one required field
          for (const field of fieldsToRemove) {
            delete event[field];
          }

          const result = validateRequiredFields(event);
          expect(result.isValid).toBe(false);
          expect(Object.keys(result.errors).length).toBeGreaterThan(0);
        },
      ),
    );
  });

  it('should return isValid=true when all required fields are present and valid', () => {
    fc.assert(
      fc.property(
        eventTypeArb,
        fc.uuid(),
        dateArb,
        fc.integer({ min: 0, max: 365 }),
        fc.integer({ min: 0, max: 1439 }),
        fc.integer({ min: 0, max: 1439 }),
        fc.integer({ min: 0, max: 9999 }),
        (eventType, eventTypeId, startDay, dayOffset, startTime, endTime, totalHours) => {
          const startDate = new Date(startDay);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + dayOffset);
          const endDay = formatDate(endDate);

          const event = {
            eventType,
            eventTypeId,
            startDay,
            endDay,
            totalHours,
            startTime,
            endTime,
          };

          const result = validateRequiredFields(event);
          expect(result.isValid).toBe(true);
          expect(Object.keys(result.errors)).toHaveLength(0);
        },
      ),
    );
  });
});

describe('Feature: gh18-calendar-shift-reminder-improvements, Property 10: TotalHours computation allows zero for reminders', () => {
  /**
   * **Validates: Requirements 3.1, 3.3, 3.4**
   *
   * For any reminder event where startDay == endDay and startTime == endTime,
   * computeTotalHours('reminder', ...) returns 0.
   */

  it('should return 0 for any reminder event where startDay == endDay and startTime == endTime', () => {
    fc.assert(
      fc.property(
        dateArb,
        minutesArb,
        (day, time) => {
          const result = computeTotalHours('reminder', day, day, time, time);
          expect(result).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gh18-calendar-shift-reminder-improvements, Property 11: TotalHours for shift events reflects shift\'s HoursWorked including zero', () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * For any shift event with shiftHoursWorked = 0, computeTotalHours('shift', ...) returns 0.
   * For any shift event with any valid shiftHoursWorked in [0, 1440],
   * computeTotalHours('shift', ...) returns that value exactly.
   */

  it('should return 0 for any shift event with shiftHoursWorked = 0', () => {
    fc.assert(
      fc.property(
        dateArb,
        dateArb,
        minutesArb,
        minutesArb,
        (startDay, endDay, startTime, endTime) => {
          const result = computeTotalHours('shift', startDay, endDay, startTime, endTime, 0);
          expect(result).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return shiftHoursWorked exactly for any valid value in [0, 1440]', () => {
    fc.assert(
      fc.property(
        dateArb,
        dateArb,
        minutesArb,
        minutesArb,
        fc.integer({ min: 0, max: 1440 }),
        (startDay, endDay, startTime, endTime, shiftHoursWorked) => {
          const result = computeTotalHours('shift', startDay, endDay, startTime, endTime, shiftHoursWorked);
          expect(result).toBe(shiftHoursWorked);
        },
      ),
      { numRuns: 100 },
    );
  });
});
