/**
 * Pure validation functions for calendar events.
 *
 * Shared between form-level validation (UI hooks) and
 * service-level validation (persistence layer) to enforce
 * dual validation and guarantee data integrity.
 *
 * The new model uses startDay/endDay (multi-day events).
 * Time validation only applies to reminders when endDay == startDay.
 * Shifts have no time validation (times are read-only from definition).
 */

import type { CalendarEvent, ValidationResult } from './models';
import {
  CALENDAR_EVENT_I18N_KEYS,
  MAX_NOTES_LENGTH,
  MIN_MINUTES,
  MAX_MINUTES,
} from './constants';

/**
 * Validates that endDay is on or after startDay.
 * Both values are ISO date strings (YYYY-MM-DD).
 *
 * **Validates: Requirements 1.11, 11.5**
 */
export const validateDayRange = (startDay: string, endDay: string): boolean => {
  return endDay >= startDay;
};

/**
 * Validates time range for reminder events.
 *
 * Returns true if:
 * - endDay > startDay (any times are valid for multi-day reminders), OR
 * - endDay == startDay AND endTime > startTime
 *
 * For shift events this function is not applicable (shifts always pass
 * time validation since their times are read-only from the definition).
 *
 * **Validates: Requirements 1.10, 11.6**
 */
export const validateTimeForReminder = (
  startDay: string,
  endDay: string,
  startTime: number,
  endTime: number,
): boolean => {
  if (endDay > startDay) {
    return true;
  }
  return endTime > startTime;
};

/**
 * Computes the total duration in minutes for a calendar event.
 *
 * For shifts: returns the shift's hoursWorked value (passed as shiftHoursWorked).
 * For reminders: calculates from day difference × 1440 + (endTime - startTime).
 *
 * **Validates: Requirements 1.5, 11.7**
 */
export const computeTotalHours = (
  eventType: 'shift' | 'reminder',
  startDay: string,
  endDay: string,
  startTime: number,
  endTime: number,
  shiftHoursWorked?: number,
): number => {
  if (eventType === 'shift') {
    return shiftHoursWorked ?? 0;
  }

  const start = new Date(startDay);
  const end = new Date(endDay);
  const dayDifferenceMs = end.getTime() - start.getTime();
  const dayDifference = Math.round(dayDifferenceMs / (1000 * 60 * 60 * 24));

  return dayDifference * 1440 + (endTime - startTime);
};

/**
 * Computes the endDay for a shift event based on crossing midnight.
 *
 * If endTime < startTime (crossing midnight): returns startDay + 1 day.
 * Otherwise: returns startDay.
 *
 * **Validates: Requirements 1.6, 11.7**
 */
export const computeEndDayForShift = (
  startDay: string,
  startTime: number,
  endTime: number,
): string => {
  if (endTime < startTime) {
    const date = new Date(startDay);
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return startDay;
};

/**
 * Validates all required fields on a calendar event.
 * Returns field-level errors keyed by field name with i18n message keys.
 *
 * Checks: eventType, eventTypeId, startDay, endDay, totalHours, startTime, endTime.
 *
 * **Validates: Requirements 1.2, 1.12**
 */
export const validateRequiredFields = (
  event: Partial<CalendarEvent>,
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!event.eventType) {
    errors.eventType = CALENDAR_EVENT_I18N_KEYS.VALIDATION_EVENT_TYPE_REQUIRED;
  }

  if (!event.eventTypeId) {
    errors.eventTypeId = CALENDAR_EVENT_I18N_KEYS.VALIDATION_EVENT_TYPE_ID_REQUIRED;
  }

  if (!event.startDay) {
    errors.startDay = CALENDAR_EVENT_I18N_KEYS.VALIDATION_START_DAY_REQUIRED;
  }

  if (!event.endDay) {
    errors.endDay = CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_DAY_REQUIRED;
  }

  if (
    event.totalHours === undefined ||
    event.totalHours === null
  ) {
    errors.totalHours = CALENDAR_EVENT_I18N_KEYS.VALIDATION_TOTAL_HOURS_REQUIRED;
  }

  if (
    event.startTime === undefined ||
    event.startTime === null ||
    event.startTime < MIN_MINUTES ||
    event.startTime > MAX_MINUTES
  ) {
    errors.startTime = CALENDAR_EVENT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED;
  }

  if (
    event.endTime === undefined ||
    event.endTime === null ||
    event.endTime < MIN_MINUTES ||
    event.endTime > MAX_MINUTES
  ) {
    errors.endTime = CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates that notes are within the allowed length.
 * Returns true if notes is null or within MAX_NOTES_LENGTH (250).
 *
 * **Validates: Requirement 1.3**
 */
export const validateNotes = (notes: string | null): boolean => {
  if (notes === null) {
    return true;
  }
  return notes.length <= MAX_NOTES_LENGTH;
};

/**
 * Checks the one-shift-per-day constraint.
 * Returns true (allowed) if:
 * - eventType is "reminder" (no constraint applies), OR
 * - no other non-deleted shift event exists with the same startDay
 *   (excluding the event with excludeEventId if provided).
 *
 * Returns false (constraint violated) if a duplicate shift exists.
 *
 * **Validates: Requirements 2.1, 2.3, 2.4, 2.5**
 */
export const checkOneShiftPerDay = (
  startDay: string,
  eventType: 'shift' | 'reminder',
  existingEvents: CalendarEvent[],
  excludeEventId?: string,
): boolean => {
  if (eventType === 'reminder') {
    return true;
  }

  const conflictingShift = existingEvents.some(
    (event) =>
      event.startDay === startDay &&
      event.eventType === 'shift' &&
      !event.isDeleted &&
      event.id !== excludeEventId,
  );

  return !conflictingShift;
};
