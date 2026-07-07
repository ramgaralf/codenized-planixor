import { z } from 'zod';

import {
  PREDEFINED_PALETTE,
  REMINDER_I18N_KEYS,
  REMINDER_NAME_MAX_LENGTH,
  REMINDER_NAME_MIN_LENGTH,
} from '@features/reminders/constants';

const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u;

const isExactlyOneEmoji = (value: string): boolean => {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(value)];
  return segments.length === 1 && EMOJI_REGEX.test(value);
};

export const VALID_SERIES_FREQUENCIES = ['never', 'weekly', 'monthly', 'yearly'] as const;
export type SeriesFrequency = (typeof VALID_SERIES_FREQUENCIES)[number];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidFutureDate = (value: string): boolean => {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  // Validate that the date components are valid (e.g., not Feb 30)
  if (date.getFullYear() !== year || date.getMonth() !== month! - 1 || date.getDate() !== day) {
    return false;
  }
  return date >= today;
};

export const reminderValidationSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .check(
      z.refine((val) => val.length >= REMINDER_NAME_MIN_LENGTH, {
        message: REMINDER_I18N_KEYS.VALIDATION_NAME_REQUIRED,
      }),
      z.refine((val) => val.length <= REMINDER_NAME_MAX_LENGTH, {
        message: REMINDER_I18N_KEYS.VALIDATION_NAME_MAX_LENGTH,
      }),
    ),
  icon: z.string().check(
    z.refine((val) => isExactlyOneEmoji(val), {
      message: REMINDER_I18N_KEYS.VALIDATION_ICON_REQUIRED,
    }),
  ),
  backgroundColor: z.string().check(
    z.refine(
      (val) => PREDEFINED_PALETTE.some((color) => color.toLowerCase() === val.toLowerCase()),
      {
        message: REMINDER_I18N_KEYS.VALIDATION_COLOR_REQUIRED,
      },
    ),
  ),
  seriesFrequency: z.string().check(
    z.refine(
      (val): val is SeriesFrequency =>
        VALID_SERIES_FREQUENCIES.includes(val as SeriesFrequency),
      {
        message: REMINDER_I18N_KEYS.VALIDATION_FREQUENCY_REQUIRED,
      },
    ),
  ),
  seriesEndDate: z.string().nullable().check(
    z.refine(
      (val) => {
        // null is valid when frequency is 'never' (validated at form level)
        if (val === null) return true;
        // Must be a valid future ISO date
        return isValidFutureDate(val);
      },
      {
        message: REMINDER_I18N_KEYS.VALIDATION_END_DATE_INVALID,
      },
    ),
  ),
});

export type ReminderFormInput = z.input<typeof reminderValidationSchema>;
export type ReminderFormOutput = z.output<typeof reminderValidationSchema>;

export interface ReminderValidationErrors {
  name?: string;
  icon?: string;
  backgroundColor?: string;
  seriesFrequency?: string;
  seriesEndDate?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ReminderValidationErrors;
}

export const validateReminder = (data: {
  name: string;
  icon: string;
  backgroundColor: string;
  seriesFrequency: string;
  seriesEndDate?: string | null;
}): ValidationResult => {
  const result = reminderValidationSchema.safeParse({
    ...data,
    seriesEndDate: data.seriesEndDate ?? null,
  });

  if (result.success) {
    return { isValid: true, errors: {} };
  }

  const errors: ReminderValidationErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ReminderValidationErrors;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { isValid: false, errors };
};
