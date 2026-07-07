import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { generateSeriesDates } from './seriesGenerator';

/**
 * Property-based tests for Series Generator.
 *
 * Feature: gh38-reminder-series, Property 4: Series Date Generation Correctness
 * Feature: gh38-reminder-series, Property 7: Maximum Occurrence Cap
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.8, 7.2**
 */

// --- Generators ---

/** Generate a random date in 2020–2030 range as YYYY-MM-DD */
const validDateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([year, month, day]) => {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  });

/** Generate dates that specifically target month boundaries (28, 29, 30, 31) */
const monthBoundaryDateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.constantFrom(28, 29, 30, 31),
  )
  .filter(([year, month, day]) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth;
  })
  .map(([year, month, day]) => {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  });

/** Generate leap year Feb 29 dates */
const leapYearFeb29Arb = fc
  .constantFrom(2020, 2024, 2028)
  .map((year) => `${year}-02-29`);

/** Generate Dec 31 dates to test year boundary edge cases */
const dec31Arb = fc
  .integer({ min: 2020, max: 2029 })
  .map((year) => `${year}-12-31`);

/** Combine all date generators with appropriate weighting */
const startDayArb = fc.oneof(
  { weight: 5, arbitrary: validDateArb },
  { weight: 2, arbitrary: monthBoundaryDateArb },
  { weight: 1, arbitrary: leapYearFeb29Arb },
  { weight: 1, arbitrary: dec31Arb },
);

const frequencyArb = fc.constantFrom('weekly', 'monthly', 'yearly') as fc.Arbitrary<
  'weekly' | 'monthly' | 'yearly'
>;

/** Generate a year boundary that is >= startDate year to ensure some results */
const yearBoundaryArb = (startDay: string) => {
  const startYear = parseInt(startDay.split('-')[0], 10);
  return fc.integer({ min: startYear, max: startYear + 10 });
};

// --- Helper functions ---

const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getYear = (dateStr: string): number => parseInt(dateStr.split('-')[0], 10);
const getMonth = (dateStr: string): number => parseInt(dateStr.split('-')[1], 10);
const getDay = (dateStr: string): number => parseInt(dateStr.split('-')[2], 10);

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

const daysBetween = (a: string, b: string): number => {
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
};

// --- Property 4: Series Date Generation Correctness ---

