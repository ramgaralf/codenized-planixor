import { describe, it, expect } from 'vitest';

import {
  formatDuration,
  formatTimeFromMinutes,
  getDateRangeForDay,
  getDateRangeForWeek,
  getDateRangeForMonth,
  getDateRangeForYear,
} from './utils';

describe('formatDuration', () => {
  it('should return hours and minutes when both are non-zero', () => {
    expect(formatDuration(480, 570)).toBe('1h 30m');
  });

  it('should return only hours when minutes is 0', () => {
    expect(formatDuration(480, 600)).toBe('2h');
  });

  it('should return only minutes when hours is 0', () => {
    expect(formatDuration(480, 510)).toBe('30m');
  });

  it('should handle 1 minute duration', () => {
    expect(formatDuration(0, 1)).toBe('1m');
  });

  it('should handle full day duration', () => {
    expect(formatDuration(0, 1439)).toBe('23h 59m');
  });
});

describe('formatTimeFromMinutes', () => {
  it('should format midnight as 00:00', () => {
    expect(formatTimeFromMinutes(0)).toBe('00:00');
  });

  it('should format 480 minutes as 08:00', () => {
    expect(formatTimeFromMinutes(480)).toBe('08:00');
  });

  it('should format 1439 minutes as 23:59', () => {
    expect(formatTimeFromMinutes(1439)).toBe('23:59');
  });

  it('should pad single-digit hours and minutes', () => {
    expect(formatTimeFromMinutes(65)).toBe('01:05');
  });
});

describe('getDateRangeForDay', () => {
  it('should return the same date for start and end', () => {
    const result = getDateRangeForDay('2024-03-15');
    expect(result).toEqual({ start: '2024-03-15', end: '2024-03-15' });
  });
});

describe('getDateRangeForWeek', () => {
  it('should return Monday to Sunday for a Wednesday', () => {
    // 2024-03-13 is a Wednesday
    const result = getDateRangeForWeek('2024-03-13');
    expect(result).toEqual({ start: '2024-03-11', end: '2024-03-17' });
  });

  it('should return same week when given a Monday', () => {
    // 2024-03-11 is a Monday
    const result = getDateRangeForWeek('2024-03-11');
    expect(result).toEqual({ start: '2024-03-11', end: '2024-03-17' });
  });

  it('should return same week when given a Sunday', () => {
    // 2024-03-17 is a Sunday
    const result = getDateRangeForWeek('2024-03-17');
    expect(result).toEqual({ start: '2024-03-11', end: '2024-03-17' });
  });

  it('should handle week crossing month boundary', () => {
    // 2024-03-01 is a Friday → week is Feb 26 (Mon) to Mar 3 (Sun)
    const result = getDateRangeForWeek('2024-03-01');
    expect(result).toEqual({ start: '2024-02-26', end: '2024-03-03' });
  });

  it('should handle week crossing year boundary', () => {
    // 2024-12-31 is a Tuesday → week is Dec 30 (Mon) to Jan 5 (Sun)
    const result = getDateRangeForWeek('2024-12-31');
    expect(result).toEqual({ start: '2024-12-30', end: '2025-01-05' });
  });
});

describe('getDateRangeForMonth', () => {
  it('should return first and last day of the month', () => {
    const result = getDateRangeForMonth('2024-03-15');
    expect(result).toEqual({ start: '2024-03-01', end: '2024-03-31' });
  });

  it('should handle February in a leap year', () => {
    const result = getDateRangeForMonth('2024-02-10');
    expect(result).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('should handle February in a non-leap year', () => {
    const result = getDateRangeForMonth('2023-02-10');
    expect(result).toEqual({ start: '2023-02-01', end: '2023-02-28' });
  });

  it('should handle month with 30 days', () => {
    const result = getDateRangeForMonth('2024-04-15');
    expect(result).toEqual({ start: '2024-04-01', end: '2024-04-30' });
  });
});

describe('getDateRangeForYear', () => {
  it('should return Jan 1 to Dec 31 of the given year', () => {
    const result = getDateRangeForYear('2024-06-15');
    expect(result).toEqual({ start: '2024-01-01', end: '2024-12-31' });
  });

  it('should handle any date within the year', () => {
    const result = getDateRangeForYear('2023-01-01');
    expect(result).toEqual({ start: '2023-01-01', end: '2023-12-31' });
  });
});
