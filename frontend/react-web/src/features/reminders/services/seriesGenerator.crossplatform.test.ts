import { describe, it, expect } from 'vitest';

import { generateSeriesDates } from './seriesGenerator';

/**
 * Cross-Platform Consistency Tests
 *
 * These tests verify that the React Web `generateSeriesDates` produces identical
 * output to the Android `SeriesGenerator.generateDates` for the same inputs.
 *
 * The matching test file is:
 *   frontend/android-app/app/src/test/java/com/codenized/planixor/domain/series/SeriesGeneratorCrossPlatformTest.kt
 *
 * Both files use the EXACT same inputs and assert the EXACT same expected outputs.
 * If either test fails, the platforms are out of sync.
 *
 * Validates: Requirements 7.2
 */
describe('Cross-Platform Consistency: generateSeriesDates', () => {
  it('Case 1: monthly from Jan 31 — 11 dates with clamping', () => {
    const result = generateSeriesDates({
      startDay: '2025-01-31',
      frequency: 'monthly',
      yearBoundary: 2025,
    });

    expect(result).toEqual([
      '2025-02-28',
      '2025-03-31',
      '2025-04-30',
      '2025-05-31',
      '2025-06-30',
      '2025-07-31',
      '2025-08-31',
      '2025-09-30',
      '2025-10-31',
      '2025-11-30',
      '2025-12-31',
    ]);
  });

  it('Case 2: yearly from Feb 29 through 2028 — leap year clamping', () => {
    const result = generateSeriesDates({
      startDay: '2024-02-29',
      frequency: 'yearly',
      yearBoundary: 2028,
    });

    expect(result).toEqual(['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
  });

  it('Case 3: weekly from Dec 20 — only one date before year end', () => {
    const result = generateSeriesDates({
      startDay: '2025-12-20',
      frequency: 'weekly',
      yearBoundary: 2025,
    });

    expect(result).toEqual(['2025-12-27']);
  });

  it('Case 4: weekly from Mar 15 — first 3 dates', () => {
    const result = generateSeriesDates({
      startDay: '2025-03-15',
      frequency: 'weekly',
      yearBoundary: 2025,
    });

    expect(result[0]).toBe('2025-03-22');
    expect(result[1]).toBe('2025-03-29');
    expect(result[2]).toBe('2025-04-05');
  });

  it('Case 5: weekly from Jan 1 — exactly 52 dates, last is Dec 31', () => {
    const result = generateSeriesDates({
      startDay: '2025-01-01',
      frequency: 'weekly',
      yearBoundary: 2025,
    });

    expect(result.length).toBe(52);
    expect(result[result.length - 1]).toBe('2025-12-31');
  });

  it('Case 6: monthly from Jan 29, 2024 — Feb 29 valid in leap year', () => {
    const result = generateSeriesDates({
      startDay: '2024-01-29',
      frequency: 'monthly',
      yearBoundary: 2024,
    });

    expect(result[0]).toBe('2024-02-29');
    expect(result[1]).toBe('2024-03-29');
  });

  it('Case 7: yearly from Feb 28, 2025 within same year — empty', () => {
    const result = generateSeriesDates({
      startDay: '2025-02-28',
      frequency: 'yearly',
      yearBoundary: 2025,
    });

    expect(result).toEqual([]);
  });
});