describe('Feature: gh38-reminder-series, Property 4: Series Date Generation Correctness', () => {
  it('should produce all dates strictly after the start date', () => {
    fc.assert(
      fc.property(
        startDayArb.chain((startDay) =>
          fc.tuple(fc.constant(startDay), frequencyArb, yearBoundaryArb(startDay)),
        ),
        ([startDay, frequency, yearBoundary]) => {
          const results = generateSeriesDates({ startDay, frequency, yearBoundary });
          const startDate = parseDate(startDay);
          for (const dateStr of results) {
            expect(parseDate(dateStr).getTime()).toBeGreaterThan(startDate.getTime());
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce all dates within the year boundary', () => {
    fc.assert(
      fc.property(
        startDayArb.chain((startDay) =>
          fc.tuple(fc.constant(startDay), frequencyArb, yearBoundaryArb(startDay)),
        ),
        ([startDay, frequency, yearBoundary]) => {
          const results = generateSeriesDates({ startDay, frequency, yearBoundary });
          for (const dateStr of results) {
            expect(getYear(dateStr)).toBeLessThanOrEqual(yearBoundary);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce exactly 7-day intervals for weekly frequency', () => {
    fc.assert(
      fc.property(
        startDayArb.chain((startDay) =>
          fc.tuple(fc.constant(startDay), yearBoundaryArb(startDay)),
        ),
        ([startDay, yearBoundary]) => {
          const results = generateSeriesDates({ startDay, frequency: 'weekly', yearBoundary });
          if (results.length === 0) return;

          // First date is 7 days after start
          expect(daysBetween(startDay, results[0])).toBe(7);

          // Each consecutive pair differs by exactly 7 days
          for (let i = 1; i < results.length; i++) {
            expect(daysBetween(results[i - 1], results[i])).toBe(7);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce same day-of-month (or clamped to last day) for monthly frequency', () => {
    fc.assert(
      fc.property(
        startDayArb.chain((startDay) =>
          fc.tuple(fc.constant(startDay), yearBoundaryArb(startDay)),
        ),
        ([startDay, yearBoundary]) => {
          const results = generateSeriesDates({ startDay, frequency: 'monthly', yearBoundary });
          const sourceDay = getDay(startDay);

          for (const dateStr of results) {
            const resultDay = getDay(dateStr);
            const resultYear = getYear(dateStr);
            const resultMonth = getMonth(dateStr);
            const daysInMonth = getDaysInMonth(resultYear, resultMonth);

            if (sourceDay <= daysInMonth) {
              expect(resultDay).toBe(sourceDay);
            } else {
              // Clamped to last day of month
              expect(resultDay).toBe(daysInMonth);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce same month and day (or Feb 29 clamped to Feb 28) for yearly frequency', () => {
    fc.assert(
      fc.property(
        startDayArb.chain((startDay) =>
          fc.tuple(fc.constant(startDay), yearBoundaryArb(startDay)),
        ),
        ([startDay, yearBoundary]) => {
          const results = generateSeriesDates({ startDay, frequency: 'yearly', yearBoundary });
          const sourceMonth = getMonth(startDay);
          const sourceDay = getDay(startDay);

          for (const dateStr of results) {
            const resultMonth = getMonth(dateStr);
            const resultDay = getDay(dateStr);
            const resultYear = getYear(dateStr);

            expect(resultMonth).toBe(sourceMonth);

            if (sourceMonth === 2 && sourceDay === 29 && !isLeapYear(resultYear)) {
              expect(resultDay).toBe(28);
            } else {
              expect(resultDay).toBe(sourceDay);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should be deterministic (same inputs produce same outputs)', () => {
    fc.assert(
      fc.property(
        startDayArb.chain((startDay) =>
          fc.tuple(fc.constant(startDay), frequencyArb, yearBoundaryArb(startDay)),
        ),
        ([startDay, frequency, yearBoundary]) => {
          const result1 = generateSeriesDates({ startDay, frequency, yearBoundary });
          const result2 = generateSeriesDates({ startDay, frequency, yearBoundary });
          expect(result1).toEqual(result2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should never include the source date in results', () => {
    fc.assert(
      fc.property(
        startDayArb.chain((startDay) =>
          fc.tuple(fc.constant(startDay), frequencyArb, yearBoundaryArb(startDay)),
        ),
        ([startDay, frequency, yearBoundary]) => {
          const results = generateSeriesDates({ startDay, frequency, yearBoundary });
          expect(results).not.toContain(startDay);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Property 7: Maximum Occurrence Cap ---

describe('Feature: gh38-reminder-series, Property 7: Maximum Occurrence Cap', () => {
  it('should produce at most 366 occurrence records for any input', () => {
    fc.assert(
      fc.property(
        startDayArb.chain((startDay) =>
          fc.tuple(fc.constant(startDay), frequencyArb, yearBoundaryArb(startDay)),
        ),
        ([startDay, frequency, yearBoundary]) => {
          const results = generateSeriesDates({ startDay, frequency, yearBoundary });
          expect(results.length).toBeLessThanOrEqual(366);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce at most 366 records even with large year boundaries', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom('2020-01-01', '2020-01-02', '2021-01-01'),
          frequencyArb,
          fc.integer({ min: 2050, max: 2100 }),
        ),
        ([startDay, frequency, yearBoundary]) => {
          const results = generateSeriesDates({ startDay, frequency, yearBoundary });
          expect(results.length).toBeLessThanOrEqual(366);
        },
      ),
      { numRuns: 100 },
    );
  });
});
