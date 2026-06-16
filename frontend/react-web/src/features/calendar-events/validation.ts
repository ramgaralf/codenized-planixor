/**
 * Pure validation functions for calendar events.
 *
 * Shared between form-level validation (UI hooks) and
 * service-level validation (persistence layer) to enforce
 * dual validation and guarantee data integrity.
 */

import type { CalendarEvent, ValidationResult } from './models';
import {
  CALENDAR_EVENT_I18N_KEYS,
  MAX_NOTES_LENGTH,
  MIN_MINUTES,
  MAX_MINUTES,
} from './constants';

/**
 * Validates that the end time is strictly after the start time.
 * Both values are minutes from midnight (0–1439).
 *
 * **Validates: Requirements 1.8, 11.5**
 */
export const validateTimeRange = (startTime: number, endTime: number): boolean => {
  return endTime > startTime;
};

/**
 * Validates all required fields on a calendar event.
 * Returns field-level errors keyed by field name with i18n message keys.
 *
 * **Validates: Requirements 1.2, 1.9, 2.1**
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

  if (!event.day) {
    errors.day = CALENDAR_EVENT_I18N_KEYS.VALIDATION_DAY_REQUIRED;
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
 * Returns true if notes is null or within MAX_NOTES_LENGTH (200).
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
 * - no other non-deleted shift event exists for the given day
 *   (excluding the event with excludeEventId if provided).
 *
 * Returns false (constraint violated) if a duplicate shift exists.
 *
 * **Validates: Requirements 2.1, 2.3, 2.4, 2.5**
 */
export const checkOneShiftPerDay = (
  day: string,
  eventType: 'shift' | 'reminder',
  existingEvents: CalendarEvent[],
  excludeEventId?: string,
): boolean => {
  if (eventType === 'reminder') {
    return true;
  }

  const conflictingShift = existingEvents.some(
    (event) =>
      event.day === day &&
      event.eventType === 'shift' &&
      !event.isDeleted &&
      event.id !== excludeEventId,
  );

  return !conflictingShift;
};
