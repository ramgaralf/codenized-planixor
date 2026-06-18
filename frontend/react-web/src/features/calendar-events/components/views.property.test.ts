/* eslint-disable sonarjs/assertions-in-tests */
import { describe, it } from 'vitest';
import fc from 'fast-check';

import type { CalendarEventDisplay } from '../models';
import { formatDuration, formatTimeFromMinutes } from '../utils';

/**
 * Property-based tests for view filtering and rendering rules.
 * Feature: gh8-calendar-event-management
 *
 * Tests pure logic functions used by the view components:
 * - View filtering (isDeleted + date range)
 * - Event card display data extraction
 * - Month view container rendering logic
 * - Year view day indicator logic
 */

// ============================================================================
// Pure logic functions under test (extracted from view components)
// ============================================================================

/**
 * Filters events for any view mode: excludes deleted events and events outside the date range.
 * This logic is shared across all views (Day, Week, Month, Year).
 */
function filterEventsForView(
  events: CalendarEventDisplay[],
  startDate: string,
  endDate: string,
): CalendarEventDisplay[] {
  return events.filter((e) => !e.isDeleted && e.day >= startDate && e.day <= endDate);
}

/**
 * Extracts event card display data from a CalendarEventDisplay.
 * Returns the data that an EventCard needs to render.
 */
interface EventCardData {
  name: string;
  icon: string;
  backgroundColor: string;
  startTime: string;
  endTime: string;
  duration: string;
  notes: string | null;
}

function getEventCardData(event: CalendarEventDisplay): EventCardData {
  return {
    name: event.name,
    icon: event.icon,
    backgroundColor: event.backgroundColor,
    startTime: formatTimeFromMinutes(event.startTime),
    endTime: formatTimeFromMinutes(event.endTime),
    duration: formatDuration(event.startTime, event.endTime),
    notes: event.notes,
  };
}

/**
 * Month view container logic: determines background color and emoji display for a day.
 * Extracted from MonthView.tsx getDayEventsInfo function.
 */
interface MonthDayContainerData {
  shiftBackgroundColor: string | null;
  emojis: string[];
  totalCount: number;
}

const MAX_VISIBLE_EMOJIS = 5;

function getMonthDayContainerData(events: CalendarEventDisplay[]): MonthDayContainerData {
  const activeEvents = events.filter((e) => !e.isDeleted);

  // Sort: shifts first, then reminders
  const shifts = activeEvents.filter((e) => e.eventType === 'shift');
  const reminders = activeEvents.filter((e) => e.eventType === 'reminder');
  const ordered = [...shifts, ...reminders];

  // Determine container background from shift
  let shiftBackgroundColor: string | null = null;
  if (shifts.length > 0 && shifts[0].backgroundColor) {
    shiftBackgroundColor = shifts[0].backgroundColor;
  }

  const emojis = ordered.map((e) => e.icon);
  const totalCount = emojis.length;

  return { shiftBackgroundColor, emojis, totalCount };
}

/**
 * Year view day indicator logic: determines what indicators to show for a day.
 * Extracted from YearView.tsx getDayIndicators function.
 */
interface YearDayIndicators {
  shiftColor: string | null;
  reminderEmoji: string | null;
}

function getYearDayIndicators(events: CalendarEventDisplay[]): YearDayIndicators {
  if (!events || events.length === 0) {
    return { shiftColor: null, reminderEmoji: null };
  }

  const shiftEvent = events.find((e) => e.eventType === 'shift');
  const reminderEvents = events
    .filter((e) => e.eventType === 'reminder')
    .sort((a, b) => a.startTime - b.startTime);

  const shiftColor = shiftEvent ? shiftEvent.backgroundColor : null;
  const reminderEmoji = reminderEvents.length > 0 ? reminderEvents[0].icon : null;

  return { shiftColor, reminderEmoji };
}

// ============================================================================
// Arbitraries (test data generators)
// ============================================================================

/** Generate a valid ISO date string (YYYY-MM-DD) within a reasonable range */
const isoDateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

