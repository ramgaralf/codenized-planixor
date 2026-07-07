import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  alertOffsets: number[];
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
  isAlertConfigVisible: boolean;
  setField: (field: keyof EventFormState, value: EventFormState[keyof EventFormState]) => void;
  selectEventType: (eventType: 'shift' | 'reminder', eventTypeId: string) => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleCancel: () => void;
  isEditMode: boolean;
  /** Whether the series action dialog should be shown (edit mode, event has seriesId) */
  showSeriesEditDialog: boolean;
  /** Confirm saving only this event (single update) */
  handleSeriesEditThisEvent: () => Promise<void>;
  /** Confirm saving all future events in series */
  handleSeriesEditAllInSeries: () => Promise<void>;
  /** Cancel the series edit dialog */
  handleSeriesEditCancel: () => void;
}

/**
 * Computes the pre-selected day for the event form.
 * Always uses `currentDate` from the calendar store — this represents the date
 * the user is currently navigated to, regardless of view mode.
 * The `activeView` parameter is kept for API compatibility but is not used.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
const computePreSelectedDay = (_activeView: string, currentDate: Date): string => {
  return formatDateToISO(currentDate);
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
      alertOffsets: existingEvent.alertOffsets ?? [],
    };
  }

  const preSelectedDay = computePreSelectedDay(activeView, currentDate);

  // Default times: rounded to next 30 min → +1 hour
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const defaultStartTime = Math.min(Math.ceil(currentMinutes / 30) * 30, 1410);
  const defaultEndTime = Math.min(defaultStartTime + 60, 1439);

  return {
    eventType: null,
    eventTypeId: null,
    startDay: preSelectedDay,
    endDay: preSelectedDay,
    startTime: defaultStartTime,
    endTime: defaultEndTime,
    totalHours: 0,
    notes: '',
    alertOffsets: [],
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
 * Scrolls to and focuses the first field with a validation error (Req 8.6).
 */
