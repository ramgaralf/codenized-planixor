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
export const MAX_NOTES_LENGTH = 200;

/**
 * i18n keys for calendar-event-related validation and UI messages.
 */
export const CALENDAR_EVENT_I18N_KEYS = {
  VALIDATION_EVENT_TYPE_REQUIRED: 'calendarEvent.validation.eventType.required',
  VALIDATION_EVENT_TYPE_ID_REQUIRED: 'calendarEvent.validation.eventTypeId.required',
  VALIDATION_DAY_REQUIRED: 'calendarEvent.validation.day.required',
  VALIDATION_START_TIME_REQUIRED: 'calendarEvent.validation.startTime.required',
  VALIDATION_END_TIME_REQUIRED: 'calendarEvent.validation.endTime.required',
  VALIDATION_END_TIME_AFTER_START: 'calendarEvent.validation.endTime.afterStart',
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