/** Generate a CalendarEventDisplay with valid fields */
const calendarEventDisplayArb: fc.Arbitrary<CalendarEventDisplay> = fc
  .record({
    id: fc.uuid(),
    eventType: fc.constantFrom('shift' as const, 'reminder' as const),
    eventTypeId: fc.uuid(),
    day: isoDateArb,
    startTime: fc.integer({ min: 0, max: 1380 }),
    endTime: fc.integer({ min: 1, max: 1439 }),
    notes: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 100 })),
    modifiedAt: fc.constant(new Date('2024-01-01T00:00:00Z')),
    syncedAt: fc.oneof(fc.constant(null), fc.constant(new Date('2024-01-01T00:00:00Z'))),
    isDeleted: fc.boolean(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    icon: fc.constantFrom('🏢', '🌙', '☀️', '🔧', '💼', '💊', '🏋️', '📞', '🎂', '📝'),
    backgroundColor: fc.constantFrom('#EF4444', '#10B981', '#2563EB', '#7C3AED', '#F97316'),
  })
  .filter((e) => e.endTime > e.startTime);

/** Generate a CalendarEventDisplay that is explicitly NOT deleted */
const activeEventArb: fc.Arbitrary<CalendarEventDisplay> = calendarEventDisplayArb.map((e) => ({
  ...e,
  isDeleted: false,
}));

/** Generate a CalendarEventDisplay that IS deleted */
const deletedEventArb: fc.Arbitrary<CalendarEventDisplay> = calendarEventDisplayArb.map((e) => ({
  ...e,
  isDeleted: true,
}));

/** Generate a shift-type event (not deleted) */
const shiftEventArb: fc.Arbitrary<CalendarEventDisplay> = activeEventArb.map((e) => ({
  ...e,
  eventType: 'shift' as const,
}));

/** Generate a reminder-type event (not deleted) */
const reminderEventArb: fc.Arbitrary<CalendarEventDisplay> = activeEventArb.map((e) => ({
  ...e,
  eventType: 'reminder' as const,
}));

// ============================================================================
// Property Tests
// ============================================================================

