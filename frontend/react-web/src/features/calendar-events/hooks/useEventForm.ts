import { useCallback, useEffect, useMemo, useState } from 'react';

import { db } from '@/data/db';
import { useCalendarStore } from '@/stores/calendarStore';

import { CALENDAR_EVENT_I18N_KEYS } from '../constants';
import type { CalendarEvent } from '../models';
import * as calendarEventService from '../services/calendarEventService';
import {
  checkOneShiftPerDay,
  computeEndDayForShift,
  computeTotalHours,
  validateDayRange,
  validateNotes,
  validateRequiredFields,
  validateTimeForReminder,
} from '../validation';

export interface EventFormState {
  eventType: 'shift' | 'reminder' | null;
  eventTypeId: string | null;
  startDay: string;
  endDay: string;
  startTime: number | null;
  endTime: number | null;
  totalHours: number;
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
  isTimeReadOnly: boolean;
  setField: (field: keyof EventFormState, value: EventFormState[keyof EventFormState]) => void;
  selectEventType: (eventType: 'shift' | 'reminder', eventTypeId: string) => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleCancel: () => void;
  isEditMode: boolean;
}

/**
 * Computes the pre-selected day based on the calendar's active view and navigated date.
 *
 * **Validates: Requirements 9.1–9.7**
 */
