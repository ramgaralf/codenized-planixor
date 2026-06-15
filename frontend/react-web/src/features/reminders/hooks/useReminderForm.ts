import { useCallback, useEffect, useRef, useState } from 'react';

import * as reminderService from '@features/reminders/services/reminderService';
import {
  validateReminder,
  type ReminderValidationErrors,
} from '@features/reminders/services/reminderValidation';

const DEBOUNCE_MS = 1000;

export interface UseReminderFormOptions {
  initialValues?: { name: string; icon: string; backgroundColor: string };
  reminderId?: string;
  onSuccess: () => void;
}

export interface UseReminderFormReturn {
  name: string;
  icon: string;
  backgroundColor: string;
  errors: ReminderValidationErrors;
  isValid: boolean;
  isSaving: boolean;
  saveError: string | null;
  setName: (value: string) => void;
  setIcon: (value: string) => void;
  setBackgroundColor: (value: string) => void;
  handleSubmit: () => Promise<void>;
}

export const useReminderForm = (options: UseReminderFormOptions): UseReminderFormReturn => {
  const { initialValues, reminderId, onSuccess } = options;

  const [name, setNameState] = useState(initialValues?.name ?? '');
  const [icon, setIconState] = useState(initialValues?.icon ?? '');
  const [backgroundColor, setBackgroundColorState] = useState(
    initialValues?.backgroundColor ?? '',
  );
  const [errors, setErrors] = useState<ReminderValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Pre-populate for edit mode when initialValues change
  useEffect(() => {
    if (initialValues) {
      setNameState(initialValues.name);
      setIconState(initialValues.icon);
      setBackgroundColorState(initialValues.backgroundColor);
    }
  }, [initialValues]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const validateField = useCallback(
    (field: keyof ReminderValidationErrors, currentValues: { name: string; icon: string; backgroundColor: string }) => {
      const result = validateReminder(currentValues);

      if (result.isValid) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      } else {
        const fieldError = result.errors[field];
        setErrors((prev) => {
          if (fieldError) {
            return { ...prev, [field]: fieldError };
          }
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [],
  );

  const scheduleValidation = useCallback(
    (field: keyof ReminderValidationErrors, currentValues: { name: string; icon: string; backgroundColor: string }) => {
      const existing = debounceTimersRef.current.get(field);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(() => {
        validateField(field, currentValues);
        debounceTimersRef.current.delete(field);
      }, DEBOUNCE_MS);

      debounceTimersRef.current.set(field, timer);
    },
    [validateField],
  );

  const setName = useCallback(
    (value: string) => {
      setNameState(value);
      setSaveError(null);
      const currentValues = { name: value, icon, backgroundColor };
      scheduleValidation('name', currentValues);
    },
    [icon, backgroundColor, scheduleValidation],
  );

  const setIcon = useCallback(
    (value: string) => {
      setIconState(value);
      setSaveError(null);
      const currentValues = { name, icon: value, backgroundColor };
      scheduleValidation('icon', currentValues);
    },
    [name, backgroundColor, scheduleValidation],
  );

  const setBackgroundColor = useCallback(
    (value: string) => {
      setBackgroundColorState(value);
      setSaveError(null);
      const currentValues = { name, icon, backgroundColor: value };
      scheduleValidation('backgroundColor', currentValues);
    },
    [name, icon, scheduleValidation],
  );

  const handleSubmit = useCallback(async () => {
    const currentValues = { name, icon, backgroundColor };
    const result = validateReminder(currentValues);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (reminderId) {
        const existing = await reminderService.getById(reminderId);
        if (!existing || existing.isDeleted) {
          onSuccess();
          return;
        }
        await reminderService.update(reminderId, currentValues);
      } else {
        await reminderService.create(currentValues);
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save reminder:', err);
      setSaveError('reminder.error.saveFailed');
    } finally {
      setIsSaving(false);
    }
  }, [name, icon, backgroundColor, reminderId, onSuccess]);

  const isValid =
    name.trim().length > 0 &&
    icon.length > 0 &&
    backgroundColor.length > 0 &&
    Object.keys(errors).length === 0;

  return {
    name,
    icon,
    backgroundColor,
    errors,
    isValid,
    isSaving,
    saveError,
    setName,
    setIcon,
    setBackgroundColor,
    handleSubmit,
  };
};
