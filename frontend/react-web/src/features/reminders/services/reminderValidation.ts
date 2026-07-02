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
});

export type ReminderFormInput = z.input<typeof reminderValidationSchema>;
export type ReminderFormOutput = z.output<typeof reminderValidationSchema>;

export interface ReminderValidationErrors {
  name?: string;
  icon?: string;
  backgroundColor?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ReminderValidationErrors;
}

export const validateReminder = (data: {
  name: string;
  icon: string;
  backgroundColor: string;
}): ValidationResult => {
  const result = reminderValidationSchema.safeParse(data);

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
