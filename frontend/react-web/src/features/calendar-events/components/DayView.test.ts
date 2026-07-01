import { describe, it, expect } from 'vitest';

import type { CalendarEventDisplay } from '../models';
import { getEffectiveTimes } from '../utils';

/**
 * Unit tests for DayView event positioning logic.
 *
 * After the fix for computeEndDayForShift (endTime <= startTime → +1 day),
 * a 24-hour shift (startTime === endTime) will have endDay = startDay + 1,
 * making it a multi-day event. The getEffectiveTimes function handles it
 * via the standard multi-day path:
 * - On startDay: effectiveStart = startTime, effectiveEnd = 1439 (full day)
 * - On endDay: effectiveStart = 0, effectiveEnd = endTime (0 minutes — correct)
 */

const makeEvent = (overrides: Partial<CalendarEventDisplay>): CalendarEventDisplay => ({
  id: 'test-id',
  eventType: 'shift',
  eventTypeId: 'shift-1',
  startDay: '2025-06-20',
  endDay: '2025-06-20',
  startTime: 0,
  endTime: 0,
  totalHours: 1440,
  notes: null,
  modifiedAt: new Date(),
  syncedAt: null,
  isDeleted: false,
  alertOffsets: [],
  name: 'Test Shift',
  icon: '🏢',
  backgroundColor: '#2563EB',
  ...overrides,
});

describe('getEffectiveTimes', () => {
  describe('24-hour shift (startTime === endTime, multi-day after fix)', () => {
    it('should return startTime to 1439 on start day for a 24-hour shift (00:00→00:00)', () => {
      // After computeEndDayForShift fix, endDay = startDay + 1
      const event = makeEvent({
        startTime: 0,
        endTime: 0,
        eventType: 'shift',
        startDay: '2025-06-20',
        endDay: '2025-06-21',
      });
      const result = getEffectiveTimes(event, '2025-06-20');

      expect(result.effectiveStart).toBe(0);
      expect(result.effectiveEnd).toBe(1439);
    });

    it('should return 0 to endTime on end day for a 24-hour shift (00:00→00:00)', () => {
      // On the end day, the shift ends at 00:00 (minute 0), so nothing renders.
      // The DayView filters out events with effectiveEnd <= effectiveStart.
      const event = makeEvent({
        startTime: 0,
        endTime: 0,
        eventType: 'shift',
        startDay: '2025-06-20',
        endDay: '2025-06-21',
      });
      const result = getEffectiveTimes(event, '2025-06-21');

      expect(result.effectiveStart).toBe(0);
      expect(result.effectiveEnd).toBe(0);
    });

    it('should return startTime to 1439 on start day for a 24-hour shift starting at 08:00', () => {
      // 08:00→08:00 shift: starts at 480, ends at 480 next day
      const event = makeEvent({
        startTime: 480,
        endTime: 480,
        eventType: 'shift',
        startDay: '2025-06-20',
        endDay: '2025-06-21',
      });
      const result = getEffectiveTimes(event, '2025-06-20');

      expect(result.effectiveStart).toBe(480);
      expect(result.effectiveEnd).toBe(1439);
    });

    it('should return 0 to endTime on end day for a 24-hour shift starting at 08:00', () => {
      const event = makeEvent({
        startTime: 480,
        endTime: 480,
        eventType: 'shift',
        startDay: '2025-06-20',
        endDay: '2025-06-21',
      });
      const result = getEffectiveTimes(event, '2025-06-21');

      expect(result.effectiveStart).toBe(0);
      expect(result.effectiveEnd).toBe(480);
    });
  });

  describe('reminder with startTime === endTime (0-duration point event, same day)', () => {
    it('should return effectiveEnd = endTime (same as startTime) for reminders', () => {
      const event = makeEvent({ startTime: 0, endTime: 0, eventType: 'reminder' });
      const result = getEffectiveTimes(event, '2025-06-20');

      expect(result.effectiveStart).toBe(0);
      expect(result.effectiveEnd).toBe(0);
    });
  });

  describe('normal same-day event (startTime !== endTime)', () => {
    it('should return actual start and end times for a shift', () => {
      const event = makeEvent({ startTime: 480, endTime: 960, eventType: 'shift' });
      const result = getEffectiveTimes(event, '2025-06-20');

      expect(result.effectiveStart).toBe(480);
      expect(result.effectiveEnd).toBe(960);
    });

    it('should return actual start and end times for a reminder', () => {
      const event = makeEvent({ startTime: 120, endTime: 180, eventType: 'reminder' });
      const result = getEffectiveTimes(event, '2025-06-20');

      expect(result.effectiveStart).toBe(120);
      expect(result.effectiveEnd).toBe(180);
    });
  });

  describe('multi-day event', () => {
    it('should return startTime to 1439 on the start day', () => {
      const event = makeEvent({ startDay: '2025-06-20', endDay: '2025-06-21', startTime: 480, endTime: 120 });
      const result = getEffectiveTimes(event, '2025-06-20');

      expect(result.effectiveStart).toBe(480);
      expect(result.effectiveEnd).toBe(1439);
    });

    it('should return 0 to endTime on the end day', () => {
      const event = makeEvent({ startDay: '2025-06-20', endDay: '2025-06-21', startTime: 480, endTime: 120 });
      const result = getEffectiveTimes(event, '2025-06-21');

      expect(result.effectiveStart).toBe(0);
      expect(result.effectiveEnd).toBe(120);
    });

    it('should return 0 to 1439 on an intermediate day', () => {
      const event = makeEvent({ startDay: '2025-06-20', endDay: '2025-06-22', startTime: 480, endTime: 120 });
      const result = getEffectiveTimes(event, '2025-06-21');

      expect(result.effectiveStart).toBe(0);
      expect(result.effectiveEnd).toBe(1439);
    });
  });
});
