import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';
import type { CalendarEvent } from '@features/calendar-events/models';

import { propagateReminderChanges } from './reminderPropagation';

const REMINDER_ID = 'reminder-prop-test-001';

const currentYear = new Date().getFullYear();
const previousYear = currentYear - 1;

/**
 * Helper: format a date as ISO string (YYYY-MM-DD).
 */
const formatDate = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/**
 * Arbitrary: generates a valid day-of-year as { month, day } that forms a valid date.
 * We use month 1-12 and day constrained per month for simplicity.
 */
const dayInYearArb = (year: number): fc.Arbitrary<string> =>
  fc.integer({ min: 1, max: 12 }).chain((month) => {
    const maxDay = new Date(year, month, 0).getDate();
    return fc.integer({ min: 1, max: maxDay }).map((day) => formatDate(year, month, day));
  });

/**
 * Arbitrary: generates a valid current-year date string.
 */
const currentYearDayArb = dayInYearArb(currentYear);

/**
 * Arbitrary: generates a valid previous-year date string.
 */
const previousYearDayArb = dayInYearArb(previousYear);

/**
 * Arbitrary: generates valid minutes from midnight (0-1439).
 */
const minutesArb = fc.integer({ min: 0, max: 1439 });

/**
 * Arbitrary: generates a valid totalHours value (0-1440).
 */
const totalHoursArb = fc.integer({ min: 0, max: 1440 });

/**
 * Helper to build a calendar event for testing.
 */
const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: crypto.randomUUID(),
  eventType: 'reminder',
  eventTypeId: REMINDER_ID,
  startDay: formatDate(currentYear, 6, 15),
  endDay: formatDate(currentYear, 6, 15),
  startTime: 480,
  endTime: 540,
  totalHours: 60,
  notes: null,
  modifiedAt: new Date('2025-01-01T00:00:00Z'),
  syncedAt: new Date('2025-01-01T00:00:00Z'),
  isDeleted: false,
  alertOffsets: [],
  ...overrides,
});

describe('Feature: gh18-calendar-shift-reminder-improvements, Property 4: Propagation only affects current-year events', () => {
  /**
   * **Validates: Requirements 7.3, 7.6**
   *
   * For any set of reminder-type calendar events with various startDays
   * (some current year, some previous years):
   *   After calling propagateReminderChanges(reminderId), only events in the
   *   current year should have updated modifiedAt/syncedAt.
   *   Events in other years should remain unchanged.
   */

  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('should update modifiedAt and set syncedAt to null only for current-year events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(currentYearDayArb, { minLength: 1, maxLength: 5 }),
        fc.array(previousYearDayArb, { minLength: 1, maxLength: 5 }),
        minutesArb,
        minutesArb,
        totalHoursArb,
        async (currentYearDays, previousYearDays, startTime, endTime, totalHours) => {
          await db.calendarEvents.clear();

          const originalModifiedAt = new Date('2025-01-01T00:00:00Z');
          const originalSyncedAt = new Date('2025-01-01T00:00:00Z');

          // Create current-year events
          const currentYearIds: string[] = [];
          for (const day of currentYearDays) {
            const id = crypto.randomUUID();
            currentYearIds.push(id);
            await db.calendarEvents.add(
              createEvent({
                id,
                startDay: day,
                endDay: day,
                startTime,
                endTime,
                totalHours,
                modifiedAt: originalModifiedAt,
                syncedAt: originalSyncedAt,
              }),
            );
          }

          // Create previous-year events
          const previousYearIds: string[] = [];
          for (const day of previousYearDays) {
            const id = crypto.randomUUID();
            previousYearIds.push(id);
            await db.calendarEvents.add(
              createEvent({
                id,
                startDay: day,
                endDay: day,
                startTime,
                endTime,
                totalHours,
                modifiedAt: originalModifiedAt,
                syncedAt: originalSyncedAt,
              }),
            );
          }

          const before = new Date();
          await propagateReminderChanges(REMINDER_ID);

          // Current-year events should have updated modifiedAt and syncedAt = null
          for (const id of currentYearIds) {
            const event = await db.calendarEvents.get(id);
            expect(event).toBeDefined();
            expect(event!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(event!.syncedAt).toBeNull();
          }

          // Previous-year events should remain unchanged
          for (const id of previousYearIds) {
            const event = await db.calendarEvents.get(id);
            expect(event).toBeDefined();
            expect(event!.modifiedAt.getTime()).toBe(originalModifiedAt.getTime());
            expect(event!.syncedAt).not.toBeNull();
            expect(event!.syncedAt!.getTime()).toBe(originalSyncedAt.getTime());
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});

describe('Feature: gh18-calendar-shift-reminder-improvements, Property 6: Propagation touches modifiedAt/syncedAt for reminders', () => {
  /**
   * **Validates: Requirements 7.3, 7.8**
   *
   * For any propagation:
   *   All affected current-year events should have modifiedAt set to a recent
   *   timestamp and syncedAt set to null.
   *   No other event fields (startTime, endTime, totalHours, startDay, endDay, etc.)
   *   should be modified.
   */

  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('should set modifiedAt to a recent timestamp and syncedAt to null without modifying other fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        currentYearDayArb,
        minutesArb,
        minutesArb,
        totalHoursArb,
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.array(fc.constantFrom(0, 10, 60, 1440), { minLength: 0, maxLength: 4 }),
        async (startDay, startTime, endTime, totalHours, notes, alertOffsets) => {
          await db.calendarEvents.clear();

          const originalModifiedAt = new Date('2025-01-01T00:00:00Z');
          const originalSyncedAt = new Date('2025-01-01T00:00:00Z');
          const eventId = crypto.randomUUID();

          await db.calendarEvents.add(
            createEvent({
              id: eventId,
              startDay,
              endDay: startDay,
              startTime,
              endTime,
              totalHours,
              notes: notes || null,
              alertOffsets,
              modifiedAt: originalModifiedAt,
              syncedAt: originalSyncedAt,
            }),
          );

          const before = new Date();
          await propagateReminderChanges(REMINDER_ID);

          const updated = await db.calendarEvents.get(eventId);
          expect(updated).toBeDefined();

          // modifiedAt should be recent and syncedAt should be null
          expect(updated!.modifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(updated!.syncedAt).toBeNull();

          // All other fields should remain unchanged
          expect(updated!.id).toBe(eventId);
          expect(updated!.eventType).toBe('reminder');
          expect(updated!.eventTypeId).toBe(REMINDER_ID);
          expect(updated!.startDay).toBe(startDay);
          expect(updated!.endDay).toBe(startDay);
          expect(updated!.startTime).toBe(startTime);
          expect(updated!.endTime).toBe(endTime);
          expect(updated!.totalHours).toBe(totalHours);
          expect(updated!.notes).toBe(notes || null);
          expect(updated!.isDeleted).toBe(false);
          expect(updated!.alertOffsets).toEqual(alertOffsets);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});
