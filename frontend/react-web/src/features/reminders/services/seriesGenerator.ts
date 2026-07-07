/**
 * Series Generator — pure function for computing recurring date sequences.
 *
 * Given a start date, frequency, and end date, generates all future
 * occurrence dates. The source date itself is excluded from results.
 *
 * This is a deterministic, side-effect-free function ideal for property-based
 * testing. No I/O, no randomness, no dependencies on external state.
 */

/** Maximum number of occurrences to prevent unbounded generation. */
const SAFETY_CAP = 366;

export interface SeriesGeneratorInput {
  /** Start date in YYYY-MM-DD format */
  startDay: string;
  /** Repetition frequency */
  frequency: 'weekly' | 'monthly' | 'yearly';
  /** End date in YYYY-MM-DD format — generation stops when computed date exceeds this */
  endDate?: string;
  /** Year boundary — generation stops at end of this year. Alternative to endDate. */
  yearBoundary?: number;
}

/**
 * Generated dates are YYYY-MM-DD formatted strings.
 * Using a branded type for documentation clarity while remaining
 * compatible with plain string usage.
 */
export type GeneratedDate = string & { readonly __brand?: 'GeneratedDate' };

/**
 * Returns the number of days in a given month (1-indexed).
 */
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

/**
 * Returns true if the given year is a leap year.
 */
const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

/**
 * Formats year, month, day as a YYYY-MM-DD string.
 */
const formatDate = (year: number, month: number, day: number): string => {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Parses a YYYY-MM-DD string into year, month, day components.
 */
const parseDate = (dateStr: string): { year: number; month: number; day: number } => {
  const parts = dateStr.split('-').map(Number);
  return { year: parts[0]!, month: parts[1]!, day: parts[2]! };
};

/**
 * Adds N days to a date represented as year/month/day.
 * Returns the resulting date components.
 */
const addDays = (
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } => {
  const date = new Date(year, month - 1, day + days);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

/**
 * Generates weekly occurrence dates by adding 7 days repeatedly.
 */
const generateWeekly = (
  startYear: number,
  startMonth: number,
  startDay: number,
  endDate: string,
): GeneratedDate[] => {
  const results: GeneratedDate[] = [];
  let current = { year: startYear, month: startMonth, day: startDay };

  while (results.length < SAFETY_CAP) {
    current = addDays(current.year, current.month, current.day, 7);

    const computed = formatDate(current.year, current.month, current.day);
    if (computed > endDate) break;

    results.push(computed);
  }

  return results;
};

/**
 * Generates monthly occurrence dates on the same day-of-month,
 * clamping to the last day when the month has fewer days.
 */
const generateMonthly = (
  startYear: number,
  startMonth: number,
  sourceDay: number,
  endDate: string,
): GeneratedDate[] => {
  const results: GeneratedDate[] = [];
  let monthsElapsed = 0;

  while (results.length < SAFETY_CAP) {
    monthsElapsed += 1;
    const totalMonths = (startYear * 12 + (startMonth - 1)) + monthsElapsed;
    const nextYear = Math.floor(totalMonths / 12);
    const nextMonth = (totalMonths % 12) + 1;

    const daysInMonth = getDaysInMonth(nextYear, nextMonth);
    const clampedDay = Math.min(sourceDay, daysInMonth);

    const computed = formatDate(nextYear, nextMonth, clampedDay);
    if (computed > endDate) break;

    results.push(computed);
  }

  return results;
};

/**
 * Generates yearly occurrence dates on the same month and day,
 * clamping Feb 29 to Feb 28 in non-leap years.
 */
const generateYearly = (
  startYear: number,
  sourceMonth: number,
  sourceDay: number,
  endDate: string,
): GeneratedDate[] => {
  const results: GeneratedDate[] = [];
  let currentYear = startYear;

  while (results.length < SAFETY_CAP) {
    currentYear += 1;

    let clampedDay = sourceDay;
    if (sourceMonth === 2 && sourceDay === 29 && !isLeapYear(currentYear)) {
      clampedDay = 28;
    }

    const computed = formatDate(currentYear, sourceMonth, clampedDay);
    if (computed > endDate) break;

    results.push(computed);
  }

  return results;
};

/**
 * Generates series occurrence dates based on the input configuration.
 *
 * - Weekly: adds 7 days to the previous date each iteration
 * - Monthly: same day-of-month, clamped to last day if needed
 * - Yearly: same month+day, Feb 29 → Feb 28 in non-leap years
 *
 * Stops when:
 * - The computed date exceeds endDate
 * - The result count reaches 366 (safety cap)
 *
 * The source date itself is always excluded from results.
 */
export const generateSeriesDates = (input: SeriesGeneratorInput): GeneratedDate[] => {
  const { year, month, day } = parseDate(input.startDay);

  // Resolve effective end date: prefer explicit endDate, fall back to yearBoundary
  const effectiveEndDate = input.endDate
    ?? (input.yearBoundary !== undefined ? `${input.yearBoundary}-12-31` : input.startDay);

  switch (input.frequency) {
    case 'weekly':
      return generateWeekly(year, month, day, effectiveEndDate);
    case 'monthly':
      return generateMonthly(year, month, day, effectiveEndDate);
    case 'yearly':
      return generateYearly(year, month, day, effectiveEndDate);
  }
};
