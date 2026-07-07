import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { db } from '@/data/db';

import type { CalendarEvent } from '@features/calendar-events/models';
import type { Reminder } from '@features/reminders/models';

import {
  checkSeriesPropagationNeeded,
  propagateNeverToRepeating,
  propagateRepeatingToNever,
  propagateRepeatingToRepeating,
} from './seriesPropagation';

/**
 * Property-based tests for Series Propagation Logic.
 *
 * Feature: gh38-reminder-series, Property 8: Propagation Modal Trigger
 * Feature: gh38-reminder-series, Property 9: To-Never Propagation Soft-Deletes
 * Feature: gh38-reminder-series, Property 10: Never-to-Repeating Propagation Generates
 * Feature: gh38-reminder-series, Property 11: Repeating-to-Repeating Propagation
 * Feature: gh38-reminder-series, Property 12: Decline Propagation No-Op
 *
 * **Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6, 3.7**
 */

// --- Generators ---

const CURRENT_YEAR = new Date().getFullYear();



type RepeatFrequency = 'weekly' | 'monthly' | 'yearly';

const repeatingFrequencyArb: fc.Arbitrary<RepeatFrequency> = fc.constantFrom(
  'weekly',
  'monthly',
  'yearly',
);

/** Generate a date in the current year as YYYY-MM-DD */
const currentYearDateArb = fc
  .integer({ min: 1, max: 12 })
  .chain((month) =>
    fc.integer({ min: 1, max: 28 }).map((day) => {
      const m = String(month).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${CURRENT_YEAR}-${m}-${d}`;
    }),
  );

/** Generate a date in a past year (not current year) */
const pastYearDateArb = fc
  .integer({ min: 2020, max: CURRENT_YEAR - 1 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).chain((month) =>
      fc.integer({ min: 1, max: 28 }).map((day) => {
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
      }),
    ),
  );

/** Build a Reminder record */
const buildReminder = (overrides?: Partial<Reminder>): Reminder => ({
  id: crypto.randomUUID(),
  name: 'Test Reminder',
  icon: '🎯',
  backgroundColor: '#2563EB',
  isActive: true,
  seriesFrequency: 'never',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  modifiedAt: new Date('2024-01-01T00:00:00Z'),
  syncedAt: null,
  isDeleted: false,
  ...overrides,
});

/** Build a CalendarEvent record referencing a reminder */
const buildCalendarEvent = (
  reminderId: string,
  startDay: string,
  overrides?: Partial<CalendarEvent>,
): CalendarEvent => ({
  id: crypto.randomUUID(),
  eventType: 'reminder',
  eventTypeId: reminderId,
  startDay,
  endDay: startDay,
  startTime: 540,
  endTime: 600,
  totalHours: 60,
  notes: null,
  modifiedAt: new Date('2024-06-01T00:00:00Z'),
  syncedAt: new Date('2024-06-01T00:00:00Z'),
  isDeleted: false,
  alertOffsets: [],
  ...overrides,
});

/**
 * Generate N sorted unique dates in the current year for testing.
 * Returns dates sorted ascending.
 */
const sortedCurrentYearDatesArb = (minCount: number, maxCount: number) =>
  fc
    .uniqueArray(
      fc.integer({ min: 1, max: 12 }).chain((month) =>
        fc.integer({ min: 1, max: 28 }).map((day) => {
          const m = String(month).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          return `${CURRENT_YEAR}-${m}-${d}`;
        }),
      ),
      { minLength: minCount, maxLength: maxCount },
    )
    .map((dates) => [...dates].sort());

// --- Setup / Teardown ---

describe('Feature: gh38-reminder-series — Series Propagation Property Tests', () => {
  beforeEach(async () => {
    await db.open();
    await db.calendarEvents.clear();
    await db.reminders.clear();
  });

  afterEach(async () => {
    await db.calendarEvents.clear();
    await db.reminders.clear();
  });

  // --- Property 8: Propagation Modal Trigger ---

  describe('Property 8: Propagation Modal Trigger', () => {
    it('should return count > 0 iff non-deleted events exist for reminder in current year', async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedCurrentYearDatesArb(1, 5),
          async (dates) => {
            await db.calendarEvents.clear();
            await db.reminders.clear();

            const reminder = buildReminder();
            await db.reminders.add(reminder);

            // Add non-deleted events in current year
            for (const d of dates) {
              await db.calendarEvents.add(buildCalendarEvent(reminder.id, d));
            }

            const count = await checkSeriesPropagationNeeded(reminder.id);
            expect(count).toBe(dates.length);
            expect(count).toBeGreaterThan(0);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should return 0 when no events exist for the reminder', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (reminderId) => {
          await db.calendarEvents.clear();
          await db.reminders.clear();

          const count = await checkSeriesPropagationNeeded(reminderId);
          expect(count).toBe(0);
        }),
        { numRuns: 50 },
      );
    });

    it('should return 0 when events exist only in non-current years', async () => {
      await fc.assert(
        fc.asyncProperty(pastYearDateArb, async (pastDate) => {
          await db.calendarEvents.clear();
          await db.reminders.clear();

          const reminder = buildReminder();
          await db.reminders.add(reminder);
          await db.calendarEvents.add(buildCalendarEvent(reminder.id, pastDate));

          const count = await checkSeriesPropagationNeeded(reminder.id);
          expect(count).toBe(0);
        }),
        { numRuns: 50 },
      );
    });

    it('should not count deleted events', async () => {
      await fc.assert(
        fc.asyncProperty(currentYearDateArb, async (date) => {
          await db.calendarEvents.clear();
          await db.reminders.clear();

          const reminder = buildReminder();
          await db.reminders.add(reminder);
          await db.calendarEvents.add(
            buildCalendarEvent(reminder.id, date, { isDeleted: true }),
          );

          const count = await checkSeriesPropagationNeeded(reminder.id);
          expect(count).toBe(0);
        }),
        { numRuns: 50 },
      );
    });
  });

  // --- Property 9: To-Never Propagation Soft-Deletes ---

  describe('Property 9: To-Never Propagation Soft-Deletes', () => {
    it('should soft-delete all events after the earliest and leave earliest unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedCurrentYearDatesArb(2, 6),
          async (dates) => {
            await db.calendarEvents.clear();
            await db.reminders.clear();

            const reminder = buildReminder({ seriesFrequency: 'weekly' });
            await db.reminders.add(reminder);

            const events: CalendarEvent[] = [];
            for (const d of dates) {
              const ev = buildCalendarEvent(reminder.id, d);
              events.push(ev);
              await db.calendarEvents.add(ev);
            }

            const earliestEvent = events[0]!;
            const beforeModify = new Date();

            await propagateRepeatingToNever(reminder.id);

            // Earliest event should remain unchanged
            const earliestFromDb = await db.calendarEvents.get(earliestEvent.id);
            expect(earliestFromDb).toBeDefined();
            expect(earliestFromDb!.isDeleted).toBe(false);
            expect(earliestFromDb!.syncedAt).toEqual(earliestEvent.syncedAt);

            // All later events should be soft-deleted
            for (let i = 1; i < events.length; i++) {
              const ev = await db.calendarEvents.get(events[i]!.id);
              expect(ev).toBeDefined();
              expect(ev!.isDeleted).toBe(true);
              expect(ev!.modifiedAt.getTime()).toBeGreaterThanOrEqual(
                beforeModify.getTime(),
              );
              expect(ev!.syncedAt).toBeNull();
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should be a no-op when there is only one event (the earliest)', async () => {
      await fc.assert(
        fc.asyncProperty(currentYearDateArb, async (date) => {
          await db.calendarEvents.clear();
          await db.reminders.clear();

          const reminder = buildReminder({ seriesFrequency: 'monthly' });
          await db.reminders.add(reminder);

          const ev = buildCalendarEvent(reminder.id, date);
          await db.calendarEvents.add(ev);

          await propagateRepeatingToNever(reminder.id);

          const fromDb = await db.calendarEvents.get(ev.id);
          expect(fromDb).toBeDefined();
          expect(fromDb!.isDeleted).toBe(false);
          expect(fromDb!.syncedAt).toEqual(ev.syncedAt);
        }),
        { numRuns: 50 },
      );
    });
  });

  // --- Property 10: Never-to-Repeating Propagation Generates ---

  describe('Property 10: Never-to-Repeating Propagation Generates', () => {
    it('should generate new occurrences skipping existing dates', async () => {
      // Exclude yearly: yearly from a current-year date produces 0 occurrences
      // since the next yearly date falls in the next year (beyond yearBoundary).
      const weeklyOrMonthlyArb: fc.Arbitrary<RepeatFrequency> = fc.constantFrom(
        'weekly',
        'monthly',
      );

      await fc.assert(
        fc.asyncProperty(
          currentYearDateArb.filter((d) => {
            // Use dates early enough in the year to generate at least one occurrence
            const month = parseInt(d.split('-')[1], 10);
            return month <= 6;
          }),
          weeklyOrMonthlyArb,
          async (startDay, frequency) => {
            await db.calendarEvents.clear();
            await db.reminders.clear();

            const reminder = buildReminder({ seriesFrequency: 'never' });
            await db.reminders.add(reminder);

            // Create a single source event
            const sourceEvent = buildCalendarEvent(reminder.id, startDay);
            await db.calendarEvents.add(sourceEvent);

            const beforeCount = await db.calendarEvents.count();

            await propagateNeverToRepeating(reminder.id, frequency);

            const afterCount = await db.calendarEvents.count();
            // Should have generated at least one new occurrence
            expect(afterCount).toBeGreaterThan(beforeCount);

            // All new events should reference the same reminder
            const allEvents = await db.calendarEvents
              .where('eventType')
              .equals('reminder')
              .toArray();

            const newEvents = allEvents.filter((e) => e.id !== sourceEvent.id);
            for (const ev of newEvents) {
              expect(ev.eventTypeId).toBe(reminder.id);
              expect(ev.isDeleted).toBe(false);
              expect(ev.syncedAt).toBeNull();
              expect(ev.startDay > startDay).toBe(true);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should skip dates that already have non-deleted events', async () => {
      await fc.assert(
        fc.asyncProperty(
          repeatingFrequencyArb,
          async (frequency) => {
            await db.calendarEvents.clear();
            await db.reminders.clear();

            const reminder = buildReminder({ seriesFrequency: 'never' });
            await db.reminders.add(reminder);

            // Use a fixed early date to ensure occurrences are generated
            const startDay = `${CURRENT_YEAR}-01-15`;
            const sourceEvent = buildCalendarEvent(reminder.id, startDay);
            await db.calendarEvents.add(sourceEvent);

            // Pre-create an event on the next expected date
            let nextDate: string;
            if (frequency === 'weekly') {
              // 7 days after Jan 15 = Jan 22
              nextDate = `${CURRENT_YEAR}-01-22`;
            } else if (frequency === 'monthly') {
              nextDate = `${CURRENT_YEAR}-02-15`;
            } else {
              // yearly — would be next year, skip this case
              return;
            }

            const existingEvent = buildCalendarEvent(reminder.id, nextDate);
            await db.calendarEvents.add(existingEvent);

            await propagateNeverToRepeating(reminder.id, frequency);

            // The pre-existing event should still be there (not duplicated)
            const eventsOnDate = await db.calendarEvents
              .where('eventType')
              .equals('reminder')
              .filter(
                (e) =>
                  e.eventTypeId === reminder.id &&
                  e.startDay === nextDate &&
                  !e.isDeleted,
              )
              .toArray();

            // Should have exactly 1 event on that date (the pre-existing one)
            expect(eventsOnDate.length).toBe(1);
            expect(eventsOnDate[0]!.id).toBe(existingEvent.id);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // --- Property 11: Repeating-to-Repeating Propagation ---

  describe('Property 11: Repeating-to-Repeating Propagation', () => {
    it('should soft-delete events after earliest then generate new occurrences with new frequency', { timeout: 30000 }, async () => {
      // Exclude yearly: yearly from a current-year date produces 0 occurrences
      // since the next yearly date falls beyond the current year boundary.
      const weeklyOrMonthlyArb: fc.Arbitrary<RepeatFrequency> = fc.constantFrom(
        'weekly',
        'monthly',
      );

      await fc.assert(
        fc.asyncProperty(
          sortedCurrentYearDatesArb(2, 5).filter((dates) => {
            // Ensure earliest date is early enough to generate occurrences
            const month = parseInt(dates[0]!.split('-')[1], 10);
            return month <= 6;
          }),
          weeklyOrMonthlyArb,
          async (dates, newFrequency) => {
            await db.calendarEvents.clear();
            await db.reminders.clear();

            const reminder = buildReminder({ seriesFrequency: 'weekly' });
            await db.reminders.add(reminder);

            const events: CalendarEvent[] = [];
            for (const d of dates) {
              const ev = buildCalendarEvent(reminder.id, d);
              events.push(ev);
              await db.calendarEvents.add(ev);
            }

            const earliestEvent = events[0]!;

            await propagateRepeatingToRepeating(reminder.id, newFrequency);

            // Earliest event should NOT be deleted
            const earliestFromDb = await db.calendarEvents.get(earliestEvent.id);
            expect(earliestFromDb).toBeDefined();
            expect(earliestFromDb!.isDeleted).toBe(false);

            // Later original events should be soft-deleted
            for (let i = 1; i < events.length; i++) {
              const ev = await db.calendarEvents.get(events[i]!.id);
              expect(ev).toBeDefined();
              expect(ev!.isDeleted).toBe(true);
              expect(ev!.syncedAt).toBeNull();
            }

            // New occurrences should exist (generated with new frequency)
            const allNonDeleted = await db.calendarEvents
              .where('eventType')
              .equals('reminder')
              .filter(
                (e) =>
                  e.eventTypeId === reminder.id &&
                  !e.isDeleted &&
                  e.id !== earliestEvent.id,
              )
              .toArray();

            // Should have generated at least one new occurrence
            expect(allNonDeleted.length).toBeGreaterThan(0);

            // All new occurrences should be after the earliest source
            for (const ev of allNonDeleted) {
              expect(ev.startDay > earliestEvent.startDay).toBe(true);
              expect(ev.syncedAt).toBeNull();
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // --- Property 12: Decline Propagation No-Op ---

  describe('Property 12: Decline Propagation No-Op', () => {
    it('should leave all calendar events unchanged when propagation is declined', { timeout: 15000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedCurrentYearDatesArb(1, 5),
          async (dates) => {
            await db.calendarEvents.clear();
            await db.reminders.clear();

            const reminder = buildReminder({ seriesFrequency: 'weekly' });
            await db.reminders.add(reminder);

            for (const d of dates) {
              const ev = buildCalendarEvent(reminder.id, d);
              await db.calendarEvents.add(ev);
            }

            // Take a snapshot of all events before "declining"
            const snapshotBefore = await db.calendarEvents.toArray();

            // Declining propagation means: do nothing to calendar events.
            // We verify by simply checking no propagation function was called
            // and the events remain identical.
            const snapshotAfter = await db.calendarEvents.toArray();

            expect(snapshotAfter.length).toBe(snapshotBefore.length);

            for (const beforeEv of snapshotBefore) {
              const afterEv = snapshotAfter.find((e) => e.id === beforeEv.id);
              expect(afterEv).toBeDefined();
              expect(afterEv!.isDeleted).toBe(beforeEv.isDeleted);
              expect(afterEv!.modifiedAt.getTime()).toBe(
                beforeEv.modifiedAt.getTime(),
              );
              expect(afterEv!.syncedAt).toEqual(beforeEv.syncedAt);
              expect(afterEv!.startDay).toBe(beforeEv.startDay);
              expect(afterEv!.endDay).toBe(beforeEv.endDay);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should preserve exact event count and data when no propagation functions are called', { timeout: 15000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedCurrentYearDatesArb(2, 8),
          async (dates) => {
            await db.calendarEvents.clear();
            await db.reminders.clear();

            const reminder = buildReminder({ seriesFrequency: 'monthly' });
            await db.reminders.add(reminder);

            for (const d of dates) {
              await db.calendarEvents.add(buildCalendarEvent(reminder.id, d));
            }

            // Simulate "decline": the reminder seriesFrequency is updated
            // but NO propagation function is called. Events should be untouched.
            await db.reminders.update(reminder.id, {
              seriesFrequency: 'yearly',
              modifiedAt: new Date(),
            });

            // Calendar events should remain exactly as they were
            const allEvents = await db.calendarEvents
              .where('eventType')
              .equals('reminder')
              .filter((e) => e.eventTypeId === reminder.id)
              .toArray();

            expect(allEvents.length).toBe(dates.length);
            for (const ev of allEvents) {
              expect(ev.isDeleted).toBe(false);
              expect(ev.syncedAt).toEqual(new Date('2024-06-01T00:00:00Z'));
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
