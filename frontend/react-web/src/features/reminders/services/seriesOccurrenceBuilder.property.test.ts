import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import type { CalendarEvent } from '@features/calendar-events/models';

import { buildOccurrences } from './seriesOccurrenceBuilder';

/**
 * Property-based tests for seriesOccurrenceBuilder.
 * Feature: gh38-reminder-series, Property 5: Occurrence Field Preservation
 * Feature: gh38-reminder-series, Property 6: Day Span Preservation
 *
 * Validates: Requirements 2.5, 4.1, 4.2
 */

/** Generates a valid ISO date string (YYYY-MM-DD) in range 2020–2030 */
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

/** Adds N days to a YYYY-MM-DD date string */
const addDays = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year!, month! - 1, day! + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Computes the day difference between two YYYY-MM-DD strings */
const dayDiff = (startDay: string, endDay: string): number => {
  const [sy, sm, sd] = startDay.split('-').map(Number);
  const [ey, em, ed] = endDay.split('-').map(Number);
  const start = new Date(sy!, sm! - 1, sd!);
  const end = new Date(ey!, em! - 1, ed!);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
};

/** Generates a valid CalendarEvent with configurable day span (0–5 days) */
const calendarEventArb: fc.Arbitrary<CalendarEvent> = fc
  .tuple(
    fc.uuid(),
    fc.constantFrom('shift' as const, 'reminder' as const),
    fc.uuid(),
    isoDateArb,
    fc.integer({ min: 0, max: 5 }),
    fc.integer({ min: 0, max: 1439 }),
    fc.integer({ min: 0, max: 1439 }),
    fc.integer({ min: 0, max: 1440 }),
    fc.oneof(fc.constant(null), fc.string({ maxLength: 250 })),
    fc.array(fc.constantFrom(0, 10, 60, 1440), { minLength: 0, maxLength: 4 }),
  )
  .map(([id, eventType, eventTypeId, startDay, daySpan, startTime, endTime, totalHours, notes, alertOffsets]) => ({
    id,
    eventType,
    eventTypeId,
    startDay,
    endDay: daySpan === 0 ? startDay : addDays(startDay, daySpan),
    startTime,
    endTime,
    totalHours,
    notes,
    alertOffsets,
    modifiedAt: new Date('2025-01-15T10:00:00Z'),
    syncedAt: new Date('2025-01-15T10:00:00Z'),
    isDeleted: false,
  }));

/** Generates an array of date strings simulating seriesGenerator output */
const generatedDatesArb = fc.array(isoDateArb, { minLength: 1, maxLength: 20 });

