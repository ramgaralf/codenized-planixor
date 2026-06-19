import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateDayRange,
  validateTimeForReminder,
  computeEndDayForShift,
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

describe('Property 2: Time validation for reminders rejects invalid intervals on same day', () => {
  /**
   * Validates: Requirements 1.10, 11.6
   *
   * For same-day reminders (endDay == startDay), if endTime <= startTime
   * then validateTimeForReminder returns false. If endTime > startTime, returns true.
   * For multi-day (endDay > startDay), always returns true regardless of time values.
   */

  it('should return false for same-day reminder with endTime <= startTime', () => {
    fc.assert(
      fc.property(dateArb, minutesArb, (day, startTime) => {
        // endTime can be 0..startTime (i.e. endTime <= startTime)
        const endTime = fc.sample(fc.integer({ min: 0, max: startTime }), 1)[0];

        expect(validateTimeForReminder(day, day, startTime, endTime)).toBe(false);
      }),
    );
  });

  it('should return true for same-day reminder with endTime > startTime', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 0, max: 1438 }),
        (day, startTime) => {
          // endTime must be strictly greater than startTime (startTime+1..1439)
          const endTime = fc.sample(
            fc.integer({ min: startTime + 1, max: 1439 }),
            1,
          )[0];

          expect(validateTimeForReminder(day, day, startTime, endTime)).toBe(true);
        },
      ),
    );
  });

  it('should always return true for multi-day reminder regardless of times', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 365 }),
        minutesArb,
        minutesArb,
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
    );
  });
});

describe('Property 17: Crossing midnight shift auto-sets endDay', () => {
  /**
   * Validates: Requirements 1.6, 11.7
   *
   * For any startDay and times where endTime < startTime,
   * computeEndDayForShift returns a day that is exactly 1 day after startDay.
   * Where endTime >= startTime, returns startDay itself.
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

  it('should return startDay when endTime >= startTime (no crossing midnight)', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 0, max: 1438 }),
        (startDay, startTime) => {
          // endTime >= startTime (startTime..1439)
          const endTime = fc.sample(
            fc.integer({ min: startTime, max: 1439 }),
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
