import { describe, it, expect } from 'vitest';

import { calculateHoursWorked } from './hoursWorkedCalculation';

describe('calculateHoursWorked', () => {
  it('should return 1440 when startTime equals endTime', () => {
    expect(calculateHoursWorked(0, 0)).toBe(1440);
    expect(calculateHoursWorked(480, 480)).toBe(1440);
    expect(calculateHoursWorked(1439, 1439)).toBe(1440);
  });

  it('should return positive duration when endTime is after startTime', () => {
    // 8:00 to 17:00 = 9 hours = 540 minutes
    expect(calculateHoursWorked(480, 1020)).toBe(540);
  });

  it('should handle overnight shifts where endTime is before startTime', () => {
    // 22:00 (1320) to 06:00 (360) = 8 hours = 480 minutes
    expect(calculateHoursWorked(1320, 360)).toBe(480);
  });

  it('should return 1439 as the maximum for unequal times', () => {
    // startTime = 1, endTime = 0 → (0 - 1 + 1440) % 1440 = 1439
    expect(calculateHoursWorked(1, 0)).toBe(1439);
  });

  it('should return 1 as the minimum for unequal times', () => {
    // startTime = 0, endTime = 1 → (1 - 0 + 1440) % 1440 = 1
    expect(calculateHoursWorked(0, 1)).toBe(1);
  });
});
