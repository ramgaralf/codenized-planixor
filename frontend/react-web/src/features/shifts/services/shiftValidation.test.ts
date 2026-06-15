import { describe, it, expect } from 'vitest';

import { PREDEFINED_PALETTE, SHIFT_I18N_KEYS } from '@features/shifts/constants';

import { validateShift } from './shiftValidation';

import type { ShiftFormInput } from './shiftValidation';

const validInput: ShiftFormInput = {
  name: 'Morning Shift',
  icon: '☀️',
  backgroundColor: PREDEFINED_PALETTE[0],
  startTime: 480,
  endTime: 960,
  hoursWorked: 480,
};

describe('shiftValidation', () => {
  describe('should accept valid inputs', () => {
    it('should accept a fully valid shift', () => {
      const result = validateShift(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept name with leading/trailing whitespace after trimming', () => {
      const result = validateShift({ ...validInput, name: '  Valid Name  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Valid Name');
      }
    });

    it('should accept single character name', () => {
      const result = validateShift({ ...validInput, name: 'A' });
      expect(result.success).toBe(true);
    });

    it('should accept 50 character name', () => {
      const result = validateShift({ ...validInput, name: 'A'.repeat(50) });
      expect(result.success).toBe(true);
    });

    it('should accept boundary time values', () => {
      const result = validateShift({ ...validInput, startTime: 0, endTime: 1439 });
      expect(result.success).toBe(true);
    });

    it('should accept hoursWorked of 1 minute', () => {
      const result = validateShift({ ...validInput, hoursWorked: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept hoursWorked of 1440 minutes', () => {
      const result = validateShift({ ...validInput, hoursWorked: 1440 });
      expect(result.success).toBe(true);
    });

    it('should accept complex emoji as icon', () => {
      const result = validateShift({ ...validInput, icon: '👨‍👩‍👧‍👦' });
      expect(result.success).toBe(true);
    });
  });

  describe('should reject invalid name', () => {
    it('should reject empty name', () => {
      const result = validateShift({ ...validInput, name: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.name).toBe(SHIFT_I18N_KEYS.VALIDATION_NAME_REQUIRED);
      }
    });

    it('should reject whitespace-only name', () => {
      const result = validateShift({ ...validInput, name: '   ' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.name).toBe(SHIFT_I18N_KEYS.VALIDATION_NAME_REQUIRED);
      }
    });

    it('should reject name exceeding 50 chars after trim', () => {
      const result = validateShift({ ...validInput, name: 'A'.repeat(51) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.name).toBe(SHIFT_I18N_KEYS.VALIDATION_NAME_MAX_LENGTH);
      }
    });
  });

  describe('should reject invalid icon', () => {
    it('should reject empty icon', () => {
      const result = validateShift({ ...validInput, icon: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.icon).toBe(SHIFT_I18N_KEYS.VALIDATION_ICON_REQUIRED);
      }
    });

    it('should reject regular character as icon', () => {
      const result = validateShift({ ...validInput, icon: 'A' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.icon).toBe(SHIFT_I18N_KEYS.VALIDATION_ICON_REQUIRED);
      }
    });

    it('should reject multiple emoji as icon', () => {
      const result = validateShift({ ...validInput, icon: '😀😀' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.icon).toBe(SHIFT_I18N_KEYS.VALIDATION_ICON_REQUIRED);
      }
    });
  });

  describe('should reject invalid backgroundColor', () => {
    it('should reject color not in palette', () => {
      const result = validateShift({ ...validInput, backgroundColor: '#FFFFFF' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.backgroundColor).toBe(SHIFT_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
      }
    });

    it('should reject empty color', () => {
      const result = validateShift({ ...validInput, backgroundColor: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.backgroundColor).toBe(SHIFT_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
      }
    });
  });

  describe('should reject invalid startTime', () => {
    it('should reject negative startTime', () => {
      const result = validateShift({ ...validInput, startTime: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.startTime).toBe(SHIFT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED);
      }
    });

    it('should reject startTime exceeding 1439', () => {
      const result = validateShift({ ...validInput, startTime: 1440 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.startTime).toBe(SHIFT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED);
      }
    });

    it('should reject non-integer startTime', () => {
      const result = validateShift({ ...validInput, startTime: 480.5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.startTime).toBe(SHIFT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED);
      }
    });
  });

  describe('should reject invalid endTime', () => {
    it('should reject negative endTime', () => {
      const result = validateShift({ ...validInput, endTime: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.endTime).toBe(SHIFT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED);
      }
    });

    it('should reject endTime exceeding 1439', () => {
      const result = validateShift({ ...validInput, endTime: 1440 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.endTime).toBe(SHIFT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED);
      }
    });

    it('should reject non-integer endTime', () => {
      const result = validateShift({ ...validInput, endTime: 960.7 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.endTime).toBe(SHIFT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED);
      }
    });
  });

  describe('should reject invalid hoursWorked', () => {
    it('should reject hoursWorked of 0', () => {
      const result = validateShift({ ...validInput, hoursWorked: 0 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.hoursWorked).toBe(SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE);
      }
    });

    it('should reject hoursWorked exceeding 1440', () => {
      const result = validateShift({ ...validInput, hoursWorked: 1441 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.hoursWorked).toBe(SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE);
      }
    });

    it('should reject negative hoursWorked', () => {
      const result = validateShift({ ...validInput, hoursWorked: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.hoursWorked).toBe(SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE);
      }
    });

    it('should reject non-integer hoursWorked', () => {
      const result = validateShift({ ...validInput, hoursWorked: 60.5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.hoursWorked).toBe(SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE);
      }
    });
  });

  describe('should return multiple errors for multiple invalid fields', () => {
    it('should return errors for all invalid fields at once', () => {
      const result = validateShift({
        name: '',
        icon: 'A',
        backgroundColor: '#FFFFFF',
        startTime: -1,
        endTime: 1440,
        hoursWorked: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.name).toBe(SHIFT_I18N_KEYS.VALIDATION_NAME_REQUIRED);
        expect(result.errors.icon).toBe(SHIFT_I18N_KEYS.VALIDATION_ICON_REQUIRED);
        expect(result.errors.backgroundColor).toBe(SHIFT_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
        expect(result.errors.startTime).toBe(SHIFT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED);
        expect(result.errors.endTime).toBe(SHIFT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED);
        expect(result.errors.hoursWorked).toBe(SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE);
      }
    });
  });
});