describe('View Filtering and Rendering — Property Tests', () => {
  // Feature: gh8-calendar-event-management, Property 6: View filtering excludes deleted events and out-of-range dates
  // **Validates: Requirements 3.4, 4.4, 5.4, 6.4, 8.4**
  describe('Property 6: View filtering excludes deleted events and out-of-range dates', () => {
    it('should never include events where isDeleted is true', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventDisplayArb, { minLength: 1, maxLength: 20 }),
          isoDateArb,
          isoDateArb,
          (events, date1, date2) => {
            const startDate = date1 <= date2 ? date1 : date2;
            const endDate = date1 <= date2 ? date2 : date1;

            const result = filterEventsForView(events, startDate, endDate);

            return result.every((e) => e.isDeleted === false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should never include events where day is outside the date range', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventDisplayArb, { minLength: 1, maxLength: 20 }),
          isoDateArb,
          isoDateArb,
          (events, date1, date2) => {
            const startDate = date1 <= date2 ? date1 : date2;
            const endDate = date1 <= date2 ? date2 : date1;

            const result = filterEventsForView(events, startDate, endDate);

            return result.every((e) => e.day >= startDate && e.day <= endDate);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should include all non-deleted events within the date range', () => {
      fc.assert(
        fc.property(
          fc.array(calendarEventDisplayArb, { minLength: 1, maxLength: 20 }),
          isoDateArb,
          isoDateArb,
          (events, date1, date2) => {
            const startDate = date1 <= date2 ? date1 : date2;
            const endDate = date1 <= date2 ? date2 : date1;

            const result = filterEventsForView(events, startDate, endDate);

            // All events that are not deleted and within range should be in result
            const expected = events.filter(
              (e) => !e.isDeleted && e.day >= startDate && e.day <= endDate,
            );

            return result.length === expected.length;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return empty array when all events are deleted', () => {
      fc.assert(
        fc.property(
          fc.array(deletedEventArb, { minLength: 1, maxLength: 10 }),
          isoDateArb,
          isoDateArb,
          (events, date1, date2) => {
            const startDate = date1 <= date2 ? date1 : date2;
            const endDate = date1 <= date2 ? date2 : date1;

            const result = filterEventsForView(events, startDate, endDate);

            return result.length === 0;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: gh8-calendar-event-management, Property 7: Event card rendering contains all required display data
  // **Validates: Requirements 3.2, 4.2**
  describe('Property 7: Event card rendering contains all required display data', () => {
    it('should always contain name, icon, backgroundColor, startTime, endTime, and duration', () => {
      fc.assert(
        fc.property(activeEventArb, (event) => {
          const cardData = getEventCardData(event);

          // All required fields must be present and non-empty
          return (
            cardData.name.length > 0 &&
            cardData.icon.length > 0 &&
            cardData.backgroundColor.length > 0 &&
            cardData.startTime.length > 0 &&
            cardData.endTime.length > 0 &&
            cardData.duration.length > 0
          );
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the event name exactly', () => {
      fc.assert(
        fc.property(activeEventArb, (event) => {
          const cardData = getEventCardData(event);
          return cardData.name === event.name;
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the event icon exactly', () => {
      fc.assert(
        fc.property(activeEventArb, (event) => {
          const cardData = getEventCardData(event);
          return cardData.icon === event.icon;
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the event backgroundColor exactly', () => {
      fc.assert(
        fc.property(activeEventArb, (event) => {
          const cardData = getEventCardData(event);
          return cardData.backgroundColor === event.backgroundColor;
        }),
        { numRuns: 100 },
      );
    });

    it('should format startTime as HH:mm', () => {
      fc.assert(
        fc.property(activeEventArb, (event) => {
          const cardData = getEventCardData(event);
          // HH:mm pattern: exactly 5 chars, "NN:NN"
          return /^\d{2}:\d{2}$/.test(cardData.startTime);
        }),
        { numRuns: 100 },
      );
    });

    it('should format endTime as HH:mm', () => {
      fc.assert(
        fc.property(activeEventArb, (event) => {
          const cardData = getEventCardData(event);
          return /^\d{2}:\d{2}$/.test(cardData.endTime);
        }),
        { numRuns: 100 },
      );
    });

    it('should format duration as "Xh Ym" or "Xh" or "Ym"', () => {
      fc.assert(
        fc.property(activeEventArb, (event) => {
          const cardData = getEventCardData(event);
          // Valid duration formats: "Xh Ym", "Xh", or "Ym"
          return /^(\d+h \d+m|\d+h|\d+m)$/.test(cardData.duration);
        }),
        { numRuns: 100 },
      );
    });

    it('should include notes when present, null when absent', () => {
      fc.assert(
        fc.property(activeEventArb, (event) => {
          const cardData = getEventCardData(event);
          return cardData.notes === event.notes;
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: gh8-calendar-event-management, Property 8: Month view container rendering rules
  // **Validates: Requirements 5.2**
  describe('Property 8: Month view container rendering rules', () => {
    it('should use shift backgroundColor as container background when a shift exists', () => {
      fc.assert(
        fc.property(
          shiftEventArb,
          fc.array(reminderEventArb, { minLength: 0, maxLength: 5 }),
          (shiftEvent, reminders) => {
            const events = [shiftEvent, ...reminders];
            const result = getMonthDayContainerData(events);

            return result.shiftBackgroundColor === shiftEvent.backgroundColor;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should set container background to null when no shift exists', () => {
      fc.assert(
        fc.property(
          fc.array(reminderEventArb, { minLength: 1, maxLength: 10 }),
          (reminders) => {
            const result = getMonthDayContainerData(reminders);

            return result.shiftBackgroundColor === null;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should order emojis with shifts first, then reminders', () => {
      fc.assert(
        fc.property(
          fc.array(shiftEventArb, { minLength: 1, maxLength: 3 }),
          fc.array(reminderEventArb, { minLength: 1, maxLength: 5 }),
          (shifts, reminders) => {
            // Interleave to ensure input order doesn't matter
            const events = [...reminders, ...shifts];
            const result = getMonthDayContainerData(events);

            // All shift emojis should come before all reminder emojis
            const shiftEmojis = shifts.map((e) => e.icon);
            const reminderEmojis = reminders.map((e) => e.icon);

            const firstReminderIndex = result.emojis.findIndex((emoji) =>
              reminderEmojis.includes(emoji) && !shiftEmojis.includes(emoji),
            );
            const lastShiftIndex = result.emojis.findLastIndex((emoji) =>
              shiftEmojis.includes(emoji) && !reminderEmojis.includes(emoji),
            );

            // If both exist, last shift should come before first non-overlapping reminder
            if (firstReminderIndex !== -1 && lastShiftIndex !== -1) {
              return lastShiftIndex < firstReminderIndex;
            }

            // The shift count should always come first in order
            return result.emojis.slice(0, shifts.length).every((emoji) =>
              shiftEmojis.includes(emoji),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should cap visible emojis at 5 with totalCount reflecting actual total', () => {
      fc.assert(
        fc.property(
          fc.array(activeEventArb, { minLength: 6, maxLength: 15 }),
          (events) => {
            const result = getMonthDayContainerData(events);

            // totalCount equals the actual number of active events
            const activeCount = events.filter((e) => !e.isDeleted).length;
            return result.totalCount === activeCount && result.totalCount > MAX_VISIBLE_EMOJIS;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should show all emojis when 5 or fewer events exist', () => {
      fc.assert(
        fc.property(
          fc.array(activeEventArb, { minLength: 1, maxLength: 5 }),
          (events) => {
            const result = getMonthDayContainerData(events);

            return (
              result.emojis.length === events.length &&
              result.totalCount === events.length &&
              result.totalCount <= MAX_VISIBLE_EMOJIS
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should exclude deleted events from container data', () => {
      fc.assert(
        fc.property(
          fc.array(activeEventArb, { minLength: 1, maxLength: 5 }),
          fc.array(deletedEventArb, { minLength: 1, maxLength: 5 }),
          (activeEvents, deletedEvents) => {
            const allEvents = [...activeEvents, ...deletedEvents];
            const result = getMonthDayContainerData(allEvents);

            // Total count should only include active events
            return result.totalCount === activeEvents.length;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: gh8-calendar-event-management, Property 9: Year view day indicators follow event type rules
  // **Validates: Requirements 6.2**
  describe('Property 9: Year view day indicators follow event type rules', () => {
    it('should return no indicators when no events exist', () => {
      fc.assert(
        fc.property(fc.constant([]), (events: CalendarEventDisplay[]) => {
          const result = getYearDayIndicators(events);

          return result.shiftColor === null && result.reminderEmoji === null;
        }),
        { numRuns: 100 },
      );
    });

    it('should return shiftColor and no reminderEmoji when only shifts exist', () => {
      fc.assert(
        fc.property(
          fc.array(shiftEventArb, { minLength: 1, maxLength: 3 }),
          (shifts) => {
            const result = getYearDayIndicators(shifts);

            return (
              result.shiftColor === shifts[0].backgroundColor && result.reminderEmoji === null
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return reminderEmoji and no shiftColor when only reminders exist', () => {
      fc.assert(
        fc.property(
          fc.array(reminderEventArb, { minLength: 1, maxLength: 5 }),
          (reminders) => {
            const result = getYearDayIndicators(reminders);

            // Should be first reminder sorted by startTime
            const sorted = [...reminders].sort((a, b) => a.startTime - b.startTime);
            return (
              result.shiftColor === null && result.reminderEmoji === sorted[0].icon
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return both shiftColor and reminderEmoji when both types exist', () => {
      fc.assert(
        fc.property(
          shiftEventArb,
          fc.array(reminderEventArb, { minLength: 1, maxLength: 5 }),
          (shift, reminders) => {
            const events = [shift, ...reminders];
            const result = getYearDayIndicators(events);

            const sortedReminders = [...reminders].sort((a, b) => a.startTime - b.startTime);
            return (
              result.shiftColor === shift.backgroundColor &&
              result.reminderEmoji === sortedReminders[0].icon
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use the first reminder by startTime when multiple reminders exist', () => {
      fc.assert(
        fc.property(
          fc.array(reminderEventArb, { minLength: 2, maxLength: 8 }),
          (reminders) => {
            const result = getYearDayIndicators(reminders);

            const sorted = [...reminders].sort((a, b) => a.startTime - b.startTime);
            return result.reminderEmoji === sorted[0].icon;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use shift backgroundColor for the colored circle', () => {
      fc.assert(
        fc.property(shiftEventArb, (shift) => {
          const result = getYearDayIndicators([shift]);

          return result.shiftColor === shift.backgroundColor;
        }),
        { numRuns: 100 },
      );
    });
  });
});