const computePreSelectedDay = (activeView: string, currentDate: Date): string => {
  const today = new Date();

  switch (activeView) {
    case 'day': {
      // 9.1: Pre-select the day currently displayed
      return formatDateToISO(currentDate);
    }
    case 'week': {
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
    case 'year': {
      const firstOfYear = new Date(currentDate.getFullYear(), 0, 1);
      const lastOfYear = new Date(currentDate.getFullYear(), 11, 31);

      // 9.6: If current device date falls within displayed year, use today
      if (isDateInRange(today, firstOfYear, lastOfYear)) {
        return formatDateToISO(today);
      }
      // 9.7: Otherwise, use January 1st of displayed year
      return formatDateToISO(firstOfYear);
    }
    default: {
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
      startDay: existingEvent.startDay,
      endDay: existingEvent.endDay,
      startTime: existingEvent.startTime,
      endTime: existingEvent.endTime,
      totalHours: existingEvent.totalHours,
      notes: existingEvent.notes ?? '',
    };
  }

  const preSelectedDay = computePreSelectedDay(activeView, currentDate);

  return {
    eventType: null,
    eventTypeId: null,
    startDay: preSelectedDay,
    endDay: preSelectedDay,
    startTime: null,
    endTime: null,
    totalHours: 0,
    notes: '',
  };
};

/**
 * Validates reminder time constraints.
 */
const validateReminderTime = (formState: EventFormState): string | null => {
  if (formState.eventType !== 'reminder') return null;
  if (formState.startTime === null || formState.endTime === null) return null;
  if (!formState.startDay || !formState.endDay) return null;
  if (!validateTimeForReminder(formState.startDay, formState.endDay, formState.startTime, formState.endTime)) {
    return CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER;
  }
  return null;
};

/**
 * Checks the one-shift-per-day constraint asynchronously.
 */
const checkShiftConstraint = async (
  formState: EventFormState,
  isEditMode: boolean,
  existingEvent: CalendarEvent | null | undefined,
): Promise<string | null> => {
  if (formState.eventType !== 'shift' || !formState.startDay) return null;
  const existingShifts = await calendarEventService.getShiftsForDate(
    formState.startDay,
    isEditMode ? existingEvent!.id : undefined,
  );
  if (!checkOneShiftPerDay(formState.startDay, formState.eventType, existingShifts, isEditMode ? existingEvent!.id : undefined)) {
    return CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY;
  }
  return null;
};

/**
 * Runs all form validation checks and returns field-level and form-level errors.
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
    startDay: formState.startDay || undefined,
    endDay: formState.endDay || undefined,
    startTime: formState.startTime ?? undefined,
    endTime: formState.endTime ?? undefined,
    totalHours: formState.totalHours,
  });

  if (!requiredResult.isValid) {
    Object.assign(fieldErrors, requiredResult.errors);
  }

  // 2. Validate day range: endDay >= startDay
  if (formState.startDay && formState.endDay && !validateDayRange(formState.startDay, formState.endDay)) {
    fieldErrors.endDay = CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_DAY_RANGE;
  }

  // 3. Validate time for reminders
  const timeError = validateReminderTime(formState);
  if (timeError) {
    fieldErrors.endTime = timeError;
  }

  // 4. Validate notes length
  if (!validateNotes(formState.notes || null)) {
    fieldErrors.notes = CALENDAR_EVENT_I18N_KEYS.VALIDATION_NOTES_MAX_LENGTH;
  }

  // 5. Check one-shift-per-day constraint (only if no field errors yet)
  if (Object.keys(fieldErrors).length === 0) {
    formError = await checkShiftConstraint(formState, isEditMode, existingEvent);
  }

  return { fieldErrors, formError };
};


/**
 * Hook for managing the calendar event form state, validation, and submission.
 *
 * Manages: startDay, endDay, startTime, endTime, totalHours (computed),
 * eventType, eventTypeId, and notes.
 *
 * When a **shift** is selected: startTime/endTime are auto-populated from the
 * shift definition as read-only; totalHours = shift's hoursWorked; endDay is
 * auto-computed via computeEndDayForShift() if crossing midnight.
 *
 * When a **reminder** is selected: startTime/endTime are editable via timepickers;
 * totalHours is recalculated on every time/day change via computeTotalHours().
 *
 * **Validates: Requirements 1.2, 1.5, 1.6, 1.10, 1.11, 9.1–9.7**
 */
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

  /**
   * Whether times are read-only (shift selected) or editable (reminder/no selection).
   */
  const isTimeReadOnly = useMemo(
    () => formState.eventType === 'shift',
    [formState.eventType],
  );

  /**
   * Recalculate totalHours for reminders whenever time/day fields change.
   */
  useEffect(() => {
    if (formState.eventType !== 'reminder') return;
    if (formState.startTime === null || formState.endTime === null) return;
    if (!formState.startDay || !formState.endDay) return;

    const newTotalHours = computeTotalHours(
      'reminder',
      formState.startDay,
      formState.endDay,
      formState.startTime,
      formState.endTime,
    );

    setFormState((prev) => {
      if (prev.totalHours === newTotalHours) return prev;
      return { ...prev, totalHours: newTotalHours };
    });
  }, [formState.eventType, formState.startDay, formState.endDay, formState.startTime, formState.endTime]);

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

      // Clear form-level error when startDay or eventType changes (relevant to one-shift-per-day)
      if (field === 'startDay' || field === 'eventType') {
        setFormError(null);
      }
    },
    [],
  );

  /**
   * Handles event type selection from the Event_Type_Selector.
   * Looks up the shift/reminder definition from Dexie and auto-populates fields.
   *
   * For shifts: sets startTime, endTime (read-only), totalHours from hoursWorked,
   * and computes endDay via computeEndDayForShift() (crossing midnight).
   *
   * For reminders: clears times (user editable), resets totalHours.
   */
  const selectEventType = useCallback(
    async (eventType: 'shift' | 'reminder', eventTypeId: string): Promise<void> => {
      if (eventType === 'shift') {
        const shift = await db.shifts.get(eventTypeId);

        if (shift) {
          const endDay = computeEndDayForShift(
            formState.startDay,
            shift.startTime,
            shift.endTime,
          );

          setFormState((prev) => ({
            ...prev,
            eventType,
            eventTypeId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            totalHours: shift.hoursWorked,
            endDay,
          }));
        } else {
          // Shift not found — set type but leave times as-is
          setFormState((prev) => ({
            ...prev,
            eventType,
            eventTypeId,
          }));
        }
      } else {
        // Reminder selected: times are editable, reset totalHours until user fills times
        setFormState((prev) => ({
          ...prev,
          eventType,
          eventTypeId,
          startTime: prev.startTime,
          endTime: prev.endTime,
          totalHours: prev.startTime !== null && prev.endTime !== null
            ? computeTotalHours('reminder', prev.startDay, prev.endDay, prev.startTime, prev.endTime)
            : 0,
        }));
      }

      // Clear relevant errors
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.eventType;
        delete next.eventTypeId;
        delete next.startTime;
        delete next.endTime;
        delete next.endDay;
        return next;
      });
      setFormError(null);
    },
    [formState.startDay],
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
          startDay: formState.startDay,
          endDay: formState.endDay,
          startTime: formState.startTime!,
          endTime: formState.endTime!,
          notes: formState.notes || null,
        });
      } else {
        await calendarEventService.create({
          eventType: formState.eventType!,
          eventTypeId: formState.eventTypeId!,
          startDay: formState.startDay,
          endDay: formState.endDay,
          startTime: formState.startTime!,
          endTime: formState.endTime!,
          notes: formState.notes || null,
        });
      }

      // On successful create/update: clear form and call onSuccess
      const preSelectedDay = computePreSelectedDay(activeView, currentDate);
      setFormState({
        eventType: null,
        eventTypeId: null,
        startDay: preSelectedDay,
        endDay: preSelectedDay,
        startTime: null,
        endTime: null,
        totalHours: 0,
        notes: '',
      });

      onSuccess?.();
    } catch (err) {
      console.error('Failed to save calendar event:', err);

      if (
        err instanceof Error &&
        err.message === CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY
      ) {
        setFormError(CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY);
      } else if (
        err instanceof Error &&
        err.message === CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          endTime: CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER,
        }));
      } else if (
        err instanceof Error &&
        err.message === CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_DAY_RANGE
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          endDay: CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_DAY_RANGE,
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
    isTimeReadOnly,
    setField,
    selectEventType,
    handleSubmit,
    handleCancel,
    isEditMode,
  };
};
