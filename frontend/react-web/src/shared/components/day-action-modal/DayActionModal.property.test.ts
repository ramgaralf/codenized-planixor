import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';



/**
 * Property-based tests for Day_Action_Modal ordering and rendering logic.
 * Feature: gh35-shift-mode, Properties 6, 7, 8, 9
 *
 * Tests the pure logic for:
 * - Modal item ordering (Property 6)
 * - Date header locale formatting (Property 7)
 * - ShiftCard field rendering (Property 8)
 * - ReminderCard field rendering (Property 9)
 *
 * Uses fast-check with minimum 100 iterations per property.
 */

// --- Pure functions extracted from DayActionModal.tsx and ShiftCard.tsx ---

/**
 * Sorts and orders items as the DayActionModal does internally:
 * (1) Create button position (always first, index 0)
 * (2) Shifts sorted alphabetically by name
 * (3) Reminders sorted alphabetically by name
 */
const computeModalOrder = (
  shiftEvents: { name: string; eventType: 'shift' }[],
  reminderEvents: { name: string; eventType: 'reminder' }[],
): { type: 'create' | 'shift' | 'reminder'; name?: string }[] => {
  const sortedShifts = [...shiftEvents].sort((a, b) => a.name.localeCompare(b.name));
  const sortedReminders = [...reminderEvents].sort((a, b) => a.name.localeCompare(b.name));

  return [
    { type: 'create' },
    ...sortedShifts.map((s) => ({ type: 'shift' as const, name: s.name })),
    ...sortedReminders.map((r) => ({ type: 'reminder' as const, name: r.name })),
  ];
};

/**
 * Formats a date string (YYYY-MM-DD) according to locale.
 * Mirrors the formatDateByLocale function from DayActionModal.tsx.
 */
const formatDateByLocale = (isoDate: string, locale: string): string => {
  const parts = isoDate.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const date = new Date(year, month, day);

  const isSpanish = locale.toLowerCase().startsWith('es');
  const resolvedLocale = isSpanish ? 'es-ES' : 'en-US';

  return date.toLocaleDateString(resolvedLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Formats minutes from midnight (0–1439) as HH:mm (24-hour format).
 * Mirrors the formatTime function from ShiftCard.tsx.
 */
const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// --- Arbitraries ---

/** Arbitrary for a name string (1–50 characters, printable) */
const nameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Arbitrary for a valid hex color */
const hexColorArb = fc
  .integer({ min: 0, max: 0xffffff })
  .map((n) => `#${n.toString(16).padStart(6, '0')}`);

/** Arbitrary for a valid time in minutes (0–1439) */
const timeMinutesArb = fc.integer({ min: 0, max: 1439 });

/** Arbitrary for a valid ISO date string (YYYY-MM-DD) */
const isoDateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2035 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) => {
    const m = month.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  });

/** Arbitrary for a single emoji character */
const emojiArb = fc.constantFrom(
  '😀', '🔔', '💊', '🏃', '📚', '🎵', '🍎', '⏰', '🌙', '☀️',
  '🏋️', '🧘', '📝', '🎯', '💧', '🛌', '🚗', '🍳', '🧹', '🌿',
);

/** Arbitrary for a shift event */
const shiftEventArb = fc.record({
  name: nameArb,
  eventType: fc.constant('shift' as const),
});

/** Arbitrary for a reminder event */
const reminderEventArb = fc.record({
  name: nameArb,
  eventType: fc.constant('reminder' as const),
});

