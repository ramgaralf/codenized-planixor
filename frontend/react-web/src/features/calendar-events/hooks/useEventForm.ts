import { useCallback, useState } from 'react';

import { useCalendarStore } from '@/stores/calendarStore';

import { CALENDAR_EVENT_I18N_KEYS } from '../constants';
import type { CalendarEvent } from '../models';
import * as calendarEventService from '../services/calendarEventService';
import {
  checkOneShiftPerDay,
  validateNotes,
  validateRequiredFields,
  validateTimeRange,
} from '../validation';

export interface EventFormState {
  eventType: 'shift' | 'reminder' | null;
  eventTypeId: string | null;
  day: string;
  startTime: number | null;
  endTime: number | null;
  notes: string;
}

export interface UseEventFormOptions {
  existingEvent?: CalendarEvent | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export interface UseEventFormReturn {
  formState: EventFormState;
  fieldErrors: Record<string, string>;
  formError: string | null;
  isSubmitting: boolean;
  setField: (field: keyof EventFormState, value: EventFormState[keyof EventFormState]) => void;
  handleSubmit: () => Promise<void>;
  handleCancel: () => void;
  isEditMode: boolean;
}

/**
 * Computes the pre-selected day based on the calendar's active view and navigated date.
 *
 * **Validates: Requirements 9.1–9.6**
 */
const computePreSelectedDay = (activeView: string, currentDate: Date): string => {
  const today = new Date();

  switch (activeView) {
    case 'day': {
      // 9.1: Pre-select the day currently displayed
      return formatDateToISO(currentDate);
    }
    case 'week': {
      // Determine the Monday of the displayed week
      const monday = getMonday(currentDate);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      // 9.2: If current device date falls within displayed week, use today
      if (isDateInRange(today, monday, sunday)) {
        return formatDateToISO(today);
      }
      // 9.3: Otherwise, use Monday of displayed week
      return formatDateToISO(monday);
    }
    case 'month': {
      // Determine the month boundaries
      const firstOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const lastOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      );

      // 9.4: If current device date falls within displayed month, use today
      if (isDateInRange(today, firstOfMonth, lastOfMonth)) {
        return formatDateToISO(today);
      }
      // 9.5: Otherwise, use first day of displayed month
      return formatDateToISO(firstOfMonth);
    }
    case 'year':
    default: {
      // 9.6: Pre-select current device date
      return formatDateToISO(today);
    }
  }
};

/**
 * Returns the Monday of the week containing the given date.
 * Uses ISO 8601 (Monday = first day of week).
 */
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  // getDay() returns 0 for Sunday; shift so Monday = 0
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  return d;
};

/**
 * Checks if a date falls within a range (inclusive, date-only comparison).
 */
const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  const d = stripTime(date).getTime();
  return d >= stripTime(start).getTime() && d <= stripTime(end).getTime();
};

/**
 * Strips time component, returning a date at midnight.
 */
const stripTime = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * Formats a Date to YYYY-MM-DD string.
 */
const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildInitialState = (
  existingEvent: CalendarEvent | null | undefined,
  activeView: string,
  currentDate: Date,
): EventFormState => {
  if (existingEvent) {
    return {
      eventType: existingEvent.eventType,
      eventTypeId: existingEvent.eventTypeId,
      day: existingEvent.day,
      startTime: existingEvent.startTime,
      endTime: existingEvent.endTime,
      notes: existingEvent.notes ?? '',
    };
  }

  return {
    eventType: null,
    eventTypeId: null,
    day: computePreSelectedDay(activeView, currentDate),
    startTime: null,
    endTime: null,
    notes: '',
  };
};

/**
 * Runs all form validation checks and returns field-level and form-level errors.
 * Extracted to reduce cognitive complexity of handleSubmit.
 */
