import { describe, it, expect } from 'vitest';

import { checkPrerequisites } from './prerequisiteService';

describe('checkPrerequisites', () => {
  it('should return canCreate true when both shifts and reminders exist', () => {
    const result = checkPrerequisites(1, 1);
    expect(result).toEqual({ canCreate: true });
  });

  it('should return canCreate true when multiple shifts and reminders exist', () => {
    const result = checkPrerequisites(5, 3);
    expect(result).toEqual({ canCreate: true });
  });

  it('should indicate both missing when no shifts and no reminders exist', () => {
    const result = checkPrerequisites(0, 0);
    expect(result).toEqual({
      canCreate: false,
      missingShifts: true,
      missingReminders: true,
    });
  });

  it('should return canCreate true when no shifts but reminders exist', () => {
    const result = checkPrerequisites(0, 3);
    expect(result).toEqual({ canCreate: true });
  });

  it('should return canCreate true when shifts exist but no reminders', () => {
    const result = checkPrerequisites(2, 0);
    expect(result).toEqual({ canCreate: true });
  });

  it('should return canCreate true with exactly one shift and one reminder', () => {
    const result = checkPrerequisites(1, 1);
    expect(result).toEqual({ canCreate: true });
  });

  it('should handle large counts correctly', () => {
    const result = checkPrerequisites(1000, 500);
    expect(result).toEqual({ canCreate: true });
  });

  it('should return canCreate true with only one shift and zero reminders', () => {
    const result = checkPrerequisites(1, 0);
    expect(result).toEqual({ canCreate: true });
  });

  it('should return canCreate true with only one reminder and zero shifts', () => {
    const result = checkPrerequisites(0, 1);
    expect(result).toEqual({ canCreate: true });
  });
});
