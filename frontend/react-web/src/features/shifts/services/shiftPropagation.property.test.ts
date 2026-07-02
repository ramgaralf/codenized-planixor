import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';
import type { CalendarEvent } from '@features/calendar-events/models';
import { computeEndDayForShift } from '@features/calendar-events/validation';

import { propagateShiftChanges } from './shiftPropagation';

const currentYear = new Date().getFullYear();
const previousYear = currentYear - 1;

/**
 * Formats a date as an ISO date string (YYYY-MM-DD).
 */
const formatDate = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/**
 * Arbitrary: generates a valid day (1-28) and month (1-12) for a given year.
 * Uses 1-28 to avoid invalid dates across all months.
 */
const dayInYearArb = (year: number): fc.Arbitrary<string> =>
  fc.integer({ min: 1, max: 12 }).chain((month) =>
    fc.integer({ min: 1, max: 28 }).map((day) => formatDate(year, month, day)),
  );

/**
 * Arbitrary: generates minutes from midnight (0–1439).
 */
const minutesArb = fc.integer({ min: 0, max: 1439 });

/**
 * Arbitrary: generates hours worked (0–1440).
 */
const hoursWorkedArb = fc.integer({ min: 0, max: 1440 });

/**
 * Creates a CalendarEvent for testing.
 */
const createEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: crypto.randomUUID(),
  eventType: 'shift',
  eventTypeId: 'shift-001',
  startDay: formatDate(currentYear, 6, 15),
  endDay: formatDate(currentYear, 6, 15),
  startTime: 480,
  endTime: 1020,
  totalHours: 540,
  notes: null,
  modifiedAt: new Date('2025-01-01T00:00:00Z'),
  syncedAt: new Date('2025-01-01T00:00:00Z'),
  isDeleted: false,
  alertOffsets: [],
  ...overrides,
});