describe('Feature: gh38-reminder-series, Property 5: Occurrence Field Preservation', () => {
  it('should assign distinct UUIDs to every occurrence (different from source and each other)', () => {
    fc.assert(
      fc.property(calendarEventArb, generatedDatesArb, (sourceEvent, dates) => {
        const occurrences = buildOccurrences({ sourceEvent, dates });

        const allIds = [sourceEvent.id, ...occurrences.map((o) => o.id)];
        const uniqueIds = new Set(allIds);

        expect(uniqueIds.size).toBe(allIds.length);
      }),
      { numRuns: 100 },
    );
  });

  it('should copy eventType and eventTypeId from source to all occurrences', () => {
    fc.assert(
      fc.property(calendarEventArb, generatedDatesArb, (sourceEvent, dates) => {
        const occurrences = buildOccurrences({ sourceEvent, dates });

        for (const occurrence of occurrences) {
          expect(occurrence.eventType).toBe(sourceEvent.eventType);
          expect(occurrence.eventTypeId).toBe(sourceEvent.eventTypeId);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should copy startTime, endTime, totalHours, notes, and alertOffsets from source to all occurrences', () => {
    fc.assert(
      fc.property(calendarEventArb, generatedDatesArb, (sourceEvent, dates) => {
        const occurrences = buildOccurrences({ sourceEvent, dates });

        for (const occurrence of occurrences) {
          expect(occurrence.startTime).toBe(sourceEvent.startTime);
          expect(occurrence.endTime).toBe(sourceEvent.endTime);
          expect(occurrence.totalHours).toBe(sourceEvent.totalHours);
          expect(occurrence.notes).toBe(sourceEvent.notes);
          expect(occurrence.alertOffsets).toEqual(sourceEvent.alertOffsets);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should set syncedAt to null for all occurrences regardless of source syncedAt', () => {
    fc.assert(
      fc.property(calendarEventArb, generatedDatesArb, (sourceEvent, dates) => {
        const occurrences = buildOccurrences({ sourceEvent, dates });

        for (const occurrence of occurrences) {
          expect(occurrence.syncedAt).toBeNull();
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should set isDeleted to false for all occurrences', () => {
    fc.assert(
      fc.property(calendarEventArb, generatedDatesArb, (sourceEvent, dates) => {
        const occurrences = buildOccurrences({ sourceEvent, dates });

        for (const occurrence of occurrences) {
          expect(occurrence.isDeleted).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gh38-reminder-series, Property 6: Day Span Preservation', () => {
  it('should produce endDay = startDay + N days for all occurrences where N is the source day span', () => {
    fc.assert(
      fc.property(calendarEventArb, generatedDatesArb, (sourceEvent, dates) => {
        const sourceDaySpan = dayDiff(sourceEvent.startDay, sourceEvent.endDay);
        const occurrences = buildOccurrences({ sourceEvent, dates });

        for (let i = 0; i < occurrences.length; i++) {
          const occurrence = occurrences[i]!;
          const occurrenceDaySpan = dayDiff(occurrence.startDay, occurrence.endDay);

          expect(occurrenceDaySpan).toBe(sourceDaySpan);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should set occurrence startDay to the corresponding generated date', () => {
    fc.assert(
      fc.property(calendarEventArb, generatedDatesArb, (sourceEvent, dates) => {
        const occurrences = buildOccurrences({ sourceEvent, dates });

        for (let i = 0; i < occurrences.length; i++) {
          expect(occurrences[i]!.startDay).toBe(dates[i]);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should compute endDay as startDay + source day span for multi-day events', () => {
    const multiDayEventArb = fc
      .tuple(
        fc.uuid(),
        fc.constantFrom('shift' as const, 'reminder' as const),
        fc.uuid(),
        isoDateArb,
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 1439 }),
        fc.integer({ min: 0, max: 1439 }),
        fc.integer({ min: 0, max: 1440 }),
        fc.oneof(fc.constant(null), fc.string({ maxLength: 250 })),
        fc.array(fc.constantFrom(0, 10, 60, 1440), { minLength: 0, maxLength: 4 }),
      )
      .map(([id, eventType, eventTypeId, startDay, daySpan, startTime, endTime, totalHours, notes, alertOffsets]) => ({
        id,
        eventType,
        eventTypeId,
        startDay,
        endDay: addDays(startDay, daySpan),
        startTime,
        endTime,
        totalHours,
        notes,
        alertOffsets,
        modifiedAt: new Date('2025-01-15T10:00:00Z'),
        syncedAt: new Date('2025-01-15T10:00:00Z'),
        isDeleted: false,
      }));

    fc.assert(
      fc.property(multiDayEventArb, generatedDatesArb, (sourceEvent, dates) => {
        const sourceDaySpan = dayDiff(sourceEvent.startDay, sourceEvent.endDay);
        const occurrences = buildOccurrences({ sourceEvent, dates });

        expect(sourceDaySpan).toBeGreaterThan(0);

        for (const occurrence of occurrences) {
          const expectedEndDay = addDays(occurrence.startDay, sourceDaySpan);
          expect(occurrence.endDay).toBe(expectedEndDay);
        }
      }),
      { numRuns: 100 },
    );
  });
});
