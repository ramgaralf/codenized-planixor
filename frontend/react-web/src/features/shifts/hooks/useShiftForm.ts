import { useCallback, useEffect, useRef, useState } from 'react';

import { calculateHoursWorked } from '@features/shifts/services/hoursWorkedCalculation';
import { checkShiftPropagationNeeded, propagateShiftChanges } from '@features/shifts/services/shiftPropagation';
import * as shiftService from '@features/shifts/services/shiftService';
import {
  validateShift,
  type ShiftFormInput,
  type ShiftValidationErrors,
} from '@features/shifts/services/shiftValidation';

export interface ShiftFormFields {
  name: string;
  icon: string;
  backgroundColor: string;
  startTime: number | null;
  endTime: number | null;
  hoursWorked: number | null;
}

type ShiftFormFieldKey = keyof ShiftFormFields;

const INITIAL_FIELDS: ShiftFormFields = {
  name: '',
  icon: '',
  backgroundColor: '',
  startTime: null,
  endTime: null,
  hoursWorked: null,
};

const DEBOUNCE_MS = 1000;

interface UseShiftFormOptions {
  shiftId?: string;
}

export interface UseShiftFormReturn {
  fields: ShiftFormFields;
  errors: ShiftValidationErrors;
  setField: <K extends ShiftFormFieldKey>(field: K, value: ShiftFormFields[K]) => void;
  submit: () => Promise<boolean>;
  isLoading: boolean;
  isSubmitting: boolean;
  propagationState: { isOpen: boolean; affectedCount: number; shiftData: { startTime: number; endTime: number; hoursWorked: number } | null };
  confirmPropagation: () => Promise<void>;
  declinePropagation: () => void;
}

