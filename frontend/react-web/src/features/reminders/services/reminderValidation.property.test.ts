import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  PREDEFINED_PALETTE,
  REMINDER_I18N_KEYS,
  REMINDER_NAME_MAX_LENGTH,
  REMINDER_NAME_MIN_LENGTH,
} from '@features/reminders/constants';

import { validateReminder } from './reminderValidation';

/**
 * Property-based tests for Reminder validation service.
 *
 * Property 2: Form submission requires all fields valid
 * Property 14: Name validation accepts trimmed strings of 1–50 characters
 * Property 15: Icon validation accepts exactly one emoji
 * Property 16: Color validation accepts only Predefined_Palette members
 *
 * **Validates: Requirements 1.2, 3.4, 7.1, 7.2, 7.3**
 */

const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '👨‍👩‍👧‍👦', '🇺🇸'];

const validNameArb = fc
  .string({ minLength: REMINDER_NAME_MIN_LENGTH, maxLength: REMINDER_NAME_MAX_LENGTH, unit: 'grapheme' })
  .filter((s) => s.trim().length >= REMINDER_NAME_MIN_LENGTH && s.trim().length <= REMINDER_NAME_MAX_LENGTH);

const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);

const validBackgroundColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

const validReminderInputArb = fc.record({
  name: validNameArb,
  icon: validIconArb,
  backgroundColor: validBackgroundColorArb,
});

describe('Property 2: Form submission requires all fields valid', () => {
  it('should return isValid=true when all fields are valid (name 1-50, one emoji, palette color)', () => {
    fc.assert(
      fc.property(validReminderInputArb, (input) => {
        const result = validateReminder(input);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
      }),
      { numRuns: 100 },
    );
  });

  it('should return isValid=false when name is invalid but other fields are valid', () => {
    const invalidNameArb = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t  ');

    fc.assert(
      fc.property(validReminderInputArb, invalidNameArb, (validInput, invalidName) => {
        const input = { ...validInput, name: invalidName };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('should return isValid=false when icon is invalid but other fields are valid', () => {
    const invalidIconArb = fc.constantFrom('', 'AB', 'hello', '😀😀', '123');

    fc.assert(
      fc.property(validReminderInputArb, invalidIconArb, (validInput, invalidIcon) => {
        const input = { ...validInput, icon: invalidIcon };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('should return isValid=false when backgroundColor is invalid but other fields are valid', () => {
    const invalidColorArb = fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => !PREDEFINED_PALETTE.some((c) => c.toLowerCase() === s.toLowerCase()));

    fc.assert(
      fc.property(validReminderInputArb, invalidColorArb, (validInput, invalidColor) => {
        const input = { ...validInput, backgroundColor: invalidColor };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 14: Name validation accepts trimmed strings of 1–50 characters', () => {
  it('should accept any name with trimmed length between 1 and 50 characters', () => {
    fc.assert(
      fc.property(validReminderInputArb, (input) => {
        const result = validateReminder(input);
        expect(result.isValid).toBe(true);
        expect(result.errors.name).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('should reject empty strings and whitespace-only strings', () => {
    const emptyOrWhitespaceArb = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t  ');

    fc.assert(
      fc.property(validReminderInputArb, emptyOrWhitespaceArb, (validInput, invalidName) => {
        const input = { ...validInput, name: invalidName };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.name).toBe(REMINDER_I18N_KEYS.VALIDATION_NAME_REQUIRED);
      }),
      { numRuns: 100 },
    );
  });

  it('should reject strings exceeding 50 characters after trim', () => {
    const longNameArb = fc
      .string({ minLength: REMINDER_NAME_MAX_LENGTH + 1, maxLength: REMINDER_NAME_MAX_LENGTH + 100 })
      .filter((s) => s.trim().length > REMINDER_NAME_MAX_LENGTH);

    fc.assert(
      fc.property(validReminderInputArb, longNameArb, (validInput, longName) => {
        const input = { ...validInput, name: longName };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.name).toBe(REMINDER_I18N_KEYS.VALIDATION_NAME_MAX_LENGTH);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 15: Icon validation accepts exactly one emoji', () => {
  it('should accept exactly one emoji character', () => {
    fc.assert(
      fc.property(validIconArb, validNameArb, validBackgroundColorArb, (icon, name, backgroundColor) => {
        const result = validateReminder({ name, icon, backgroundColor });
        expect(result.errors.icon).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('should reject empty strings', () => {
    fc.assert(
      fc.property(validReminderInputArb, (validInput) => {
        const input = { ...validInput, icon: '' };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.icon).toBe(REMINDER_I18N_KEYS.VALIDATION_ICON_REQUIRED);
      }),
      { numRuns: 100 },
    );
  });

  it('should reject multiple emojis', () => {
    const multipleEmojiArb = fc
      .tuple(fc.constantFrom(...SINGLE_EMOJIS), fc.constantFrom(...SINGLE_EMOJIS))
      .map(([a, b]) => a + b);

    fc.assert(
      fc.property(validReminderInputArb, multipleEmojiArb, (validInput, multipleEmojis) => {
        const input = { ...validInput, icon: multipleEmojis };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.icon).toBe(REMINDER_I18N_KEYS.VALIDATION_ICON_REQUIRED);
      }),
      { numRuns: 100 },
    );
  });

  it('should reject non-emoji characters', () => {
    const nonEmojiArb = fc.constantFrom('A', 'abc', '123', '!@#', 'hello', 'X');

    fc.assert(
      fc.property(validReminderInputArb, nonEmojiArb, (validInput, nonEmoji) => {
        const input = { ...validInput, icon: nonEmoji };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.icon).toBe(REMINDER_I18N_KEYS.VALIDATION_ICON_REQUIRED);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 16: Color validation accepts only Predefined_Palette members', () => {
  it('should accept any color from the PREDEFINED_PALETTE (45 colors)', () => {
    fc.assert(
      fc.property(validReminderInputArb, (input) => {
        const result = validateReminder(input);
        expect(result.errors.backgroundColor).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any hex string not in the palette', () => {
    const nonPaletteHexArb = fc
      .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
      )
      .map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase())
      .filter((hex) => !PREDEFINED_PALETTE.some((c) => c.toLowerCase() === hex.toLowerCase()));

    fc.assert(
      fc.property(validReminderInputArb, nonPaletteHexArb, (validInput, invalidColor) => {
        const input = { ...validInput, backgroundColor: invalidColor };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.backgroundColor).toBe(REMINDER_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
      }),
      { numRuns: 100 },
    );
  });

  it('should reject arbitrary non-hex strings', () => {
    const arbitraryStringArb = fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => !PREDEFINED_PALETTE.some((c) => c.toLowerCase() === s.toLowerCase()));

    fc.assert(
      fc.property(validReminderInputArb, arbitraryStringArb, (validInput, invalidColor) => {
        const input = { ...validInput, backgroundColor: invalidColor };
        const result = validateReminder(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.backgroundColor).toBe(REMINDER_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
      }),
      { numRuns: 100 },
    );
  });
});
