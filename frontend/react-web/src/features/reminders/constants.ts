/**
 * Predefined color palette for reminder backgrounds.
 * 9 color families × 5 shades = 45 colors total.
 * Both React Web and Android use the same set of colors.
 */
export const COLOR_FAMILIES = [
  { name: 'Red', shades: ['#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#991B1B'] },
  { name: 'Orange', shades: ['#FDBA74', '#FB923C', '#F97316', '#EA580C', '#9A3412'] },
  { name: 'Amber', shades: ['#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#92400E'] },
  { name: 'Green', shades: ['#6EE7B7', '#34D399', '#10B981', '#059669', '#065F46'] },
  { name: 'Teal', shades: ['#67E8F9', '#22D3EE', '#0B86D4', '#0E7490', '#155E75'] },
  { name: 'Blue', shades: ['#93C5FD', '#60A5FA', '#2563EB', '#1D4ED8', '#1E3A8A'] },
  { name: 'Purple', shades: ['#C4B5FD', '#A78BFA', '#7C3AED', '#6D28D9', '#4C1D95'] },
  { name: 'Pink', shades: ['#F9A8D4', '#F472B6', '#EC4899', '#DB2777', '#9D174D'] },
  { name: 'Gray', shades: ['#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#1F2937'] },
] as const;

/** All valid colors (flat list of all 45 shades) for validation purposes. */
export const PREDEFINED_PALETTE: string[] = COLOR_FAMILIES.flatMap((f) => [...f.shades]);

/**
 * Returns the recommended shade indices for the current theme.
 * In light mode: darker shades (indices 2-4) have better contrast against white backgrounds.
 * In dark mode: lighter shades (indices 0-2) have better contrast against dark backgrounds.
 */
export const getRecommendedIndices = (theme: 'light' | 'dark'): number[] => {
  return theme === 'dark' ? [0, 1, 2] : [2, 3, 4];
};

/**
 * Validation limits for reminder fields.
 */
export const REMINDER_NAME_MIN_LENGTH = 1;
export const REMINDER_NAME_MAX_LENGTH = 50;

/**
 * i18n keys for reminder-related validation and UI messages.
 */
export const REMINDER_I18N_KEYS = {
  VALIDATION_NAME_REQUIRED: 'reminder.validation.name.required',
  VALIDATION_NAME_MAX_LENGTH: 'reminder.validation.name.maxLength',
  VALIDATION_ICON_REQUIRED: 'reminder.validation.icon.required',
  VALIDATION_COLOR_REQUIRED: 'reminder.validation.color.required',
  VALIDATION_FREQUENCY_REQUIRED: 'reminder.validation.frequency.required',
  VALIDATION_END_DATE_INVALID: 'reminder.validation.endDate.invalid',
  ERROR_LOAD_FAILED: 'reminder.error.loadFailed',
  ERROR_SAVE_FAILED: 'reminder.error.saveFailed',
  EMPTY: 'reminder.empty',
  NEW_REMINDER: 'reminder.newReminder',
  DEACTIVATE_TITLE: 'reminder.deactivate.title',
  DEACTIVATE_CONFIRM: 'reminder.deactivate.confirm',
  DELETE_TITLE: 'reminder.delete.title',
  DELETE_CONFIRM: 'reminder.delete.confirm',
  BADGE_DEACTIVATED: 'reminder.badge.deactivated',
} as const;
