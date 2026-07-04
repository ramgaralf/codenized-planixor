import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { useFormValidation, type FieldValidation } from './useFormValidation';

/**
 * Property-based tests for useFormValidation hook.
 * Feature: gh32-improvements-and-bug-fixes, Properties 7–9
 *
 * **Validates: Requirements 8.1, 8.3, 8.5**
 */

/** Reserved object prototype property names that collide with Object.prototype. */
const RESERVED_NAMES = new Set([
  'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
  'toLocaleString', 'toString', 'valueOf', '__proto__', '__defineGetter__',
  '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
]);

/** Generates a valid field name (non-empty alphanumeric identifier, excludes JS reserved names). */
const fieldNameArb = fc.string({ minLength: 2, maxLength: 20, unit: 'grapheme-ascii' })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9]+$/.test(s) && !RESERVED_NAMES.has(s));

/** Generates an "empty" value: null, undefined, or whitespace-only string. */
const emptyValueArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.integer({ min: 1, max: 10 }).map((len) => ' '.repeat(len)),
  fc.integer({ min: 1, max: 5 }).map((len) => '\t'.repeat(len)),
  fc.integer({ min: 1, max: 3 }).map((len) => ' \t\n'.repeat(len)),
);

/** Generates a non-empty valid string value (trimmed length > 0). */
const validValueArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
  .filter((s) => s.trim().length > 0);

/** Generates a set of N unique field names. */
const uniqueFieldNamesArb = (min: number, max: number): fc.Arbitrary<string[]> =>
  fc.uniqueArray(fieldNameArb, { minLength: min, maxLength: max });

describe('useFormValidation — Property Tests', () => {
  /**
   * Property 7: Form validation rejects empty mandatory fields
   *
   * For any form with N mandatory fields (2–6), when at least one mandatory field
   * is empty (null, undefined, or whitespace-only), validateAll() SHALL return false
   * and the errors object SHALL have at least one key.
   *
   * **Validates: Requirements 8.1**
   */
  describe('Property 7: Form validation rejects empty mandatory fields', () => {
    it('any form with N required fields, at least one empty → errors produced', () => {
      fc.assert(
        fc.property(
          uniqueFieldNamesArb(2, 6).chain((fieldNames) => {
            // Generate values where at least one field is empty
            // Pick a random index to be the "guaranteed empty" field
            return fc.integer({ min: 0, max: fieldNames.length - 1 }).chain((emptyIndex) => {
              const valuesArbs = fieldNames.map((_, i) =>
                i === emptyIndex ? emptyValueArb : fc.oneof(validValueArb, emptyValueArb),
              );
              return fc.tuple(fc.constant(fieldNames), fc.tuple(...valuesArbs));
            });
          }),
          ([fieldNames, fieldValues]) => {
            // Build the fields config and values object
            const fields: Record<string, FieldValidation> = {};
            const values: Record<string, unknown> = {};

            for (let i = 0; i < fieldNames.length; i++) {
              fields[fieldNames[i]] = { required: true };
              values[fieldNames[i]] = fieldValues[i];
            }

            const { result } = renderHook(() => useFormValidation(fields, values));

            let isValid: boolean;
            act(() => {
              isValid = result.current.validateAll();
            });

            // At least one field is empty, so validation must fail
            expect(isValid!).toBe(false);
            expect(Object.keys(result.current.errors).length).toBeGreaterThanOrEqual(1);
            expect(result.current.hasErrors).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Form validation passes when all mandatory fields are valid
   *
   * For any form with N mandatory fields (2–6), when all fields contain non-empty
   * valid values, validateAll() SHALL return true and the errors object SHALL be empty.
   *
   * **Validates: Requirements 8.3**
   */
  describe('Property 8: Form validation passes when all mandatory fields are valid', () => {
    it('all fields valid → zero errors', () => {
      fc.assert(
        fc.property(
          uniqueFieldNamesArb(2, 6).chain((fieldNames) => {
            const valuesArbs = fieldNames.map(() => validValueArb);
            return fc.tuple(fc.constant(fieldNames), fc.tuple(...valuesArbs));
          }),
          ([fieldNames, fieldValues]) => {
            const fields: Record<string, FieldValidation> = {};
            const values: Record<string, unknown> = {};

            for (let i = 0; i < fieldNames.length; i++) {
              fields[fieldNames[i]] = { required: true };
              values[fieldNames[i]] = fieldValues[i];
            }

            const { result } = renderHook(() => useFormValidation(fields, values));

            let isValid: boolean;
            act(() => {
              isValid = result.current.validateAll();
            });

            expect(isValid!).toBe(true);
            expect(Object.keys(result.current.errors)).toHaveLength(0);
            expect(result.current.hasErrors).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 9: Field modification clears its error
   *
   * After validateAll() produces errors, calling clearFieldError(field) for each
   * errored field SHALL immediately remove that field's error from the errors object.
   *
   * **Validates: Requirements 8.5**
   */
  describe('Property 9: Field modification clears its error', () => {
    it('modify errored field → error removed immediately', () => {
      fc.assert(
        fc.property(
          uniqueFieldNamesArb(2, 6).chain((fieldNames) => {
            // Make ALL fields empty so they all produce errors
            const valuesArbs = fieldNames.map(() => emptyValueArb);
            return fc.tuple(fc.constant(fieldNames), fc.tuple(...valuesArbs));
          }),
          ([fieldNames, fieldValues]) => {
            const fields: Record<string, FieldValidation> = {};
            const values: Record<string, unknown> = {};

            for (let i = 0; i < fieldNames.length; i++) {
              fields[fieldNames[i]] = { required: true };
              values[fieldNames[i]] = fieldValues[i];
            }

            const { result } = renderHook(() => useFormValidation(fields, values));

            // First, produce errors via validateAll
            act(() => {
              result.current.validateAll();
            });

            // All fields should have errors
            const erroredFields = Object.keys(result.current.errors);
            expect(erroredFields.length).toBe(fieldNames.length);

            // Clear each field's error one by one and verify it's removed immediately
            for (const field of erroredFields) {
              act(() => {
                result.current.clearFieldError(field as keyof typeof values);
              });

              // The error for this specific field should be gone
              expect(result.current.errors[field as keyof typeof values]).toBeUndefined();
            }

            // After clearing all, no errors remain
            expect(Object.keys(result.current.errors)).toHaveLength(0);
            expect(result.current.hasErrors).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
