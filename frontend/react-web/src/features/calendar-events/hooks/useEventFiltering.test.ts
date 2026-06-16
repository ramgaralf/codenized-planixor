import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CalendarEventDisplay } from '../models';
import { useEventFiltering } from './useEventFiltering';

// Mock the calendar store
const mockState = {
  activeView: 'day' as 'day' | 'week' | 'month' | 'year',
  currentDate: new Date(2025, 0, 15), // 2025-01-15
};

vi.mock('@/stores/calendarStore', () => ({
  useCalendarStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

const createEvent = (overrides: Partial<CalendarEventDisplay> = {}): CalendarEventDisplay => ({
  id: crypto.randomUUID(),
  eventType: 'shift',
  eventTypeId: 'type-1',
  day: '2025-01-15',
  startTime: 480,
  endTime: 570,
  notes: null,
  modifiedAt: new Date(),
  syncedAt: null,
  isDeleted: false,
  name: 'Morning Shift',
  icon: '☀️',
  backgroundColor: '#10B981',
  ...overrides,
});

describe('useEventFiltering', () => {
  beforeEach(() => {
    mockState.activeView = 'day';
    mockState.currentDate = new Date(2025, 0, 15);
  });

  it('should filter out deleted events', () => {
    const events = [
      createEvent({ day: '2025-01-15', isDeleted: false }),
      createEvent({ day: '2025-01-15', isDeleted: true }),
    ];

    const { result } = renderHook(() => useEventFiltering(events));

    expect(result.current.filteredEvents).toHaveLength(1);
    expect(result.current.filteredEvents[0].isDeleted).toBe(false);
  });

  it('should filter events outside the day range', () => {
    const events = [
      createEvent({ day: '2025-01-14' }),
      createEvent({ day: '2025-01-15' }),
      createEvent({ day: '2025-01-16' }),
    ];

    const { result } = renderHook(() => useEventFiltering(events));

    expect(result.current.filteredEvents).toHaveLength(1);
    expect(result.current.filteredEvents[0].day).toBe('2025-01-15');
  });

  it('should return correct date range for day view', () => {
    const { result } = renderHook(() => useEventFiltering([]));

    expect(result.current.startDate).toBe('2025-01-15');
    expect(result.current.endDate).toBe('2025-01-15');
  });

  it('should filter events within week range', () => {
    mockState.activeView = 'week';
    // 2025-01-15 is a Wednesday, so the week is Mon 2025-01-13 to Sun 2025-01-19
    const events = [
      createEvent({ day: '2025-01-12' }), // Sunday before — out of range
      createEvent({ day: '2025-01-13' }), // Monday — in range
      createEvent({ day: '2025-01-15' }), // Wednesday — in range
      createEvent({ day: '2025-01-19' }), // Sunday — in range
      createEvent({ day: '2025-01-20' }), // Monday next — out of range
    ];

    const { result } = renderHook(() => useEventFiltering(events));

    expect(result.current.filteredEvents).toHaveLength(3);
    expect(result.current.startDate).toBe('2025-01-13');
    expect(result.current.endDate).toBe('2025-01-19');
  });

  it('should filter events within month range', () => {
    mockState.activeView = 'month';
    const events = [
      createEvent({ day: '2024-12-31' }), // out of range
      createEvent({ day: '2025-01-01' }), // in range
      createEvent({ day: '2025-01-31' }), // in range
      createEvent({ day: '2025-02-01' }), // out of range
    ];

    const { result } = renderHook(() => useEventFiltering(events));

    expect(result.current.filteredEvents).toHaveLength(2);
    expect(result.current.startDate).toBe('2025-01-01');
    expect(result.current.endDate).toBe('2025-01-31');
  });

  it('should filter events within year range', () => {
    mockState.activeView = 'year';
    const events = [
      createEvent({ day: '2024-12-31' }), // out of range
      createEvent({ day: '2025-01-01' }), // in range
      createEvent({ day: '2025-06-15' }), // in range
      createEvent({ day: '2025-12-31' }), // in range
      createEvent({ day: '2026-01-01' }), // out of range
    ];

    const { result } = renderHook(() => useEventFiltering(events));

    expect(result.current.filteredEvents).toHaveLength(3);
    expect(result.current.startDate).toBe('2025-01-01');
    expect(result.current.endDate).toBe('2025-12-31');
  });

  it('should exclude both deleted and out-of-range events simultaneously', () => {
    const events = [
      createEvent({ day: '2025-01-15', isDeleted: false }), // ✓ in range, not deleted
      createEvent({ day: '2025-01-15', isDeleted: true }), // ✗ deleted
      createEvent({ day: '2025-01-16', isDeleted: false }), // ✗ out of range
      createEvent({ day: '2025-01-16', isDeleted: true }), // ✗ both
    ];

    const { result } = renderHook(() => useEventFiltering(events));

    expect(result.current.filteredEvents).toHaveLength(1);
  });

  it('should return empty array when no events match', () => {
    const events = [
      createEvent({ day: '2025-01-14', isDeleted: false }),
      createEvent({ day: '2025-01-15', isDeleted: true }),
    ];

    const { result } = renderHook(() => useEventFiltering(events));

    expect(result.current.filteredEvents).toHaveLength(0);
  });

  it('should return all non-deleted events when all are in range', () => {
    const events = [
      createEvent({ day: '2025-01-15', isDeleted: false }),
      createEvent({ day: '2025-01-15', isDeleted: false }),
      createEvent({ day: '2025-01-15', isDeleted: false }),
    ];

    const { result } = renderHook(() => useEventFiltering(events));

    expect(result.current.filteredEvents).toHaveLength(3);
  });
});
