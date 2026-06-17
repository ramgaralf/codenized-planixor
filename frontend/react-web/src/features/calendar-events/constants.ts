/**
 * View modes available for the calendar display.
 */
export const VIEW_MODES = {
  Day: 'day',
  Week: 'week',
  Month: 'month',
  Year: 'year',
} as const;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];

/**
 * Time constants for calendar event fields.
 * Times are stored as minutes from midnight.
 */
export const MIN_MINUTES = 0;
export const MAX_MINUTES = 1439;

/**
 * Validation limits for calendar event fields.
 */
export const MAX_NOTES_LENGTH = 250;

/**
 * Validation error key constants for the new multi-day model.
 */
export const ERROR_INVALID_DAY_RANGE = 'ERROR_INVALID_DAY_RANGE';
export const ERROR_INVALID_TIME_FOR_REMINDER = 'ERROR_INVALID_TIME_FOR_REMINDER';
export const ERROR_CROSSING_MIDNIGHT = 'ERROR_CROSSING_MIDNIGHT';

/**
 * i18n keys for calendar-event-related validation and UI messages.
 */
export const CALENDAR_EVENT_I18N_KEYS = {
  VALIDATION_EVENT_TYPE_REQUIRED: 'calendarEvent.validation.eventType.required',
  VALIDATION_EVENT_TYPE_ID_REQUIRED: 'calendarEvent.validation.eventTypeId.required',
  VALIDATION_START_DAY_REQUIRED: 'calendarEvent.validation.startDay.required',
  VALIDATION_END_DAY_REQUIRED: 'calendarEvent.validation.endDay.required',
  VALIDATION_TOTAL_HOURS_REQUIRED: 'calendarEvent.validation.totalHours.required',
  VALIDATION_START_TIME_REQUIRED: 'calendarEvent.validation.startTime.required',
  VALIDATION_END_TIME_REQUIRED: 'calendarEvent.validation.endTime.required',
  VALIDATION_INVALID_DAY_RANGE: 'calendarEvent.validation.dayRange.invalid',
  VALIDATION_INVALID_TIME_FOR_REMINDER: 'calendarEvent.validation.timeForReminder.invalid',
  VALIDATION_CROSSING_MIDNIGHT: 'calendarEvent.validation.crossingMidnight.info',
  VALIDATION_NOTES_MAX_LENGTH: 'calendarEvent.validation.notes.maxLength',
  VALIDATION_ONE_SHIFT_PER_DAY: 'calendarEvent.validation.oneShiftPerDay',
  ERROR_LOAD_FAILED: 'calendarEvent.error.loadFailed',
  ERROR_SAVE_FAILED: 'calendarEvent.error.saveFailed',
  ERROR_DELETE_FAILED: 'calendarEvent.error.deleteFailed',
  DELETE_TITLE: 'calendarEvent.delete.title',
  DELETE_MESSAGE: 'calendarEvent.delete.message',
  DELETE_CONFIRM: 'calendarEvent.delete.confirm',
  DELETE_CANCEL: 'calendarEvent.delete.cancel',
} as const;
