import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';

vi.mock('@/stores/calendarStore', () => ({
  useCalendarStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({
      activeView: 'day',
      currentDate: new Date(2024, 5, 15),
    }),
  ),
}));

vi.mock('../services/calendarEventService', () => ({
  create: vi.fn(),
  update: vi.fn(),
  getShiftsForDate: vi.fn(),
}));

vi.mock('@/data/db', () => ({
  db: {
    shifts: { get: vi.fn() },
    reminders: { get: vi.fn() },
  },
}));

import { useCalendarStore } from '@/stores/calendarStore';

import { useEventForm } from './useEventForm';

const mockedUseCalendarStore = vi.mocked(useCalendarStore);

/**
 * Helper: format a Date object as an ISO date string (YYYY-MM-DD).
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Arbitrary: generates valid Date objects between 2000-01-01 and 2099-12-31.
 */
const dateArb = fc
  .date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
  .filter((d) => !isNaN(d.getTime()));

/**
 * Arbitrary: generates all valid calendar view modes.
 */
const viewModeArb = fc.constantFrom('day', 'week', 'month', 'year');

describe('Feature: gh18-calendar-shift-reminder-improvements, Property 7: Day pre-selection uses navigated date across all view modes', () => {
  /**
   * **Validates: Requirements 5.1, 5.2, 5.3**
   *
   * For any view mode (Day, Week, Month, Year) and any navigated date,
   * the Event_Form pre-selects both `startDay` and `endDay` with the
   * store's `currentDate` formatted as ISO (YYYY-MM-DD).
   *
   * The `computePreSelectedDay` function always uses `currentDate` from
   * the calendar store regardless of the active view mode.
   */

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pre-select startDay and endDay as ISO-formatted currentDate for any view mode and any navigated date', () => {
    fc.assert(
      fc.property(viewModeArb, dateArb, (viewMode, currentDate) => {
        mockedUseCalendarStore.mockImplementation((selector) =>
          selector({
            activeView: viewMode,
            currentDate,
          } as never),
        );

        const { result } = renderHook(() => useEventForm());

        const expectedDay = formatDate(currentDate);

        expect(result.current.formState.startDay).toBe(expectedDay);
        expect(result.current.formState.endDay).toBe(expectedDay);
      }),
      { numRuns: 100 },
    );
  });

  it('should produce a valid YYYY-MM-DD format string for any Date input across all view modes', () => {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

    fc.assert(
      fc.property(viewModeArb, dateArb, (viewMode, currentDate) => {
        mockedUseCalendarStore.mockImplementation((selector) =>
          selector({
            activeView: viewMode,
            currentDate,
          } as never),
        );

        const { result } = renderHook(() => useEventForm());

        expect(result.current.formState.startDay).toMatch(isoDatePattern);
        expect(result.current.formState.endDay).toMatch(isoDatePattern);
      }),
      { numRuns: 100 },
    );
  });

  it('should pre-select the same day regardless of which view mode is active (view mode independence)', () => {
    fc.assert(
      fc.property(dateArb, (currentDate) => {
        const results: string[] = [];

        for (const viewMode of ['day', 'week', 'month', 'year']) {
          mockedUseCalendarStore.mockImplementation((selector) =>
            selector({
              activeView: viewMode,
              currentDate,
            } as never),
          );

          const { result } = renderHook(() => useEventForm());
          results.push(result.current.formState.startDay);
        }

        // All view modes should produce the same pre-selected day
        const [first, ...rest] = results;
        for (const r of rest) {
          expect(r).toBe(first);
        }
      }),
      { numRuns: 100 },
    );
  });
});
