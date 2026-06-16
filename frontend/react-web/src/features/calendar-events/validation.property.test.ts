/* eslint-disable sonarjs/assertions-in-tests */
import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  validateTimeRange,
  validateRequiredFields,
  checkOneShiftPerDay,
} from './validation';
import type { CalendarEvent } from './models';

/**
 * Property-based tests for calendar event validation functions.
 * Feature: gh8-calendar-event-management
 */

/** Generates a valid ISO date string (YYYY-MM-DD) */
const isoDateArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).chain((month) =>
      fc.integer({ min: 1, max: 28 }).map((day) => {
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
      }),
    ),
  );

describe('Calendar Event Validation Properties', () => {
  // Feature: gh8-calendar-event-management, Property 2: Time range validation rejects invalid intervals
  // **Validates: Requirements 1.8, 11.5**
  it('Property 2: Time range validation rejects invalid intervals', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1439 }),
        fc.integer({ min: 0, max: 1439 }),
        (startTime, endTime) => {
          const result = validateTimeRange(startTime, endTime);
          return result === (endTime > startTime);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: gh8-calendar-event-management, Property 3: One-shift-per-day constraint enforcement
  // **Validates: Requirements 2.1, 2.3, 2.4, 2.5**
  describe('Property 3: One-shift-per-day constraint enforcement', () => {
    const calendarEventArb = (dayOverride?: string): fc.Arbitrary<CalendarEvent> =>
      fc.record({
        id: fc.uuid(),
        eventType: fc.constantFrom('shift' as const, 'reminder' as const),
        eventTypeId: fc.uuid(),
        day: dayOverride ? fc.constant(dayOverride) : isoDateArb,
        startTime: fc.integer({ min: 0, max: 1438 }),
        endTime: fc.integer({ min: 1, max: 1439 }),
        notes: fc.oneof(fc.constant(null), fc.string({ maxLength: 200 })),
        modifiedAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
        syncedAt: fc.oneof(
          fc.constant(null),
          fc.constant(new Date('2024-01-01T00:00:00Z')),
        ),
        isDeleted: fc.boolean(),
      });

    it('should allow any reminder regardless of existing shifts', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventArb(), { minLength: 0, maxLength: 10 }),
          isoDateArb,
          (existingEvents, day) => {
            const result = checkOneShiftPerDay(day, 'reminder', existingEvents);
            return result === true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should allow a shift when no other non-deleted shift exists for the same day', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.array(calendarEventArb(), { minLength: 0, maxLength: 10 }),
          (day, existingEvents) => {
            // Filter to only events that DON'T have a non-deleted shift on this day
            const eventsWithoutConflict = existingEvents.filter(
              (e) => !(e.day === day && e.eventType === 'shift' && !e.isDeleted),
            );

            const result = checkOneShiftPerDay(day, 'shift', eventsWithoutConflict);
            return result === true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject a shift when a non-deleted shift already exists for the same day', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.uuid(),
          fc.array(calendarEventArb(), { minLength: 0, maxLength: 5 }),
          (day, shiftId, otherEvents) => {
            // Create a non-deleted shift for the target day
            const conflictingShift: CalendarEvent = {
              id: shiftId,
              eventType: 'shift',
              eventTypeId: 'type-id',
              day,
              startTime: 480,
              endTime: 960,
              notes: null,
              modifiedAt: new Date(),
              syncedAt: null,
              isDeleted: false,
            };

            const allEvents = [conflictingShift, ...otherEvents];
            const result = checkOneShiftPerDay(day, 'shift', allEvents);
            return result === false;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should allow a shift when conflicting shift is excluded by excludeEventId', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.uuid(),
          (day, eventId) => {
            // The only shift for that day is the one being excluded
            const existingEvents: CalendarEvent[] = [
              {
                id: eventId,
                eventType: 'shift',
                eventTypeId: 'type-id',
                day,
                startTime: 480,
                endTime: 960,
                notes: null,
                modifiedAt: new Date(),
                syncedAt: null,
                isDeleted: false,
              },
            ];

            const result = checkOneShiftPerDay(day, 'shift', existingEvents, eventId);
            return result === true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: gh8-calendar-event-management, Property 14: Required fields validation rejects incomplete events
  // **Validates: Requirements 1.2, 1.9**
  describe('Property 14: Required fields validation rejects incomplete events', () => {
    it('should reject events with at least one required field missing', () => {
      // Generate a subset of required fields where at least one is missing
      const incompleteEventArb = fc
        .record({
          includeEventType: fc.boolean(),
          includeEventTypeId: fc.boolean(),
          includeDay: fc.boolean(),
          includeStartTime: fc.boolean(),
          includeEndTime: fc.boolean(),
          eventType: fc.constantFrom('shift' as const, 'reminder' as const),
          eventTypeId: fc.uuid(),
          day: isoDateArb,
          startTime: fc.integer({ min: 0, max: 1439 }),
          endTime: fc.integer({ min: 0, max: 1439 }),
        })
        .filter(
          (gen) =>
            // At least one required field must be missing
            !gen.includeEventType ||
            !gen.includeEventTypeId ||
            !gen.includeDay ||
            !gen.includeStartTime ||
            !gen.includeEndTime,
        )
        .map((gen) => {
          const event: Partial<CalendarEvent> = {};
          if (gen.includeEventType) event.eventType = gen.eventType;
          if (gen.includeEventTypeId) event.eventTypeId = gen.eventTypeId;
          if (gen.includeDay) event.day = gen.day;
          if (gen.includeStartTime) event.startTime = gen.startTime;
          if (gen.includeEndTime) event.endTime = gen.endTime;
          return event;
        });

      fc.assert(
        fc.property(incompleteEventArb, (event) => {
          const result = validateRequiredFields(event);
          return result.isValid === false;
        }),
        { numRuns: 100 },
      );
    });

    it('should accept events with all required fields present and valid', () => {
      const completeEventArb = fc.record({
        eventType: fc.constantFrom('shift' as const, 'reminder' as const),
        eventTypeId: fc.uuid(),
        day: isoDateArb,
        startTime: fc.integer({ min: 0, max: 1439 }),
        endTime: fc.integer({ min: 0, max: 1439 }),
      });

      fc.assert(
        fc.property(completeEventArb, (event) => {
          const result = validateRequiredFields(event);
          return result.isValid === true;
        }),
        { numRuns: 100 },
      );
    });

    it('should report errors only for the specific missing fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            includeEventType: fc.boolean(),
            includeEventTypeId: fc.boolean(),
            includeDay: fc.boolean(),
            includeStartTime: fc.boolean(),
            includeEndTime: fc.boolean(),
            eventType: fc.constantFrom('shift' as const, 'reminder' as const),
            eventTypeId: fc.uuid(),
            day: isoDateArb,
            startTime: fc.integer({ min: 0, max: 1439 }),
            endTime: fc.integer({ min: 0, max: 1439 }),
          }),
          (gen) => {
            const event: Partial<CalendarEvent> = {};
            if (gen.includeEventType) event.eventType = gen.eventType;
            if (gen.includeEventTypeId) event.eventTypeId = gen.eventTypeId;
            if (gen.includeDay) event.day = gen.day;
            if (gen.includeStartTime) event.startTime = gen.startTime;
            if (gen.includeEndTime) event.endTime = gen.endTime;

            const result = validateRequiredFields(event);

            // Check each field's error matches its inclusion
            const hasEventTypeError = 'eventType' in result.errors;
            const hasEventTypeIdError = 'eventTypeId' in result.errors;
            const hasDayError = 'day' in result.errors;
            const hasStartTimeError = 'startTime' in result.errors;
            const hasEndTimeError = 'endTime' in result.errors;

            return (
              hasEventTypeError === !gen.includeEventType &&
              hasEventTypeIdError === !gen.includeEventTypeId &&
              hasDayError === !gen.includeDay &&
              hasStartTimeError === !gen.includeStartTime &&
              hasEndTimeError === !gen.includeEndTime
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
