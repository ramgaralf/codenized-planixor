import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { CalendarEvent } from '@features/calendar-events/models';

import { buildOccurrences } from './seriesOccurrenceBuilder';

const createSourceEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: '00000000-0000-0000-0000-000000000001',
  eventType: 'reminder',
  eventTypeId: 'reminder-123',
  startDay: '2025-03-15',
  endDay: '2025-03-15',
  startTime: 480, // 08:00
  endTime: 570, // 09:30
  totalHours: 90,
  notes: 'Take medicine',
  alertOffsets: [10, 60],
  modifiedAt: new Date('2025-03-01T10:00:00Z'),
  syncedAt: new Date('2025-03-01T10:00:00Z'),
  isDeleted: false,
  ...overrides,
});

describe('buildOccurrences', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty array when dates is empty', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent(),
      dates: [],
    });

    expect(result).toEqual([]);
  });

  it('should generate one occurrence per date', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent(),
      dates: ['2025-03-22', '2025-03-29', '2025-04-05'],
    });

    expect(result).toHaveLength(3);
  });

  it('should assign a unique UUID to each occurrence', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent(),
      dates: ['2025-03-22', '2025-03-29'],
    });

    expect(result[0]!.id).not.toBe(result[1]!.id);
    expect(result[0]!.id).not.toBe('00000000-0000-0000-0000-000000000001');
    expect(result[1]!.id).not.toBe('00000000-0000-0000-0000-000000000001');
  });

  it('should copy eventType and eventTypeId from source', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ eventType: 'reminder', eventTypeId: 'rem-456' }),
      dates: ['2025-04-01'],
    });

    expect(result[0]!.eventType).toBe('reminder');
    expect(result[0]!.eventTypeId).toBe('rem-456');
  });

  it('should copy startTime, endTime, and totalHours from source', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ startTime: 600, endTime: 720, totalHours: 120 }),
      dates: ['2025-04-01'],
    });

    expect(result[0]!.startTime).toBe(600);
    expect(result[0]!.endTime).toBe(720);
    expect(result[0]!.totalHours).toBe(120);
  });

  it('should copy notes from source', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ notes: 'Weekly check-in' }),
      dates: ['2025-04-01'],
    });

    expect(result[0]!.notes).toBe('Weekly check-in');
  });

  it('should copy null notes from source', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ notes: null }),
      dates: ['2025-04-01'],
    });

    expect(result[0]!.notes).toBeNull();
  });

  it('should copy alertOffsets as a separate array (not a reference)', () => {
    const source = createSourceEvent({ alertOffsets: [10, 60] });
    const result = buildOccurrences({
      sourceEvent: source,
      dates: ['2025-04-01'],
    });

    expect(result[0]!.alertOffsets).toEqual([10, 60]);
    // Verify it's a copy, not the same reference
    expect(result[0]!.alertOffsets).not.toBe(source.alertOffsets);
  });

  it('should set startDay to the generated date for single-day events', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ startDay: '2025-03-15', endDay: '2025-03-15' }),
      dates: ['2025-03-22', '2025-03-29'],
    });

    expect(result[0]!.startDay).toBe('2025-03-22');
    expect(result[1]!.startDay).toBe('2025-03-29');
  });

  it('should set endDay equal to startDay for single-day events', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ startDay: '2025-03-15', endDay: '2025-03-15' }),
      dates: ['2025-03-22'],
    });

    expect(result[0]!.endDay).toBe('2025-03-22');
  });

  it('should preserve day span for multi-day events', () => {
    // Source spans 2 days (March 15 → March 17)
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ startDay: '2025-03-15', endDay: '2025-03-17' }),
      dates: ['2025-03-22'],
    });

    expect(result[0]!.startDay).toBe('2025-03-22');
    expect(result[0]!.endDay).toBe('2025-03-24'); // +2 days
  });

  it('should preserve 1-day span for midnight-crossing events', () => {
    // endDay = startDay + 1 (midnight crossing)
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({
        startDay: '2025-03-15',
        endDay: '2025-03-16',
        startTime: 1320, // 22:00
        endTime: 360, // 06:00
      }),
      dates: ['2025-03-22'],
    });

    expect(result[0]!.startDay).toBe('2025-03-22');
    expect(result[0]!.endDay).toBe('2025-03-23'); // +1 day
  });

  it('should set modifiedAt to current time', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent(),
      dates: ['2025-04-01'],
    });

    expect(result[0]!.modifiedAt).toEqual(new Date('2025-03-20T12:00:00Z'));
  });

  it('should set syncedAt to null', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ syncedAt: new Date('2025-01-01T00:00:00Z') }),
      dates: ['2025-04-01'],
    });

    expect(result[0]!.syncedAt).toBeNull();
  });

  it('should set isDeleted to false', () => {
    const result = buildOccurrences({
      sourceEvent: createSourceEvent(),
      dates: ['2025-04-01'],
    });

    expect(result[0]!.isDeleted).toBe(false);
  });

  it('should handle day span across month boundary', () => {
    // Source: March 30 → April 1 (2-day span)
    const result = buildOccurrences({
      sourceEvent: createSourceEvent({ startDay: '2025-03-30', endDay: '2025-04-01' }),
      dates: ['2025-04-27'],
    });

    expect(result[0]!.startDay).toBe('2025-04-27');
    expect(result[0]!.endDay).toBe('2025-04-29'); // +2 days
  });
});
