import { describe, it, expect } from 'vitest';

import { PREDEFINED_PALETTE, REMINDER_I18N_KEYS } from '@features/reminders/constants';

import { validateReminder } from './reminderValidation';

const validInput = {
  name: 'Morning Reminder',
  icon: '☀️',
  backgroundColor: PREDEFINED_PALETTE[0],
  seriesFrequency: 'never',
};

describe('reminderValidation', () => {
  describe('should accept valid inputs', () => {
    it('should accept a fully valid reminder', () => {
      const result = validateReminder(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should accept name with leading/trailing whitespace after trimming', () => {
      const result = validateReminder({ ...validInput, name: '  Valid Name  ' });
      expect(result.isValid).toBe(true);
    });

    it('should accept single character name', () => {
      const result = validateReminder({ ...validInput, name: 'A' });
      expect(result.isValid).toBe(true);
    });

    it('should accept 50 character name', () => {
      const result = validateReminder({ ...validInput, name: 'A'.repeat(50) });
      expect(result.isValid).toBe(true);
    });

    it('should accept complex emoji as icon', () => {
      const result = validateReminder({ ...validInput, icon: '👨‍👩‍👧‍👦' });
      expect(result.isValid).toBe(true);
    });

    it('should accept color case-insensitively', () => {
      const result = validateReminder({ ...validInput, backgroundColor: '#fca5a5' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('should reject invalid name', () => {
    it('should reject empty name', () => {
      const result = validateReminder({ ...validInput, name: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe(REMINDER_I18N_KEYS.VALIDATION_NAME_REQUIRED);
    });

    it('should reject whitespace-only name', () => {
      const result = validateReminder({ ...validInput, name: '   ' });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe(REMINDER_I18N_KEYS.VALIDATION_NAME_REQUIRED);
    });

    it('should reject name exceeding 50 chars after trim', () => {
      const result = validateReminder({ ...validInput, name: 'A'.repeat(51) });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe(REMINDER_I18N_KEYS.VALIDATION_NAME_MAX_LENGTH);
    });
  });

  describe('should reject invalid icon', () => {
    it('should reject empty icon', () => {
      const result = validateReminder({ ...validInput, icon: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.icon).toBe(REMINDER_I18N_KEYS.VALIDATION_ICON_REQUIRED);
    });

    it('should reject regular character as icon', () => {
      const result = validateReminder({ ...validInput, icon: 'A' });
      expect(result.isValid).toBe(false);
      expect(result.errors.icon).toBe(REMINDER_I18N_KEYS.VALIDATION_ICON_REQUIRED);
    });

    it('should reject multiple emoji as icon', () => {
      const result = validateReminder({ ...validInput, icon: '😀😀' });
      expect(result.isValid).toBe(false);
      expect(result.errors.icon).toBe(REMINDER_I18N_KEYS.VALIDATION_ICON_REQUIRED);
    });
  });

  describe('should reject invalid backgroundColor', () => {
    it('should reject color not in palette', () => {
      const result = validateReminder({ ...validInput, backgroundColor: '#FFFFFF' });
      expect(result.isValid).toBe(false);
      expect(result.errors.backgroundColor).toBe(REMINDER_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
    });

    it('should reject empty color', () => {
      const result = validateReminder({ ...validInput, backgroundColor: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.backgroundColor).toBe(REMINDER_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
    });
  });

  describe('should return multiple errors for multiple invalid fields', () => {
    it('should return errors for all invalid fields at once', () => {
      const result = validateReminder({
        name: '',
        icon: 'A',
        backgroundColor: '#FFFFFF',
        seriesFrequency: 'never',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe(REMINDER_I18N_KEYS.VALIDATION_NAME_REQUIRED);
      expect(result.errors.icon).toBe(REMINDER_I18N_KEYS.VALIDATION_ICON_REQUIRED);
      expect(result.errors.backgroundColor).toBe(REMINDER_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
    });
  });
});
