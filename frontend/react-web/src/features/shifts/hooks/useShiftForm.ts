import { useCallback, useEffect, useRef, useState } from 'react';

import { calculateHoursWorked } from '@features/shifts/services/hoursWorkedCalculation';
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
}

export const useShiftForm = (options?: UseShiftFormOptions): UseShiftFormReturn => {
  const { shiftId } = options ?? {};

  const [fields, setFields] = useState<ShiftFormFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<ShiftValidationErrors>({});
  const [isLoading, setIsLoading] = useState(!!shiftId);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return { fields, errors, setField, submit, isLoading, isSubmitting };
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