const scrollToFirstError = (errors: Record<string, string>): void => {
  const errorFields = Object.keys(errors);
  if (errorFields.length === 0) return;

  requestAnimationFrame(() => {
    const firstField = errorFields[0] as string | undefined;
    if (!firstField) return;
    const selector = `[name="${firstField}"], [data-field="${firstField}"], #event-${firstField.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  });
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
 * Maps a caught submission error to form-level or field-level error state.
 */
const mapSubmitError = (
  err: unknown,
): { formError: string | null; fieldErrors: Record<string, string> } => {
  if (err instanceof Error && err.message === CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY) {
    return { formError: CALENDAR_EVENT_I18N_KEYS.VALIDATION_ONE_SHIFT_PER_DAY, fieldErrors: {} };
  }
  if (err instanceof Error && err.message === CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER) {
    return { formError: null, fieldErrors: { endTime: CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_TIME_FOR_REMINDER } };
  }
  if (err instanceof Error && err.message === CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_DAY_RANGE) {
    return { formError: null, fieldErrors: { endDay: CALENDAR_EVENT_I18N_KEYS.VALIDATION_INVALID_DAY_RANGE } };
  }
  return { formError: CALENDAR_EVENT_I18N_KEYS.ERROR_SAVE_FAILED, fieldErrors: {} };
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
  const [showSeriesEditDialog, setShowSeriesEditDialog] = useState(false);
  /** Pending changes stored when series dialog is shown */
  const pendingSeriesChangesRef = useRef<Partial<CalendarEvent> | null>(null);

  /**
   * Whether times are read-only (shift selected) or editable (reminder/no selection).
   */
  const isTimeReadOnly = useMemo(
    () => formState.eventType === 'shift',
    [formState.eventType],
  );

  /**
   * Whether the alert configuration field should be visible.
   * Only shows when event start is strictly in the future (start > now).
   *
   * **Validates: Requirements 1.1, 1.3**
   */
  const isAlertConfigVisible = useMemo(() => {
    if (!formState.startDay || formState.startTime === null) return false;
    const parts = formState.startDay.split('-').map(Number);
    const year = parts[0] ?? 0;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const startDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
    startDateTime.setMinutes(formState.startTime);
    return startDateTime.getTime() > Date.now();
  }, [formState.startDay, formState.startTime]);

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
      setFormState((prev) => {
        const updated = { ...prev, [field]: value };
        // Rule: if startDay changes and endDay is before it, auto-set endDay = startDay
        if (field === 'startDay' && typeof value === 'string' && updated.endDay && updated.endDay < value) {
          updated.endDay = value;
        }
        // Rule: if startTime changes and endTime <= new startTime, auto-set endTime = startTime + 30 min
        if (field === 'startTime' && typeof value === 'number' && updated.endTime !== null && updated.endTime <= value) {
          updated.endTime = Math.min(value + 30, 1439);
        }
        return updated;
      });

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
        // Reminder selected: times are editable, rounded to next 30 min → +1 hour
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const suggestedStart = Math.min(Math.ceil(currentMinutes / 30) * 30, 1410);
        const suggestedEnd = Math.min(suggestedStart + 60, 1439);

        setFormState((prev) => ({
          ...prev,
          eventType,
          eventTypeId,
          startTime: suggestedStart,
          endTime: suggestedEnd,
          totalHours: computeTotalHours('reminder', prev.startDay, prev.endDay, suggestedStart, suggestedEnd),
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
      scrollToFirstError(validationErrors);
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
      const changes: Partial<CalendarEvent> = {
        eventType: formState.eventType!,
        eventTypeId: formState.eventTypeId!,
        startDay: formState.startDay,
        endDay: formState.endDay,
        startTime: formState.startTime!,
        endTime: formState.endTime!,
        notes: formState.notes || null,
        alertOffsets: isAlertConfigVisible ? formState.alertOffsets : [],
      };

      if (isEditMode) {
        // If the event has a seriesId, show series action dialog
        if (existingEvent?.seriesId) {
          pendingSeriesChangesRef.current = changes;
          setShowSeriesEditDialog(true);
          setIsSubmitting(false);
          return;
        }
        await calendarEventService.update(existingEvent!.id, changes);
      } else {
        await calendarEventService.create({
          eventType: formState.eventType!,
          eventTypeId: formState.eventTypeId!,
          startDay: formState.startDay,
          endDay: formState.endDay,
          startTime: formState.startTime!,
          endTime: formState.endTime!,
          notes: formState.notes || null,
          alertOffsets: isAlertConfigVisible ? formState.alertOffsets : [],
          seriesId: null,
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
        alertOffsets: [],
      });

      onSuccess?.();
    } catch (err) {
      console.error('Failed to save calendar event:', err);

      const mapped = mapSubmitError(err);
      if (mapped.formError) {
        setFormError(mapped.formError);
      }
      if (Object.keys(mapped.fieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...mapped.fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, isEditMode, existingEvent, activeView, currentDate, onSuccess, isAlertConfigVisible]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  /**
   * Series edit dialog: user chose "Only this event" — perform a normal single update.
   */
  const handleSeriesEditThisEvent = useCallback(async (): Promise<void> => {
    const changes = pendingSeriesChangesRef.current;
    if (!changes || !existingEvent) return;

    setShowSeriesEditDialog(false);
    setIsSubmitting(true);
    try {
      await calendarEventService.update(existingEvent.id, changes);
      pendingSeriesChangesRef.current = null;

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
        alertOffsets: [],
      });

      onSuccess?.();
    } catch (err) {
      console.error('Failed to save calendar event:', err);
      const mapped = mapSubmitError(err);
      if (mapped.formError) setFormError(mapped.formError);
      if (Object.keys(mapped.fieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...mapped.fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [existingEvent, activeView, currentDate, onSuccess]);

  /**
   * Series edit dialog: user chose "All future events in series" — update the whole series.
   */
  const handleSeriesEditAllInSeries = useCallback(async (): Promise<void> => {
    const changes = pendingSeriesChangesRef.current;
    if (!changes || !existingEvent) return;

    setShowSeriesEditDialog(false);
    setIsSubmitting(true);
    try {
      await calendarEventService.updateSeries(existingEvent.id, changes);
      pendingSeriesChangesRef.current = null;

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
        alertOffsets: [],
      });

      onSuccess?.();
    } catch (err) {
      console.error('Failed to update series events:', err);
      const mapped = mapSubmitError(err);
      if (mapped.formError) setFormError(mapped.formError);
      if (Object.keys(mapped.fieldErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...mapped.fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [existingEvent, activeView, currentDate, onSuccess]);

  /**
   * Series edit dialog: user cancelled.
   */
  const handleSeriesEditCancel = useCallback(() => {
    setShowSeriesEditDialog(false);
    pendingSeriesChangesRef.current = null;
  }, []);

  return {
    formState,
    fieldErrors,
    formError,
    isSubmitting,
    isTimeReadOnly,
    isAlertConfigVisible,
    setField,
    selectEventType,
    handleSubmit,
    handleCancel,
    isEditMode,
    showSeriesEditDialog,
    handleSeriesEditThisEvent,
    handleSeriesEditAllInSeries,
    handleSeriesEditCancel,
  };
};
