import { describe, it, expect } from 'vitest';

import { generateSeriesDates } from './seriesGenerator';

describe('generateSeriesDates', () => {
  describe('weekly frequency', () => {
    it('should generate dates every 7 days from start until year boundary', () => {
      const result = generateSeriesDates({
        startDay: '2025-03-15',
        frequency: 'weekly',
        yearBoundary: 2025,
      });

      expect(result[0]).toBe('2025-03-22');
      expect(result[1]).toBe('2025-03-29');
      expect(result[2]).toBe('2025-04-05');
      // Last date should not exceed 2025
      const lastDate = result[result.length - 1];
      expect(lastDate.startsWith('2025-')).toBe(true);
      expect(result).not.toContain('2025-03-15'); // excludes source
    });

    it('should stop when year boundary is exceeded', () => {
      const result = generateSeriesDates({
        startDay: '2025-12-20',
        frequency: 'weekly',
        yearBoundary: 2025,
      });

      expect(result).toEqual(['2025-12-27']);
    });

    it('should return empty array when next date exceeds year boundary', () => {
      const result = generateSeriesDates({
        startDay: '2025-12-28',
        frequency: 'weekly',
        yearBoundary: 2025,
      });

      expect(result).toEqual([]);
    });
  });

  describe('monthly frequency', () => {
    it('should generate dates on the same day-of-month clamping when needed', () => {
      const result = generateSeriesDates({
        startDay: '2025-01-31',
        frequency: 'monthly',
        yearBoundary: 2025,
      });

      expect(result[0]).toBe('2025-02-28'); // Feb has 28 days in 2025
      expect(result[1]).toBe('2025-03-31');
      expect(result[2]).toBe('2025-04-30'); // Apr has 30 days
      expect(result[3]).toBe('2025-05-31');
      expect(result[4]).toBe('2025-06-30'); // Jun has 30 days
      expect(result[5]).toBe('2025-07-31');
      expect(result[6]).toBe('2025-08-31');
      expect(result[7]).toBe('2025-09-30'); // Sep has 30 days
      expect(result[8]).toBe('2025-10-31');
      expect(result[9]).toBe('2025-11-30'); // Nov has 30 days
      expect(result[10]).toBe('2025-12-31');
      expect(result.length).toBe(11);
    });

    it('should cross year boundary for monthly and stop', () => {
      const result = generateSeriesDates({
        startDay: '2025-11-15',
        frequency: 'monthly',
        yearBoundary: 2025,
      });

      expect(result).toEqual(['2025-12-15']);
    });

    it('should handle Feb 29 clamping in non-leap year for monthly', () => {
      const result = generateSeriesDates({
        startDay: '2024-01-29',
        frequency: 'monthly',
        yearBoundary: 2024,
      });

      // Feb 2024 is a leap year, so Feb 29 is valid
      expect(result[0]).toBe('2024-02-29');
      expect(result[1]).toBe('2024-03-29');
    });
  });

  describe('yearly frequency', () => {
    it('should clamp Feb 29 to Feb 28 in non-leap year', () => {
      const result = generateSeriesDates({
        startDay: '2024-02-29',
        frequency: 'yearly',
        yearBoundary: 2025,
      });

      expect(result).toEqual(['2025-02-28']);
    });

    it('should keep Feb 29 in leap year', () => {
      const result = generateSeriesDates({
        startDay: '2024-02-29',
        frequency: 'yearly',
        yearBoundary: 2028,
      });

      expect(result).toContain('2025-02-28');
      expect(result).toContain('2026-02-28');
      expect(result).toContain('2027-02-28');
      expect(result).toContain('2028-02-29');
    });

    it('should return empty when start year equals year boundary', () => {
      const result = generateSeriesDates({
        startDay: '2025-02-28',
        frequency: 'yearly',
        yearBoundary: 2025,
      });

      expect(result).toEqual([]);
    });
  });

  describe('safety cap', () => {
    it('should not exceed 366 occurrences', () => {
      const result = generateSeriesDates({
        startDay: '2020-01-01',
        frequency: 'weekly',
        yearBoundary: 2030,
      });

      expect(result.length).toBeLessThanOrEqual(366);
    });
  });

  describe('source date exclusion', () => {
    it('should never include the source date in results', () => {
      const startDay = '2025-06-15';
      const result = generateSeriesDates({
        startDay,
        frequency: 'weekly',
        yearBoundary: 2025,
      });

      expect(result).not.toContain(startDay);
    });
  });
});
