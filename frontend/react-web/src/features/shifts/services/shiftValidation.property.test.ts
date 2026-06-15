import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  PREDEFINED_PALETTE,
  SHIFT_I18N_KEYS,
  SHIFT_NAME_MAX_LENGTH,
  SHIFT_TIME_MIN,
  SHIFT_TIME_MAX,
  SHIFT_HOURS_WORKED_MIN,
  SHIFT_HOURS_WORKED_MAX,
} from '@features/shifts/constants';

import { validateShift } from './shiftValidation';

import type { ShiftFormInput } from './shiftValidation';

/**
 * Property 2: Shift validation rejects invalid input
 *
 * For any shift form input where at least one field violates its constraint,
 * the validation function SHALL return a failure result identifying the invalid field(s)
 * and SHALL prevent persistence.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
 */

const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '👨‍👩‍👧‍👦', '🇺🇸'];

const validNameArb = fc
  .string({ minLength: 1, maxLength: SHIFT_NAME_MAX_LENGTH, unit: 'grapheme' })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= SHIFT_NAME_MAX_LENGTH);

const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);

const validBackgroundColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

const validStartTimeArb = fc.integer({ min: SHIFT_TIME_MIN, max: SHIFT_TIME_MAX });

const validEndTimeArb = fc.integer({ min: SHIFT_TIME_MIN, max: SHIFT_TIME_MAX });

const validHoursWorkedArb = fc.integer({ min: SHIFT_HOURS_WORKED_MIN, max: SHIFT_HOURS_WORKED_MAX });

const validShiftInputArb: fc.Arbitrary<ShiftFormInput> = fc.record({
  name: validNameArb,
  icon: validIconArb,
  backgroundColor: validBackgroundColorArb,
  startTime: validStartTimeArb,
  endTime: validEndTimeArb,
  hoursWorked: validHoursWorkedArb,
});

describe('Property 2: Shift validation rejects invalid input', () => {
  it('should reject any input with invalid name (empty/whitespace-only)', () => {
    const invalidNameArb = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t  ');

    fc.assert(
      fc.property(validShiftInputArb, invalidNameArb, (validInput, invalidName) => {
        const input: ShiftFormInput = { ...validInput, name: invalidName };
        const result = validateShift(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.name).toBe(SHIFT_I18N_KEYS.VALIDATION_NAME_REQUIRED);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any input with invalid name (exceeds 50 chars after trim)', () => {
    const longNameArb = fc
      .string({ minLength: SHIFT_NAME_MAX_LENGTH + 1, maxLength: SHIFT_NAME_MAX_LENGTH + 100 })
      .filter((s) => s.trim().length > SHIFT_NAME_MAX_LENGTH);

    fc.assert(
      fc.property(validShiftInputArb, longNameArb, (validInput, longName) => {
        const input: ShiftFormInput = { ...validInput, name: longName };
        const result = validateShift(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.name).toBe(SHIFT_I18N_KEYS.VALIDATION_NAME_MAX_LENGTH);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any input with invalid icon (not exactly 1 emoji)', () => {
    const invalidIconArb = fc.oneof(
      fc.constant(''),
      fc.string({ minLength: 1, maxLength: 5 }).filter(
        (s) => {
          const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
          const segments = [...segmenter.segment(s)];
          const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u;
          return !(segments.length === 1 && emojiRegex.test(s));
        },
      ),
      fc.constant('😀😀'),
      fc.constant('AB'),
      fc.constant('hello'),
    );

    fc.assert(
      fc.property(validShiftInputArb, invalidIconArb, (validInput, invalidIcon) => {
        const input: ShiftFormInput = { ...validInput, icon: invalidIcon };
        const result = validateShift(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.icon).toBe(SHIFT_I18N_KEYS.VALIDATION_ICON_REQUIRED);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any input with invalid backgroundColor (not in PREDEFINED_PALETTE)', () => {
    const invalidColorArb = fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => !(PREDEFINED_PALETTE as readonly string[]).includes(s));

    fc.assert(
      fc.property(validShiftInputArb, invalidColorArb, (validInput, invalidColor) => {
        const input: ShiftFormInput = { ...validInput, backgroundColor: invalidColor };
        const result = validateShift(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.backgroundColor).toBe(SHIFT_I18N_KEYS.VALIDATION_COLOR_REQUIRED);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any input with invalid startTime (not integer 0-1439)', () => {
    const invalidStartTimeArb = fc.oneof(
      fc.integer({ min: -1000, max: -1 }),
      fc.integer({ min: SHIFT_TIME_MAX + 1, max: 10000 }),
      fc.double({ min: 0.01, max: 1438.99, noInteger: true }),
    );

    fc.assert(
      fc.property(validShiftInputArb, invalidStartTimeArb, (validInput, invalidStartTime) => {
        const input: ShiftFormInput = { ...validInput, startTime: invalidStartTime };
        const result = validateShift(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.startTime).toBe(SHIFT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any input with invalid endTime (not integer 0-1439)', () => {
    const invalidEndTimeArb = fc.oneof(
      fc.integer({ min: -1000, max: -1 }),
      fc.integer({ min: SHIFT_TIME_MAX + 1, max: 10000 }),
      fc.double({ min: 0.01, max: 1438.99, noInteger: true }),
    );

    fc.assert(
      fc.property(validShiftInputArb, invalidEndTimeArb, (validInput, invalidEndTime) => {
        const input: ShiftFormInput = { ...validInput, endTime: invalidEndTime };
        const result = validateShift(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.endTime).toBe(SHIFT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any input with invalid hoursWorked (not integer 1-1440)', () => {
    const invalidHoursWorkedArb = fc.oneof(
      fc.integer({ min: -1000, max: 0 }),
      fc.integer({ min: SHIFT_HOURS_WORKED_MAX + 1, max: 10000 }),
      fc.double({ min: 1.01, max: 1439.99, noInteger: true }),
    );

    fc.assert(
      fc.property(validShiftInputArb, invalidHoursWorkedArb, (validInput, invalidHoursWorked) => {
        const input: ShiftFormInput = { ...validInput, hoursWorked: invalidHoursWorked };
        const result = validateShift(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.hoursWorked).toBe(SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should accept any input where ALL fields are valid', () => {
    fc.assert(
      fc.property(validShiftInputArb, (input) => {
        const result = validateShift(input);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