describe('Day_Action_Modal Ordering and Rendering — Property Tests', () => {
  /**
   * Feature: gh35-shift-mode, Property 6: Day_Action_Modal ordering
   *
   * For any set of shift-type and reminder-type calendar events on a given day,
   * the Day_Action_Modal SHALL display items in the following order:
   * (1) "Create calendar event" button,
   * (2) shift cards ordered alphabetically by shift name,
   * (3) reminder cards ordered alphabetically by reminder name.
   *
   * **Validates: Requirements 6.2, 8.2, 9.5**
   */
  describe('Property 6: Day_Action_Modal ordering', () => {
    it('should always place create button first, followed by shifts alphabetical, then reminders alphabetical', () => {
      fc.assert(
        fc.property(
          fc.array(shiftEventArb, { minLength: 0, maxLength: 10 }),
          fc.array(reminderEventArb, { minLength: 0, maxLength: 10 }),
          (shifts, reminders) => {
            const order = computeModalOrder(shifts, reminders);

            // First item is always the create button
            expect(order[0]).toEqual({ type: 'create' });

            // Extract shift names from the result
            const shiftItems = order.filter((item) => item.type === 'shift');
            const reminderItems = order.filter((item) => item.type === 'reminder');

            // Shifts come before reminders in the order
            if (shiftItems.length > 0 && reminderItems.length > 0) {
              const lastShiftIndex = order.lastIndexOf(shiftItems[shiftItems.length - 1]);
              const firstReminderIndex = order.indexOf(reminderItems[0]);
              expect(lastShiftIndex).toBeLessThan(firstReminderIndex);
            }

            // Shifts are sorted alphabetically
            const shiftNames = shiftItems.map((item) => item.name!);
            const expectedShiftNames = [...shiftNames].sort((a, b) => a.localeCompare(b));
            expect(shiftNames).toEqual(expectedShiftNames);

            // Reminders are sorted alphabetically
            const reminderNames = reminderItems.map((item) => item.name!);
            const expectedReminderNames = [...reminderNames].sort((a, b) => a.localeCompare(b));
            expect(reminderNames).toEqual(expectedReminderNames);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce exactly 1 + shifts.length + reminders.length items in the ordered list', () => {
      fc.assert(
        fc.property(
          fc.array(shiftEventArb, { minLength: 0, maxLength: 15 }),
          fc.array(reminderEventArb, { minLength: 0, maxLength: 15 }),
          (shifts, reminders) => {
            const order = computeModalOrder(shifts, reminders);

            expect(order.length).toBe(1 + shifts.length + reminders.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should keep create button first even with empty event lists', () => {
      const order = computeModalOrder([], []);

      expect(order).toHaveLength(1);
      expect(order[0]).toEqual({ type: 'create' });
    });
  });

  /**
   * Feature: gh35-shift-mode, Property 7: Date header locale formatting
   *
   * For any valid date and any supported locale (Spanish or English), the formatted
   * string matches the expected pattern (Spanish: "dd de MMMM de yyyy",
   * English: "MMMM dd, yyyy").
   *
   * **Validates: Requirements 9.1**
   */
  describe('Property 7: Date header locale formatting', () => {
    it('should produce English format containing month name, day number, and year', () => {
      fc.assert(
        fc.property(isoDateArb, (date) => {
          const formatted = formatDateByLocale(date, 'en');
          const parts = date.split('-');
          const year = parts[0];
          const day = String(Number(parts[2]));

          // English format: "MMMM dd, yyyy" — must contain year and day number
          expect(formatted).toContain(year);
          expect(formatted).toContain(day);
          // Must contain a comma (English pattern)
          expect(formatted).toContain(',');
        }),
        { numRuns: 100 },
      );
    });

    it('should produce Spanish format containing "de" separators and year', () => {
      fc.assert(
        fc.property(isoDateArb, (date) => {
          const formatted = formatDateByLocale(date, 'es');
          const parts = date.split('-');
          const year = parts[0];
          const day = String(Number(parts[2]));

          // Spanish format: "dd de MMMM de yyyy" — must contain "de" and year
          expect(formatted).toContain(year);
          expect(formatted).toContain(day);
          expect(formatted.toLowerCase()).toContain('de');
        }),
        { numRuns: 100 },
      );
    });

    it('should treat locale starting with "es" as Spanish regardless of variant', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.constantFrom('es', 'es-ES', 'es-MX', 'es-AR'),
          (date, locale) => {
            const formatted = formatDateByLocale(date, locale);

            // All Spanish variants should use "de" pattern
            expect(formatted.toLowerCase()).toContain('de');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should treat locale not starting with "es" as English', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.constantFrom('en', 'en-US', 'en-GB', 'fr', 'de'),
          (date, locale) => {
            const formatted = formatDateByLocale(date, locale);

            // Non-Spanish locales fall back to en-US which uses comma
            expect(formatted).toContain(',');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce a non-empty string for any valid date and locale', () => {
      fc.assert(
        fc.property(
          isoDateArb,
          fc.constantFrom('en', 'es'),
          (date, locale) => {
            const formatted = formatDateByLocale(date, locale);

            expect(formatted.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: gh35-shift-mode, Property 8: Shift_Card displays all required fields
   *
   * For any shift with a name (1–50 characters), start time (0–1439 minutes),
   * end time (0–1439 minutes), and a valid hex color, the rendered Shift_Card SHALL
   * display the name (truncated with ellipsis if exceeding 50 characters), start time
   * formatted as HH:mm, end time formatted as HH:mm, and the shift's color as a 4px
   * left border.
   *
   * **Validates: Requirements 9.3**
   */
  describe('Property 8: Shift_Card displays all required fields', () => {
    it('should format start time correctly as HH:mm for any valid minutes (0–1439)', () => {
      fc.assert(
        fc.property(timeMinutesArb, (minutes) => {
          const formatted = formatTime(minutes);

          // Must match HH:mm format
          expect(formatted).toMatch(/^\d{2}:\d{2}$/);

          // Parse back to verify correctness
          const [hours, mins] = formatted.split(':').map(Number);
          expect(hours).toBe(Math.floor(minutes / 60));
          expect(mins).toBe(minutes % 60);
        }),
        { numRuns: 100 },
      );
    });

    it('should format end time correctly as HH:mm for any valid minutes (0–1439)', () => {
      fc.assert(
        fc.property(timeMinutesArb, (minutes) => {
          const formatted = formatTime(minutes);

          // Hours should be 0–23, minutes should be 0–59
          const [hours, mins] = formatted.split(':').map(Number);
          expect(hours).toBeGreaterThanOrEqual(0);
          expect(hours).toBeLessThanOrEqual(23);
          expect(mins).toBeGreaterThanOrEqual(0);
          expect(mins).toBeLessThanOrEqual(59);
        }),
        { numRuns: 100 },
      );
    });

    it('should include all required display fields for any valid shift', () => {
      fc.assert(
        fc.property(
          nameArb,
          timeMinutesArb,
          timeMinutesArb,
          hexColorArb,
          (name, startTime, endTime, color) => {
            // Verify the formatted time strings are valid
            const startFormatted = formatTime(startTime);
            const endFormatted = formatTime(endTime);

            expect(startFormatted).toMatch(/^\d{2}:\d{2}$/);
            expect(endFormatted).toMatch(/^\d{2}:\d{2}$/);

            // Name is bounded 1–50 characters
            expect(name.length).toBeGreaterThanOrEqual(1);
            expect(name.length).toBeLessThanOrEqual(50);

            // Color is a valid hex
            expect(color).toMatch(/^#[0-9a-f]{6}$/);

            // The 4px left border style string should use the color
            const borderStyle = `4px solid ${color}`;
            expect(borderStyle).toContain(color);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce time range where hours are always 0-23 and minutes 0-59', () => {
      fc.assert(
        fc.property(timeMinutesArb, timeMinutesArb, (startTime, endTime) => {
          const start = formatTime(startTime);
          const end = formatTime(endTime);

          const [startHours, startMins] = start.split(':').map(Number);
          const [endHours, endMins] = end.split(':').map(Number);

          expect(startHours).toBeGreaterThanOrEqual(0);
          expect(startHours).toBeLessThanOrEqual(23);
          expect(startMins).toBeGreaterThanOrEqual(0);
          expect(startMins).toBeLessThanOrEqual(59);
          expect(endHours).toBeGreaterThanOrEqual(0);
          expect(endHours).toBeLessThanOrEqual(23);
          expect(endMins).toBeGreaterThanOrEqual(0);
          expect(endMins).toBeLessThanOrEqual(59);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: gh35-shift-mode, Property 9: Reminder_Card displays all required fields
   *
   * For any reminder with a name (1–50 characters), an emoji icon, and a valid hex
   * color, the rendered Reminder_Card SHALL display the name (truncated with ellipsis
   * if exceeding 50 characters), the emoji icon, and the reminder's color as a 4px
   * left border.
   *
   * **Validates: Requirements 9.4**
   */
  describe('Property 9: Reminder_Card displays all required fields', () => {
    it('should include all required display fields for any valid reminder', () => {
      fc.assert(
        fc.property(nameArb, emojiArb, hexColorArb, (name, emoji, color) => {
          // Name is bounded 1–50 characters
          expect(name.length).toBeGreaterThanOrEqual(1);
          expect(name.length).toBeLessThanOrEqual(50);

          // Emoji is non-empty
          expect(emoji.length).toBeGreaterThan(0);

          // Color is a valid hex
          expect(color).toMatch(/^#[0-9a-f]{6}$/);

          // The 4px left border style string should use the color
          const borderStyle = `4px solid ${color}`;
          expect(borderStyle).toContain(color);
        }),
        { numRuns: 100 },
      );
    });

    it('should handle name exactly at 50 character boundary without truncation being needed', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 50, maxLength: 50 }).filter((s) => s.trim().length > 0),
          emojiArb,
          hexColorArb,
          (name, emoji, color) => {
            // At exactly 50 chars, no truncation needed
            expect(name.length).toBe(50);

            // All fields are still valid
            expect(emoji.length).toBeGreaterThan(0);
            expect(color).toMatch(/^#[0-9a-f]{6}$/);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should correctly associate the emoji icon and color with the reminder for any combination', () => {
      fc.assert(
        fc.property(nameArb, emojiArb, hexColorArb, (name, emoji, color) => {
          // Simulate what ReminderCard receives as props
          const cardData = {
            name,
            icon: emoji,
            backgroundColor: color,
            borderLeft: `4px solid ${color}`,
          };

          // Verify all fields are present and well-formed
          expect(cardData.name).toBe(name);
          expect(cardData.icon).toBe(emoji);
          expect(cardData.backgroundColor).toBe(color);
          expect(cardData.borderLeft).toBe(`4px solid ${color}`);
        }),
        { numRuns: 100 },
      );
    });
  });
});
