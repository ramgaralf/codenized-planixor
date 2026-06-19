import { describe, it, expect } from 'vitest';

import type { CalendarEvent } from '@features/calendar-events/models';
import type { TypeAggregate } from '../models';

import {
  formatDuration,
  formatHoursComparison,
  normalizeTotalMinutes,
  filterEventsForPeriod,
  aggregateByType,
  computePercentages,
  computeDonutSegments,
  sortByTotalDescending,
  createSyncBatches,
} from './reportAggregator';

const makeEvent = (
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent => ({
  id: 'evt-1',
  eventType: 'shift',
  eventTypeId: 'type-1',
  startDay: '2025-06-15',
  endDay: '2025-06-15',
  startTime: 480,
  endTime: 960,
  totalHours: 480,
  notes: null,
  modifiedAt: new Date(),
  syncedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('reportAggregator', () => {
  describe('formatDuration', () => {
    it('should format 0 minutes as "0h 0m"', () => {
      expect(formatDuration(0)).toBe('0h 0m');
    });

    it('should format 60 minutes as "1h 0m"', () => {
      expect(formatDuration(60)).toBe('1h 0m');
    });

    it('should format 150 minutes as "2h 30m"', () => {
      expect(formatDuration(150)).toBe('2h 30m');
    });

    it('should format 45 minutes as "0h 45m"', () => {
      expect(formatDuration(45)).toBe('0h 45m');
    });

    it('should format large values correctly', () => {
      expect(formatDuration(1440)).toBe('24h 0m');
    });
  });

  describe('formatHoursComparison', () => {
    it('should format comparison with matching values', () => {
      expect(formatHoursComparison(1800 * 60, 1800)).toBe('1800h 0m /\n1800h 0m');
    });

    it('should show hours and minutes for actual', () => {
      expect(formatHoursComparison(150, 3)).toBe('2h 30m /\n3h 0m');
    });

    it('should show 0h 0m when actual minutes is 0', () => {
      expect(formatHoursComparison(0, 1800)).toBe('0h 0m /\n1800h 0m');
    });
  });

  describe('normalizeTotalMinutes', () => {
    it('should return 0 for negative values', () => {
      expect(normalizeTotalMinutes(-10)).toBe(0);
    });

    it('should return 0 for zero', () => {
      expect(normalizeTotalMinutes(0)).toBe(0);
    });

    it('should return the value for positive numbers', () => {
      expect(normalizeTotalMinutes(120)).toBe(120);
    });
  });

  describe('filterEventsForPeriod', () => {
    it('should include events within the date range', () => {
      const events = [makeEvent({ startDay: '2025-06-15' })];
      const result = filterEventsForPeriod(events, '2025-06-01', '2025-06-30');
      expect(result).toHaveLength(1);
    });

    it('should exclude deleted events', () => {
      const events = [makeEvent({ startDay: '2025-06-15', isDeleted: true })];
      const result = filterEventsForPeriod(events, '2025-06-01', '2025-06-30');
      expect(result).toHaveLength(0);
    });

    it('should exclude events before the start date', () => {
      const events = [makeEvent({ startDay: '2025-05-31' })];
      const result = filterEventsForPeriod(events, '2025-06-01', '2025-06-30');
      expect(result).toHaveLength(0);
    });

    it('should exclude events after the end date', () => {
      const events = [makeEvent({ startDay: '2025-07-01' })];
      const result = filterEventsForPeriod(events, '2025-06-01', '2025-06-30');
      expect(result).toHaveLength(0);
    });

    it('should include events on the boundary dates (inclusive)', () => {
      const events = [
        makeEvent({ id: '1', startDay: '2025-06-01' }),
        makeEvent({ id: '2', startDay: '2025-06-30' }),
      ];
      const result = filterEventsForPeriod(events, '2025-06-01', '2025-06-30');
      expect(result).toHaveLength(2);
    });

    it('should NOT use endDay for inclusion', () => {
      const events = [
        makeEvent({ startDay: '2025-06-15', endDay: '2025-07-10' }),
      ];
      const result = filterEventsForPeriod(events, '2025-06-01', '2025-06-30');
      expect(result).toHaveLength(1);
    });
  });

  describe('aggregateByType', () => {
    it('should group events by eventTypeId and sum totalHours', () => {
      const events = [
        makeEvent({ eventTypeId: 'type-a', totalHours: 60 }),
        makeEvent({ eventTypeId: 'type-a', totalHours: 90 }),
        makeEvent({ eventTypeId: 'type-b', totalHours: 120 }),
      ];
      const result = aggregateByType(events);
      expect(result.get('type-a')).toEqual({ totalMinutes: 150, eventCount: 2 });
      expect(result.get('type-b')).toEqual({ totalMinutes: 120, eventCount: 1 });
    });

    it('should return an empty map for no events', () => {
      const result = aggregateByType([]);
      expect(result.size).toBe(0);
    });
  });

  describe('computePercentages', () => {
    it('should compute relative percentages without config', () => {
      const totals = new Map([
        ['type-a', { totalMinutes: 300, eventCount: 3 }],
        ['type-b', { totalMinutes: 100, eventCount: 1 }],
      ]);
      const result = computePercentages(totals);
      expect(result.get('type-a')).toBe(75);
      expect(result.get('type-b')).toBe(25);
    });

    it('should compute percentages against configured hours', () => {
      const totals = new Map([['type-a', { totalMinutes: 900, eventCount: 5 }]]);
      const result = computePercentages(totals, 10);
      // 900 / (10 * 60) * 100 = 900 / 600 * 100 = 150
      expect(result.get('type-a')).toBe(150);
    });

    it('should return 0 for all types when grand total is 0', () => {
      const totals = new Map([
        ['type-a', { totalMinutes: 0, eventCount: 0 }],
        ['type-b', { totalMinutes: 0, eventCount: 0 }],
      ]);
      const result = computePercentages(totals);
      expect(result.get('type-a')).toBe(0);
      expect(result.get('type-b')).toBe(0);
    });
  });

  describe('computeDonutSegments', () => {
    it('should set single type to exactly 100.0', () => {
      const percentages = new Map([['type-a', 75]]);
      const segments = computeDonutSegments(percentages);
      expect(segments).toEqual([{ typeId: 'type-a', percentage: 100.0 }]);
    });

    it('should set sub-1% segments to minimum 1%', () => {
      const percentages = new Map([
        ['type-a', 99.5],
        ['type-b', 0.5],
      ]);
      const segments = computeDonutSegments(percentages);
      const segmentB = segments.find((s) => s.typeId === 'type-b');
      expect(segmentB?.percentage).toBe(1);
    });

    it('should not modify segments at or above 1%', () => {
      const percentages = new Map([
        ['type-a', 70],
        ['type-b', 30],
      ]);
      const segments = computeDonutSegments(percentages);
      expect(segments).toEqual([
        { typeId: 'type-a', percentage: 70 },
        { typeId: 'type-b', percentage: 30 },
      ]);
    });

    it('should not modify 0% segments', () => {
      const percentages = new Map([
        ['type-a', 100],
        ['type-b', 0],
      ]);
      const segments = computeDonutSegments(percentages);
      const segmentB = segments.find((s) => s.typeId === 'type-b');
      expect(segmentB?.percentage).toBe(0);
    });
  });

  describe('sortByTotalDescending', () => {
    it('should sort aggregates from highest to lowest totalMinutes', () => {
      const aggregates: TypeAggregate[] = [
        { typeId: '1', name: 'A', icon: '', backgroundColor: '', totalMinutes: 50, eventCount: 1, percentage: 0 },
        { typeId: '2', name: 'B', icon: '', backgroundColor: '', totalMinutes: 200, eventCount: 4, percentage: 0 },
        { typeId: '3', name: 'C', icon: '', backgroundColor: '', totalMinutes: 100, eventCount: 2, percentage: 0 },
      ];
      const result = sortByTotalDescending(aggregates);
      expect(result[0].typeId).toBe('2');
      expect(result[1].typeId).toBe('3');
      expect(result[2].typeId).toBe('1');
    });

    it('should not mutate the original array', () => {
      const aggregates: TypeAggregate[] = [
        { typeId: '1', name: 'A', icon: '', backgroundColor: '', totalMinutes: 50, eventCount: 1, percentage: 0 },
        { typeId: '2', name: 'B', icon: '', backgroundColor: '', totalMinutes: 200, eventCount: 4, percentage: 0 },
      ];
      sortByTotalDescending(aggregates);
      expect(aggregates[0].typeId).toBe('1');
    });
  });

  describe('createSyncBatches', () => {
    it('should return empty array for empty input', () => {
      expect(createSyncBatches([])).toEqual([]);
    });

    it('should return a single batch when records fit within batchSize', () => {
      const records = [1, 2, 3];
      const result = createSyncBatches(records, 100);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should split records into multiple batches', () => {
      const records = [1, 2, 3, 4, 5];
      const result = createSyncBatches(records, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should default to batch size of 100', () => {
      const records = Array.from({ length: 250 }, (_, i) => i);
      const result = createSyncBatches(records);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(100);
      expect(result[1]).toHaveLength(100);
      expect(result[2]).toHaveLength(50);
    });
  });
});