describe('Feature: gh18-calendar-shift-reminder-improvements, Property 4: Propagation only affects current-year events', () => {
  /**
   * **Validates: Requirements 6.3, 6.6**
   *
   * For any set of shift-type calendar events with various startDays (some current year, some previous years):
   *   After calling propagateShiftChanges(shiftId, ...), only events in the current year
   *   should have updated modifiedAt/syncedAt. Events in other years should remain unchanged.
   */

  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('should only update events in the current year, leaving previous-year events unchanged', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        dayInYearArb(currentYear),
        dayInYearArb(previousYear),
        minutesArb,
        minutesArb,
        hoursWorkedArb,
        async (shiftId, currentYearDay, previousYearDay, startTime, endTime, hoursWorked) => {
          // Setup: create events in current year and previous year
          const currentYearEventId = crypto.randomUUID();
          const previousYearEventId = crypto.randomUUID();
          const originalModifiedAt = new Date('2025-01-01T00:00:00Z');
          const originalSyncedAt = new Date('2025-01-01T00:00:00Z');

          await db.calendarEvents.bulkAdd([
            createEvent({
              id: currentYearEventId,
              eventTypeId: shiftId,
              startDay: currentYearDay,
              endDay: currentYearDay,
              modifiedAt: originalModifiedAt,
              syncedAt: originalSyncedAt,
            }),
            createEvent({
              id: previousYearEventId,
              eventTypeId: shiftId,
              startDay: previousYearDay,
              endDay: previousYearDay,
              modifiedAt: originalModifiedAt,
              syncedAt: originalSyncedAt,
            }),
          ]);

          // Act
          await propagateShiftChanges(shiftId, startTime, endTime, hoursWorked);

          // Assert: current-year event was updated
          const currentYearEvent = await db.calendarEvents.get(currentYearEventId);
          expect(currentYearEvent?.modifiedAt.getTime()).toBeGreaterThan(originalModifiedAt.getTime());
          expect(currentYearEvent?.syncedAt).toBeNull();

          // Assert: previous-year event was NOT updated
          const previousYearEvent = await db.calendarEvents.get(previousYearEventId);
          expect(previousYearEvent?.modifiedAt.getTime()).toBe(originalModifiedAt.getTime());
          expect(previousYearEvent?.syncedAt?.getTime()).toBe(originalSyncedAt.getTime());

          // Cleanup for next iteration
          await db.calendarEvents.clear();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not update deleted events even in the current year', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        dayInYearArb(currentYear),
        minutesArb,
        minutesArb,
        hoursWorkedArb,
        async (shiftId, currentYearDay, startTime, endTime, hoursWorked) => {
          const deletedEventId = crypto.randomUUID();
          const originalModifiedAt = new Date('2025-01-01T00:00:00Z');
          const originalSyncedAt = new Date('2025-01-01T00:00:00Z');

          await db.calendarEvents.add(
            createEvent({
              id: deletedEventId,
              eventTypeId: shiftId,
              startDay: currentYearDay,
              endDay: currentYearDay,
              isDeleted: true,
              modifiedAt: originalModifiedAt,
              syncedAt: originalSyncedAt,
            }),
          );

          // Act
          await propagateShiftChanges(shiftId, startTime, endTime, hoursWorked);

          // Assert: deleted event was NOT updated
          const deletedEvent = await db.calendarEvents.get(deletedEventId);
          expect(deletedEvent?.modifiedAt.getTime()).toBe(originalModifiedAt.getTime());
          expect(deletedEvent?.syncedAt?.getTime()).toBe(originalSyncedAt.getTime());

          // Cleanup
          await db.calendarEvents.clear();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not update events belonging to a different shift', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        dayInYearArb(currentYear),
        minutesArb,
        minutesArb,
        hoursWorkedArb,
        async (targetShiftId, otherShiftId, currentYearDay, startTime, endTime, hoursWorked) => {
          fc.pre(targetShiftId !== otherShiftId);

          const otherShiftEventId = crypto.randomUUID();
          const originalModifiedAt = new Date('2025-01-01T00:00:00Z');
          const originalSyncedAt = new Date('2025-01-01T00:00:00Z');

          await db.calendarEvents.add(
            createEvent({
              id: otherShiftEventId,
              eventTypeId: otherShiftId,
              startDay: currentYearDay,
              endDay: currentYearDay,
              modifiedAt: originalModifiedAt,
              syncedAt: originalSyncedAt,
            }),
          );

          // Act
          await propagateShiftChanges(targetShiftId, startTime, endTime, hoursWorked);

          // Assert: other shift's event was NOT updated
          const otherEvent = await db.calendarEvents.get(otherShiftEventId);
          expect(otherEvent?.modifiedAt.getTime()).toBe(originalModifiedAt.getTime());
          expect(otherEvent?.syncedAt?.getTime()).toBe(originalSyncedAt.getTime());

          // Cleanup
          await db.calendarEvents.clear();
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gh18-calendar-shift-reminder-improvements, Property 5: Propagation updates correct fields for shifts', () => {
  /**
   * **Validates: Requirements 6.3, 6.8**
   *
   * For any propagation with given startTime, endTime, hoursWorked:
   *   All affected events should have startTime, endTime, totalHours, modifiedAt, syncedAt updated correctly.
   *   syncedAt should be null (for re-sync).
   *   endDay should be recomputed via computeEndDayForShift.
   */

  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('should update startTime, endTime, totalHours, and set syncedAt to null on all affected events', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        dayInYearArb(currentYear),
        minutesArb,
        minutesArb,
        hoursWorkedArb,
        async (shiftId, eventDay, newStartTime, newEndTime, newHoursWorked) => {
          const eventId = crypto.randomUUID();

          await db.calendarEvents.add(
            createEvent({
              id: eventId,
              eventTypeId: shiftId,
              startDay: eventDay,
              endDay: eventDay,
            }),
          );

          const before = new Date();

          // Act
          await propagateShiftChanges(shiftId, newStartTime, newEndTime, newHoursWorked);

          const after = new Date();

          // Assert
          const updated = await db.calendarEvents.get(eventId);
          expect(updated?.startTime).toBe(newStartTime);
          expect(updated?.endTime).toBe(newEndTime);
          expect(updated?.totalHours).toBe(newHoursWorked);
          expect(updated?.syncedAt).toBeNull();
          expect(updated?.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(updated?.modifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());

          // Cleanup
          await db.calendarEvents.clear();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should recompute endDay correctly via computeEndDayForShift', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        dayInYearArb(currentYear),
        minutesArb,
        minutesArb,
        hoursWorkedArb,
        async (shiftId, eventDay, newStartTime, newEndTime, newHoursWorked) => {
          const eventId = crypto.randomUUID();

          await db.calendarEvents.add(
            createEvent({
              id: eventId,
              eventTypeId: shiftId,
              startDay: eventDay,
              endDay: eventDay,
            }),
          );

          // Act
          await propagateShiftChanges(shiftId, newStartTime, newEndTime, newHoursWorked);

          // Assert: endDay matches what computeEndDayForShift would produce
          const expectedEndDay = computeEndDayForShift(eventDay, newStartTime, newEndTime);
          const updated = await db.calendarEvents.get(eventId);
          expect(updated?.endDay).toBe(expectedEndDay);

          // Cleanup
          await db.calendarEvents.clear();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should update all matching events in the current year consistently', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(dayInYearArb(currentYear), { minLength: 2, maxLength: 5 }),
        minutesArb,
        minutesArb,
        hoursWorkedArb,
        async (shiftId, eventDays, newStartTime, newEndTime, newHoursWorked) => {
          const eventIds: string[] = [];

          for (const day of eventDays) {
            const id = crypto.randomUUID();
            eventIds.push(id);
            await db.calendarEvents.add(
              createEvent({
                id,
                eventTypeId: shiftId,
                startDay: day,
                endDay: day,
              }),
            );
          }

          // Act
          await propagateShiftChanges(shiftId, newStartTime, newEndTime, newHoursWorked);

          // Assert: all events were updated with the same values
          for (let i = 0; i < eventIds.length; i++) {
            const updated = await db.calendarEvents.get(eventIds[i]);
            expect(updated?.startTime).toBe(newStartTime);
            expect(updated?.endTime).toBe(newEndTime);
            expect(updated?.totalHours).toBe(newHoursWorked);
            expect(updated?.syncedAt).toBeNull();

            const expectedEndDay = computeEndDayForShift(eventDays[i], newStartTime, newEndTime);
            expect(updated?.endDay).toBe(expectedEndDay);
          }

          // Cleanup
          await db.calendarEvents.clear();
        },
      ),
      { numRuns: 100 },
    );
  });
});
