import { describe, it, expect } from 'vitest';

import { validateAnnualConfig } from './useAnnualConfig';

describe('validateAnnualConfig', () => {
  describe('valid inputs', () => {
    it('should return valid for year=2000 and configuredHours=1', () => {
      const result = validateAnnualConfig(2000, 1);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for year=2100 and configuredHours=8784', () => {
      const result = validateAnnualConfig(2100, 8784);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for typical values (year=2025, hours=1800)', () => {
      const result = validateAnnualConfig(2025, 1800);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('invalid year range', () => {
    it('should reject year below 2000', () => {
      const result = validateAnnualConfig(1999, 1800);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject year above 2100', () => {
      const result = validateAnnualConfig(2101, 1800);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject non-integer year', () => {
      const result = validateAnnualConfig(2025.5, 1800);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('invalid configuredHours range', () => {
    it('should reject configuredHours below 1', () => {
      const result = validateAnnualConfig(2025, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject configuredHours above 8784', () => {
      const result = validateAnnualConfig(2025, 8785);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject non-integer configuredHours', () => {
      const result = validateAnnualConfig(2025, 1800.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject negative configuredHours', () => {
      const result = validateAnnualConfig(2025, -1);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
