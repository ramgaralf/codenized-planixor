/**
 * Predefined color palette for shift backgrounds.
 * Both React Web and Android use the same set of colors.
 */
export const PREDEFINED_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Green
  '#0B86D4', // Teal
  '#2563EB', // Blue
  '#7C3AED', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#1F2937', // Dark
] as const;

export type PaletteColor = (typeof PREDEFINED_PALETTE)[number];

/**
 * Validation limits for shift fields.
 */
export const SHIFT_NAME_MIN_LENGTH = 1;
export const SHIFT_NAME_MAX_LENGTH = 50;
export const SHIFT_TIME_MIN = 0;
export const SHIFT_TIME_MAX = 1439;
export const SHIFT_HOURS_WORKED_MIN = 1;
export const SHIFT_HOURS_WORKED_MAX = 1440;

/**
 * i18n keys for shift-related validation and UI messages.
 */
export const SHIFT_I18N_KEYS = {
  VALIDATION_NAME_REQUIRED: 'shift.validation.name.required',
  VALIDATION_NAME_MAX_LENGTH: 'shift.validation.name.maxLength',
  VALIDATION_ICON_REQUIRED: 'shift.validation.icon.required',
  VALIDATION_COLOR_REQUIRED: 'shift.validation.color.required',
  VALIDATION_START_TIME_REQUIRED: 'shift.validation.startTime.required',
  VALIDATION_END_TIME_REQUIRED: 'shift.validation.endTime.required',
  VALIDATION_HOURS_WORKED_RANGE: 'shift.validation.hoursWorked.range',
  ERROR_LOAD_FAILED: 'shift.error.loadFailed',
  EMPTY: 'shift.empty',
  DEACTIVATE_CONFIRM: 'shift.deactivate.confirm',
  DELETE_CONFIRM: 'shift.delete.confirm',
} as const;
