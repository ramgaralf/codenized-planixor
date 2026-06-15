/**
 * Predefined color palette for shift backgrounds.
 * Both React Web and Android use the same set of colors.
 * The original 10 colors remain valid for backward compatibility.
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

/**
 * Extended color palette organized by color family with intensity variants.
 * Each row represents a color family from light to dark.
 * The "recommended" shade per theme is indicated by the theme helpers below.
 */
export const COLOR_FAMILIES = [
  { name: 'Red',    shades: ['#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#991B1B'] },
  { name: 'Orange', shades: ['#FDBA74', '#FB923C', '#F97316', '#EA580C', '#9A3412'] },
  { name: 'Amber',  shades: ['#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#92400E'] },
  { name: 'Green',  shades: ['#6EE7B7', '#34D399', '#10B981', '#059669', '#065F46'] },
  { name: 'Teal',   shades: ['#67E8F9', '#22D3EE', '#0B86D4', '#0E7490', '#155E75'] },
  { name: 'Blue',   shades: ['#93C5FD', '#60A5FA', '#2563EB', '#1D4ED8', '#1E3A8A'] },
  { name: 'Purple', shades: ['#C4B5FD', '#A78BFA', '#7C3AED', '#6D28D9', '#4C1D95'] },
  { name: 'Pink',   shades: ['#F9A8D4', '#F472B6', '#EC4899', '#DB2777', '#9D174D'] },
  { name: 'Gray',   shades: ['#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#1F2937'] },
] as const;

/** All valid colors (flat list of all shades) for validation purposes. */
export const ALL_PALETTE_COLORS: string[] = COLOR_FAMILIES.flatMap(f => [...f.shades]);

/**
 * Returns the recommended shade indices for the current theme.
 * In light mode: darker shades (indices 2-4) have better contrast against white backgrounds.
 * In dark mode: lighter shades (indices 0-2) have better contrast against dark backgrounds.
 */
export const getRecommendedIndices = (theme: 'light' | 'dark'): number[] => {
  return theme === 'dark' ? [0, 1, 2] : [2, 3, 4];
};

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
