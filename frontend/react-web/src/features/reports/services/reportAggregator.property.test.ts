import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import type { CalendarEvent } from '@features/calendar-events/models';
import type { TypeAggregate } from '../models';

import {
  formatDuration,
  normalizeTotalMinutes,
  filterEventsForPeriod,
  aggregateByType,
  computePercentages,
  computeDonutSegments,
  sortByTotalDescending,
} from './reportAggregator';

/**
 * Property-based tests for the report aggregation engine.
 * Uses fast-check with minimum 100 iterations per property.
 */

const NUM_RUNS = 100;

describe('reportAggregator — property tests (Properties 1–6)', () => {
  /**
   * Property 1: Duration formatter decomposition is correct
   * For any non-negative integer totalMinutes, formatDuration(totalMinutes)
   * produces "{X}h {Y}m" where X*60+Y == totalMinutes.
   *
   * **Validates: Requirements 2.11, 3.11, 5.10, 6.9, 13.1**
   */
  describe('Property 1: Duration formatter decomposition is correct', () => {
    it('should produce "{X}h {Y}m" where X*60+Y == totalMinutes for any non-negative integer', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 100000 }),
          (totalMinutes) => {
            const result = formatDuration(totalMinutes);
            const match = result.match(/^(\d+)h (\d+)m$/);
            expect(match).not.toBeNull();

            const x = Number(match![1]);
            const y = Number(match![2]);
            expect(x * 60 + y).toBe(totalMinutes);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });

  /**
   * Property 2: Non-positive minutes normalize to "0h 0m"
   * For any integer <= 0, normalizeTotalMinutes returns 0.
   *
   * **Validates: Requirements 13.2, 13.5**
   */
  describe('Property 2: Non-positive minutes normalize to "0h 0m"', () => {
    it('should return 0 for any integer <= 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000000, max: 0 }),
          (value) => {
            expect(normalizeTotalMinutes(value)).toBe(0);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });

  /**
   * Property 3: Aggregation includes only non-deleted events of correct type within period
   * filterEventsForPeriod includes event iff isDeleted===false AND startDay >= startDate
   * AND startDay <= endDate. endDay does NOT affect inclusion.
   *
   * **Validates: Requirements 2.9, 2.10, 3.8, 3.9, 5.8, 5.9, 6.7, 6.8**
   */
  describe('Property 3: Aggregation includes only non-deleted events of correct type within period', () => {
    const dateArb = fc.tuple(
      fc.integer({ min: 2020, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) =>
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    );

    const eventArb = fc.record({
      id: fc.uuid(),
      eventType: fc.constantFrom('shift' as const, 'reminder' as const),
      eventTypeId: fc.uuid(),
      startDay: dateArb,
      endDay: dateArb,
      startTime: fc.integer({ min: 0, max: 1439 }),
      endTime: fc.integer({ min: 0, max: 1439 }),
      totalHours: fc.nat({ max: 1440 }),
      notes: fc.constant(null),
      modifiedAt: fc.constant(new Date()),
      syncedAt: fc.constant(null),
      isDeleted: fc.boolean(),
    }) as fc.Arbitrary<CalendarEvent>;

    it('should include event iff isDeleted===false AND startDay in [startDate, endDate]', () => {
      fc.assert(
        fc.property(
          fc.array(eventArb, { minLength: 0, maxLength: 20 }),
          dateArb,
          dateArb,
          (events, date1, date2) => {
            const startDate = date1 <= date2 ? date1 : date2;
            const endDate = date1 <= date2 ? date2 : date1;

            const result = filterEventsForPeriod(events, startDate, endDate);

            // All included events must satisfy the criteria
            for (const event of result) {
              expect(event.isDeleted).toBe(false);
              expect(event.startDay >= startDate).toBe(true);
              expect(event.startDay <= endDate).toBe(true);
            }

            // Every event in the original list that satisfies the criteria must be included
            for (const event of events) {
              const shouldBeIncluded =
                !event.isDeleted &&
                event.startDay >= startDate &&
                event.startDay <= endDate;
              const isIncluded = result.includes(event);
              expect(isIncluded).toBe(shouldBeIncluded);
            }
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });

  /**
   * Property 4: Grand total equals sum of per-type totals
   * Sum of all values in aggregateByType result equals sum of all input events' totalHours.
   *
   * **Validates: Requirements 2.5, 2.7, 3.5, 3.7, 5.4, 5.6, 6.4, 6.6**
   */
  describe('Property 4: Grand total equals sum of per-type totals', () => {
    const eventArb = fc.record({
      id: fc.uuid(),
      eventType: fc.constant('shift' as const),
      eventTypeId: fc.stringMatching(/^type-[a-z]$/),
      startDay: fc.constant('2025-06-15'),
      endDay: fc.constant('2025-06-15'),
      startTime: fc.constant(480),
      endTime: fc.constant(960),
      totalHours: fc.nat({ max: 10000 }),
      notes: fc.constant(null),
      modifiedAt: fc.constant(new Date()),
      syncedAt: fc.constant(null),
      isDeleted: fc.constant(false),
    }) as fc.Arbitrary<CalendarEvent>;

    it('should have the sum of all per-type totals equal to the sum of all events totalHours', () => {
      fc.assert(
        fc.property(
          fc.array(eventArb, { minLength: 0, maxLength: 30 }),
          (events) => {
            const result = aggregateByType(events);

            const sumOfPerTypeTotals = Array.from(result.values()).reduce(
              (sum, val) => sum + val,
              0,
            );
            const sumOfAllEvents = events.reduce(
              (sum, e) => sum + e.totalHours,
              0,
            );

            expect(sumOfPerTypeTotals).toBe(sumOfAllEvents);
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });

  /**
   * Property 5: Relative percentages sum to 100% when no annual config
   * computePercentages without configuredHours returns percentages that sum to 100 (±epsilon).
   *
   * **Validates: Requirements 2.5, 3.5, 5.4, 6.4**
   */
  describe('Property 5: Relative percentages sum to 100% when no annual config', () => {
    it('should produce percentages summing to 100% (±epsilon) for non-empty maps with positive grand total', () => {
      const positiveMinutesArb = fc.integer({ min: 1, max: 50000 });
      const totalsMapArb = fc
        .array(
          fc.tuple(fc.uuid(), positiveMinutesArb),
          { minLength: 1, maxLength: 10 },
        )
        .map((entries) => new Map(entries));

      fc.assert(
        fc.property(totalsMapArb, (totalsMap) => {
          const result = computePercentages(totalsMap);
          const sum = Array.from(result.values()).reduce(
            (acc, val) => acc + val,
            0,
          );

          expect(sum).toBeCloseTo(100, 10);
        }),
        { numRuns: NUM_RUNS },
      );
    });
  });

  /**
   * Property 6: Bar chart ordering is descending by total hours
   * sortByTotalDescending result is in non-increasing order of totalMinutes.
   *
   * **Validates: Requirements 2.4, 3.4, 5.3, 6.3**
   */
  describe('Property 6: Bar chart ordering is descending by total hours', () => {
    const aggregateArb = fc.record({
      typeId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 10 }),
      icon: fc.constant('🏢'),
      backgroundColor: fc.constant('#2563EB'),
      totalMinutes: fc.nat({ max: 100000 }),
      percentage: fc.double({ min: 0, max: 100, noNaN: true }),
    }) as fc.Arbitrary<TypeAggregate>;

    it('should return aggregates in non-increasing order of totalMinutes', () => {
      fc.assert(
        fc.property(
          fc.array(aggregateArb, { minLength: 0, maxLength: 20 }),
          (aggregates) => {
            const result = sortByTotalDescending(aggregates);

            for (let i = 1; i < result.length; i++) {
              expect(result[i - 1].totalMinutes).toBeGreaterThanOrEqual(
                result[i].totalMinutes,
              );
            }
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  });
});

describe('reportAggregator — Property Tests (Properties 9–11)', () => {
  describe('Property 9: Donut minimum arc for sub-1% segments', () => {
    /**
     * **Validates: Requirements 2.6, 3.6**
     *
     * For any type aggregate whose percentage is > 0 but < 1,
     * computeDonutSegments sets it to minimum 1%.
     */
    it('should set sub-1% segments (> 0 and < 1) to minimum 1%', () => {
      fc.assert(
        fc.property(
          fc.record({
            dominantMinutes: fc.integer({ min: 100, max: 100000 }),
            smallMinutes: fc.integer({ min: 1, max: 50 }),
          }).filter(({ dominantMinutes, smallMinutes }) => {
            // Ensure the small type produces a percentage > 0 but < 1
            const total = dominantMinutes + smallMinutes;
            const smallPercentage = (smallMinutes / total) * 100;
            return smallPercentage > 0 && smallPercentage < 1;
          }),
          ({ dominantMinutes, smallMinutes }) => {
            const totalsMap = new Map<string, number>([
              ['dominant', dominantMinutes],
              ['small', smallMinutes],
            ]);

            const percentages = computePercentages(totalsMap);
            const segments = computeDonutSegments(percentages);

            const smallSegment = segments.find((s) => s.typeId === 'small');
            expect(smallSegment).toBeDefined();
            expect(smallSegment!.percentage).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not modify segments that are exactly 0%', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100000 }),
          (dominantMinutes) => {
            const totalsMap = new Map<string, number>([
              ['dominant', dominantMinutes],
              ['zero', 0],
            ]);

            const percentages = computePercentages(totalsMap);
            const segments = computeDonutSegments(percentages);

            const zeroSegment = segments.find((s) => s.typeId === 'zero');
            expect(zeroSegment).toBeDefined();
            expect(zeroSegment!.percentage).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not modify segments that are >= 1%', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 2, maxLength: 10 }).filter(
            (values) => {
              const total = values.reduce((s, v) => s + v, 0);
              return values.every((v) => (v / total) * 100 >= 1);
            },
          ),
          (minuteValues) => {
            const totalsMap = new Map<string, number>();
            minuteValues.forEach((val, idx) => {
              totalsMap.set(`type-${idx}`, val);
            });

            const percentages = computePercentages(totalsMap);
            const segments = computeDonutSegments(percentages);

            for (const segment of segments) {
              const originalPercentage = percentages.get(segment.typeId)!;
              // If original was >= 1, segment should keep original value
              expect(segment.percentage).toBe(originalPercentage);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 10: Single type yields exactly 100.0% in donut', () => {
    /**
     * **Validates: Requirements 6.5**
     *
     * When computeDonutSegments receives a Map with exactly one entry
     * (regardless of its percentage value), the output is exactly 100.0%.
     */
    it('should return exactly 100.0% when only one type exists', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.001, max: 1000, noNaN: true }),
          (percentage) => {
            const percentages = new Map<string, number>([['only-type', percentage]]);
            const segments = computeDonutSegments(percentages);

            expect(segments).toHaveLength(1);
            expect(segments[0].typeId).toBe('only-type');
            expect(segments[0].percentage).toBe(100.0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return exactly 100.0% for single type with any positive minutes (relative mode)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (minutes) => {
            const totalsMap = new Map<string, number>([['single', minutes]]);
            const percentages = computePercentages(totalsMap);
            const segments = computeDonutSegments(percentages);

            expect(segments).toHaveLength(1);
            expect(segments[0].percentage).toBe(100.0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 11: Annual percentages use configured hours as denominator', () => {
    /**
     * **Validates: Requirements 5.5**
     *
     * For any set of type totals and configured hours,
     * computePercentages(totals, configuredHours) computes each percentage
     * as (typeMinutes / (configuredHours * 60)) * 100.
     */
    it('should compute each percentage as (typeMinutes / (configuredHours * 60)) * 100', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              minutes: fc.integer({ min: 0, max: 100000 }),
            }),
            { minLength: 1, maxLength: 10 },
          ).chain((entries) => {
            // Ensure unique IDs
            const uniqueEntries = entries.filter(
              (entry, idx, arr) => arr.findIndex((e) => e.id === entry.id) === idx,
            );
            return fc.record({
              entries: fc.constant(uniqueEntries.length > 0 ? uniqueEntries : [{ id: 'a', minutes: 100 }]),
              configuredHours: fc.integer({ min: 1, max: 8784 }),
            });
          }),
          ({ entries, configuredHours }) => {
            const totalsMap = new Map<string, number>();
            for (const entry of entries) {
              totalsMap.set(entry.id, entry.minutes);
            }

            const percentages = computePercentages(totalsMap, configuredHours);
            const denominator = configuredHours * 60;

            for (const [typeId, minutes] of totalsMap) {
              const expected = (minutes / denominator) * 100;
              const actual = percentages.get(typeId);
              expect(actual).toBeDefined();
              expect(actual).toBeCloseTo(expected, 10);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should allow percentages to exceed 100% when actual hours surpass configured hours', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (configuredHours) => {
            // Create minutes that exceed configured hours
            const exceedingMinutes = configuredHours * 60 + 1;
            const totalsMap = new Map<string, number>([['type-a', exceedingMinutes]]);

            const percentages = computePercentages(totalsMap, configuredHours);
            const percentage = percentages.get('type-a')!;

            expect(percentage).toBeGreaterThan(100);
            const expected = (exceedingMinutes / (configuredHours * 60)) * 100;
            expect(percentage).toBeCloseTo(expected, 10);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
