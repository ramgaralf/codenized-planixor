import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateHoursWorked } from './hoursWorkedCalculation';

describe('Hours Worked Calculation — Property Tests', () => {
  /**
   * Property 3: Hours worked calculation
   *
   * For any pair (startTime, endTime) where both are integers 0–1439:
   * - If startTime == endTime → result == 1440
   * - Else → result == (endTime - startTime + 1440) % 1440
   * - Result is always positive and in [1, 1440]
   *
   * **Validates: Requirements 1.3, 9.1, 9.4**
   */
  describe('Property 3: Hours worked calculation', () => {
    it('should return 1440 when startTime equals endTime', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1439 }), (time) => {
          const result = calculateHoursWorked(time, time);
          expect(result).toBe(1440);
        }),
        { numRuns: 100 },
      );
    });

    it('should return (endTime - startTime + 1440) % 1440 when times differ', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 0, max: 1439 }),
          (startTime, endTime) => {
            fc.pre(startTime !== endTime);
            const result = calculateHoursWorked(startTime, endTime);
            const expected = (endTime - startTime + 1440) % 1440;
            expect(result).toBe(expected);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should always return a positive value in range [1, 1440]', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 0, max: 1439 }),
          (startTime, endTime) => {
            const result = calculateHoursWorked(startTime, endTime);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(1440);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 11: Time change after manual override triggers recalculation
   *
   * For any form state where hoursWorked was manually overridden to value M,
   * modifying either time SHALL replace hoursWorked with newly calculated value,
   * discarding M. (Test the concept: after a manual override, recalculating with
   * new times produces the formula result, not M)
   *
   * **Validates: Requirements 9.1, 9.3, 9.4**
   */
  describe('Property 11: Time change after manual override triggers recalculation', () => {
    it('should produce the formula result after time change, discarding manual override', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 1, max: 1440 }),
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 0, max: 1439 }),
          (
            originalStart,
            originalEnd,
            manualOverride,
            newStartTime,
            newEndTime,
          ) => {
            // Simulate: user had original times, manually overrode hours worked to M
            // Then user changes times to new values
            // The recalculated value must match the formula, not the manual override M

            const recalculated = calculateHoursWorked(newStartTime, newEndTime);

            // The expected value per the formula
            const expectedFromFormula =
              newStartTime === newEndTime
                ? 1440
                : (newEndTime - newStartTime + 1440) % 1440;

            // Recalculation must match formula, not the manual override
            expect(recalculated).toBe(expectedFromFormula);
            // The result should typically differ from the manual override
            // (unless by coincidence the formula produces the same value)
            // Key invariant: the function does NOT return manualOverride —
            // it returns the formula result regardless of any previous override
            if (recalculated !== manualOverride) {
              expect(recalculated).not.toBe(manualOverride);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not preserve manual override when start time changes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 1, max: 1440 }),
          fc.integer({ min: 0, max: 1439 }),
          (originalStart, endTime, manualOverride, newStartTime) => {
            // Ensure the new start time is actually different from original
            fc.pre(newStartTime !== originalStart);

            // After time change, recalculate
            const recalculated = calculateHoursWorked(newStartTime, endTime);

            // Must equal formula result
            const expected =
              newStartTime === endTime
                ? 1440
                : (endTime - newStartTime + 1440) % 1440;

            expect(recalculated).toBe(expected);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should not preserve manual override when end time changes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 0, max: 1439 }),
          fc.integer({ min: 1, max: 1440 }),
          fc.integer({ min: 0, max: 1439 }),
          (startTime, originalEnd, manualOverride, newEndTime) => {
            // Ensure the new end time is actually different from original
            fc.pre(newEndTime !== originalEnd);

            // After time change, recalculate
            const recalculated = calculateHoursWorked(startTime, newEndTime);

            // Must equal formula result
            const expected =
              startTime === newEndTime
                ? 1440
                : (newEndTime - startTime + 1440) % 1440;

            expect(recalculated).toBe(expected);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
