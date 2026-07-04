import { useCallback, useEffect, useRef, useState } from 'react';

import * as reminderService from '@features/reminders/services/reminderService';
import {
  checkReminderPropagationNeeded,
  propagateReminderChanges,
} from '@features/reminders/services/reminderPropagation';
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
  propagationState: { isOpen: boolean; affectedCount: number };
  confirmPropagation: () => Promise<void>;
  declinePropagation: () => void;
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
  const [propagationState, setPropagationState] = useState<{
    isOpen: boolean;
    affectedCount: number;
  }>({ isOpen: false, affectedCount: 0 });

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
      // Clear field error immediately on input change (Req 8.5)
      setErrors((prev) => {
        if (!prev.name) return prev;
        const next = { ...prev };
        delete next.name;
        return next;
      });
      const currentValues = { name: value, icon, backgroundColor };
      scheduleValidation('name', currentValues);
    },
    [icon, backgroundColor, scheduleValidation],
  );

  const setIcon = useCallback(
    (value: string) => {
      setIconState(value);
      setSaveError(null);
      // Clear field error immediately on input change (Req 8.5)
      setErrors((prev) => {
        if (!prev.icon) return prev;
        const next = { ...prev };
        delete next.icon;
        return next;
      });
      const currentValues = { name, icon: value, backgroundColor };
      scheduleValidation('icon', currentValues);
    },
    [name, backgroundColor, scheduleValidation],
  );

  const setBackgroundColor = useCallback(
    (value: string) => {
      setBackgroundColorState(value);
      setSaveError(null);
      // Clear field error immediately on input change (Req 8.5)
      setErrors((prev) => {
        if (!prev.backgroundColor) return prev;
        const next = { ...prev };
        delete next.backgroundColor;
        return next;
      });
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

      // Scroll to and focus the first error field (Req 8.6)
      const errorFields = Object.keys(result.errors) as (keyof ReminderValidationErrors)[];
      if (errorFields.length > 0) {
        requestAnimationFrame(() => {
          const firstField = errorFields[0];
          const selector = `[name="${String(firstField)}"], [data-field="${String(firstField)}"], #reminder-${String(firstField).replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          const element = document.querySelector<HTMLElement>(selector);
          if (element) {
            element.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            element.focus();
          }
        });
      }
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

        const count = await checkReminderPropagationNeeded(reminderId);
        if (count > 0) {
          setPropagationState({ isOpen: true, affectedCount: count });
        } else {
          onSuccess();
        }
      } else {
        await reminderService.create(currentValues);
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to save reminder:', err);
      setSaveError('reminder.error.saveFailed');
    } finally {
      setIsSaving(false);
    }
  }, [name, icon, backgroundColor, reminderId, onSuccess]);

  const confirmPropagation = useCallback(async () => {
    await propagateReminderChanges(reminderId!);
    setPropagationState({ isOpen: false, affectedCount: 0 });
    onSuccess();
  }, [reminderId, onSuccess]);

  const declinePropagation = useCallback(() => {
    setPropagationState({ isOpen: false, affectedCount: 0 });
    onSuccess();
  }, [onSuccess]);

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
    propagationState,
    confirmPropagation,
    declinePropagation,
  };
};