export const useShiftForm = (options?: UseShiftFormOptions): UseShiftFormReturn => {
  const { shiftId } = options ?? {};

  const [fields, setFields] = useState<ShiftFormFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<ShiftValidationErrors>({});
  const [isLoading, setIsLoading] = useState(!!shiftId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [propagationState, setPropagationState] = useState<{
    isOpen: boolean;
    affectedCount: number;
    shiftData: { startTime: number; endTime: number; hoursWorked: number } | null;
  }>({ isOpen: false, affectedCount: 0, shiftData: null });

  const manualOverrideRef = useRef(false);
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Load existing shift in edit mode
  useEffect(() => {
    if (!shiftId) return;

    let cancelled = false;

    const loadShift = async () => {
      setIsLoading(true);
      try {
        const shift = await shiftService.getById(shiftId);
        if (cancelled || !shift) return;

        setFields({
          name: shift.name,
          icon: shift.icon,
          backgroundColor: shift.backgroundColor,
          startTime: shift.startTime,
          endTime: shift.endTime,
          hoursWorked: shift.hoursWorked,
        });
      } catch (err) {
        console.error('Failed to load shift:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadShift();

    return () => {
      cancelled = true;
    };
  }, [shiftId]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const validateField = useCallback((field: ShiftFormFieldKey, currentFields: ShiftFormFields) => {
    const input = buildValidationInput(currentFields);
    const result = validateShift(input);

    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof ShiftValidationErrors];
        return next;
      });
    } else {
      const fieldError = result.errors[field as keyof ShiftValidationErrors];
      setErrors((prev) => {
        if (fieldError) {
          return { ...prev, [field]: fieldError };
        }
        const next = { ...prev };
        delete next[field as keyof ShiftValidationErrors];
        return next;
      });
    }
  }, []);

  const scheduleValidation = useCallback(
    (field: ShiftFormFieldKey, currentFields: ShiftFormFields) => {
      const existing = debounceTimersRef.current.get(field);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(() => {
        validateField(field, currentFields);
        debounceTimersRef.current.delete(field);
      }, DEBOUNCE_MS);

      debounceTimersRef.current.set(field, timer);
    },
    [validateField],
  );

  const setField = useCallback(
    <K extends ShiftFormFieldKey>(field: K, value: ShiftFormFields[K]) => {
      // Clear field error immediately on input change (Req 8.5)
      setErrors((prev) => {
        if (!prev[field as keyof ShiftValidationErrors]) return prev;
        const next = { ...prev };
        delete next[field as keyof ShiftValidationErrors];
        return next;
      });

      setFields((prev) => {
        const next = { ...prev, [field]: value };

        if (field === 'hoursWorked') {
          // Manual override of hoursWorked — stop auto-calculating
          manualOverrideRef.current = true;
          scheduleValidation(field, next);
          return next;
        }

        if (field === 'startTime' || field === 'endTime') {
          // Time field changed — reset manual override and recalculate
          manualOverrideRef.current = false;

          const startTime = field === 'startTime' ? (value as number | null) : prev.startTime;
          const endTime = field === 'endTime' ? (value as number | null) : prev.endTime;

          if (startTime !== null && endTime !== null) {
            next.hoursWorked = calculateHoursWorked(startTime, endTime);
          } else {
            // If either time is cleared, clear hoursWorked
            next.hoursWorked = null;
          }

          scheduleValidation(field, next);
          if (next.hoursWorked !== prev.hoursWorked) {
            scheduleValidation('hoursWorked', next);
          }
          return next;
        }

        scheduleValidation(field, next);
        return next;
      });
    },
    [scheduleValidation],
  );

  const submit = useCallback(async (): Promise<boolean> => {
    const input = buildValidationInput(fields);
    const result = validateShift(input);

    if (!result.success) {
      setErrors(result.errors);

      // Scroll to and focus the first error field (Req 8.6)
      const errorFields = Object.keys(result.errors) as (keyof ShiftValidationErrors)[];
      if (errorFields.length > 0) {
        requestAnimationFrame(() => {
          const firstField = errorFields[0];
          const selector = `[name="${String(firstField)}"], [data-field="${String(firstField)}"], #shift-${String(firstField).replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          const element = document.querySelector<HTMLElement>(selector);
          if (element) {
            element.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            element.focus();
          }
        });
      }
      return false;
    }

    setIsSubmitting(true);
    try {
      if (shiftId) {
        await shiftService.update(shiftId, {
          name: result.data.name,
          icon: result.data.icon,
          backgroundColor: result.data.backgroundColor,
          startTime: result.data.startTime,
          endTime: result.data.endTime,
          hoursWorked: result.data.hoursWorked,
        });

        const count = await checkShiftPropagationNeeded(shiftId);
        if (count > 0) {
          setPropagationState({
            isOpen: true,
            affectedCount: count,
            shiftData: {
              startTime: result.data.startTime,
              endTime: result.data.endTime,
              hoursWorked: result.data.hoursWorked,
            },
          });
        }
      } else {
        await shiftService.create({
          name: result.data.name,
          icon: result.data.icon,
          backgroundColor: result.data.backgroundColor,
          startTime: result.data.startTime,
          endTime: result.data.endTime,
          hoursWorked: result.data.hoursWorked,
        });
      }
      return true;
    } catch (err) {
      console.error('Failed to save shift:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [fields, shiftId]);

  const confirmPropagation = useCallback(async (): Promise<void> => {
    if (!shiftId || !propagationState.shiftData) return;

    await propagateShiftChanges(
      shiftId,
      propagationState.shiftData.startTime,
      propagationState.shiftData.endTime,
      propagationState.shiftData.hoursWorked,
    );

    setPropagationState({ isOpen: false, affectedCount: 0, shiftData: null });
  }, [shiftId, propagationState.shiftData]);

  const declinePropagation = useCallback((): void => {
    setPropagationState({ isOpen: false, affectedCount: 0, shiftData: null });
  }, []);

  return { fields, errors, setField, submit, isLoading, isSubmitting, propagationState, confirmPropagation, declinePropagation };
};

/**
 * Builds a ShiftFormInput from current fields, substituting defaults for null values
 * to satisfy the Zod schema's type requirements during validation.
 */
const buildValidationInput = (fields: ShiftFormFields): ShiftFormInput => {
  return {
    name: fields.name,
    icon: fields.icon,
    backgroundColor: fields.backgroundColor,
    startTime: fields.startTime ?? -1,
    endTime: fields.endTime ?? -1,
    hoursWorked: fields.hoursWorked ?? -1,
  };
};