const runValidation = async (
  formState: EventFormState,
  isEditMode: boolean,
  existingEvent: CalendarEvent | null | undefined,
): Promise<{ fieldErrors: Record<string, string>; formError: string | null }> => {
  const fieldErrors: Record<string, string> = {};
  let formError: string | null = null;

  // 1. Validate required fields
  const requiredResult = validateRequiredFields({
    eventType: formState.eventType ?? undefined,
    eventTypeId: formState.eventTypeId ?? undefined,
    day: formState.day || undefined,
    startTime: formState.startTime ?? undefined,
    endTime: formState.endTime ?? undefined,
  });

  if (!requiredResult.isValid) {
    Object.assign(fieldErrors, requiredResult.errors);
  }

  // 2. Validate time range (only if both times are provided)
  if (formState.startTime !== null && formState.endTime !== null) {
    if (!validateTimeRange(formState.startTime, formState.endTime)) {
      fieldErrors.endTime = CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_TIME_AFTER_START;
    }
  }

  // 3. Validate notes length
  if (!validateNotes(formState.notes || null)) {
    fieldErrors.notes = CALENDAR_EVENT_I18N_KEYS.VALIDATION_NOTES_MAX_LENGTH;
  }

  // 4. Check one-shift-per-day constraint (only if no field errors so far)
  if (
    formState.eventType === 'shift' &&
    formState.day &&
    Object.keys(fieldErrors).length === 0
  ) {
    const existingShifts = await calendarEventService.getShiftsForDate(
      formState.day,
      isEditMode ? existingEvent!.id : undefined,
    );

    if (
      !checkOneShiftPerDay(
        formState.day,
        formState.eventType,
        existingShifts,
        isEditMode ? existingEvent!.id : undefined,
      )
    ) {
      formError = CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY;
    }
  }

  return { fieldErrors, formError };
};

export const useEventForm = (options?: UseEventFormOptions): UseEventFormReturn => {
  const { existingEvent, onSuccess, onCancel } = options ?? {};

  const activeView = useCalendarStore((state) => state.activeView);
  const currentDate = useCalendarStore((state) => state.currentDate);

  const isEditMode = !!existingEvent;

  const [formState, setFormState] = useState<EventFormState>(() =>
    buildInitialState(existingEvent, activeView, currentDate),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(
    (field: keyof EventFormState, value: EventFormState[keyof EventFormState]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));

      // Immediately clear the error for this field
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });

      // Clear form-level error when day or eventType changes (relevant to one-shift-per-day)
      if (field === 'day' || field === 'eventType') {
        setFormError(null);
      }
    },
    [],
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    const { fieldErrors: validationErrors, formError: validationFormError } =
      await runValidation(formState, isEditMode, existingEvent);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    if (validationFormError) {
      setFormError(validationFormError);
      return;
    }

    // Clear any stale errors
    setFieldErrors({});
    setFormError(null);

    // Proceed with submission
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await calendarEventService.update(existingEvent!.id, {
          eventType: formState.eventType!,
          eventTypeId: formState.eventTypeId!,
          day: formState.day,
          startTime: formState.startTime!,
          endTime: formState.endTime!,
          notes: formState.notes || null,
        });
      } else {
        await calendarEventService.create({
          eventType: formState.eventType!,
          eventTypeId: formState.eventTypeId!,
          day: formState.day,
          startTime: formState.startTime!,
          endTime: formState.endTime!,
          notes: formState.notes || null,
        });
      }

      // On successful create/update: clear form and call onSuccess
      setFormState({
        eventType: null,
        eventTypeId: null,
        day: computePreSelectedDay(activeView, currentDate),
        startTime: null,
        endTime: null,
        notes: '',
      });

      onSuccess?.();
    } catch (err) {
      console.error('Failed to save calendar event:', err);

      // Handle one-shift-per-day error from the service layer (dual validation)
      if (
        err instanceof Error &&
        err.message === CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY
      ) {
        setFormError(CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY);
      } else if (
        err instanceof Error &&
        err.message === CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_TIME_AFTER_START
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          endTime: CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_TIME_AFTER_START,
        }));
      } else {
        setFormError(CALENDAR_EVENT_I18N_KEYS.ERROR_SAVE_FAILED);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, isEditMode, existingEvent, activeView, currentDate, onSuccess]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  return {
    formState,
    fieldErrors,
    formError,
    isSubmitting,
    setField,
    handleSubmit,
    handleCancel,
    isEditMode,
  };
};
