import { z } from 'zod';

import {
  PREDEFINED_PALETTE,
  ALL_PALETTE_COLORS,
  SHIFT_HOURS_WORKED_MAX,
  SHIFT_HOURS_WORKED_MIN,
  SHIFT_I18N_KEYS,
  SHIFT_NAME_MAX_LENGTH,
  SHIFT_TIME_MAX,
  SHIFT_TIME_MIN,
} from '@features/shifts/constants';

const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u;

const isExactlyOneEmoji = (value: string): boolean => {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(value)];
  return segments.length === 1 && EMOJI_REGEX.test(value);
};

export const shiftValidationSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .check(
      z.refine((val) => val.length >= 1, {
        message: SHIFT_I18N_KEYS.VALIDATION_NAME_REQUIRED,
      }),
      z.refine((val) => val.length <= SHIFT_NAME_MAX_LENGTH, {
        message: SHIFT_I18N_KEYS.VALIDATION_NAME_MAX_LENGTH,
      }),
    ),
  icon: z.string().check(
    z.refine((val) => isExactlyOneEmoji(val), {
      message: SHIFT_I18N_KEYS.VALIDATION_ICON_REQUIRED,
    }),
  ),
  backgroundColor: z.string().check(
    z.refine(
      (val) =>
        (PREDEFINED_PALETTE as readonly string[]).includes(val) ||
        ALL_PALETTE_COLORS.includes(val),
      {
        message: SHIFT_I18N_KEYS.VALIDATION_COLOR_REQUIRED,
      },
    ),
  ),
  startTime: z.number().check(
    z.refine((val) => Number.isInteger(val) && val >= SHIFT_TIME_MIN && val <= SHIFT_TIME_MAX, {
      message: SHIFT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED,
    }),
  ),
  endTime: z.number().check(
    z.refine((val) => Number.isInteger(val) && val >= SHIFT_TIME_MIN && val <= SHIFT_TIME_MAX, {
      message: SHIFT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED,
    }),
  ),
  hoursWorked: z.number().check(
    z.refine(
      (val) => Number.isInteger(val) && val >= SHIFT_HOURS_WORKED_MIN && val <= SHIFT_HOURS_WORKED_MAX,
      {
        message: SHIFT_I18N_KEYS.VALIDATION_HOURS_WORKED_RANGE,
      },
    ),
  ),
});

export type ShiftFormInput = z.input<typeof shiftValidationSchema>;
export type ShiftFormOutput = z.output<typeof shiftValidationSchema>;

export interface ShiftValidationErrors {
  name?: string;
  icon?: string;
  backgroundColor?: string;
  startTime?: string;
  endTime?: string;
  hoursWorked?: string;
}

export const validateShift = (
  input: ShiftFormInput,
): { success: true; data: ShiftFormOutput } | { success: false; errors: ShiftValidationErrors } => {
  const result = shiftValidationSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ShiftValidationErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ShiftValidationErrors;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
};
