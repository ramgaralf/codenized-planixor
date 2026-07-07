import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as reminderService from '@features/reminders/services/reminderService';
import {
  checkReminderPropagationNeeded,
  propagateReminderChanges,
} from '@features/reminders/services/reminderPropagation';
import {
  checkSeriesPropagationNeeded,
  propagateNeverToRepeating,
  propagateRepeatingToNever,
  propagateRepeatingToRepeating,
} from '@features/reminders/services/seriesPropagation';
import {
  validateReminder,
  type ReminderValidationErrors,
} from '@features/reminders/services/reminderValidation';

import type { SeriesFrequency } from '@features/reminders/services/reminderValidation';

const DEBOUNCE_MS = 1000;

/**
 * Computes the default end date for a given frequency.
 * Weekly → current date + 1 year
 * Monthly → current date + 5 years
 * Yearly → current date + 50 years
 */
const computeDefaultEndDate = (frequency: SeriesFrequency): string | null => {
  if (frequency === 'never') return null;
  const now = new Date();
  let years = 1;
  if (frequency === 'monthly') years = 5;
  if (frequency === 'yearly') years = 50;
  const target = new Date(now.getFullYear() + years, now.getMonth(), now.getDate());
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export interface UseReminderFormOptions {
  initialValues?: { name: string; icon: string; backgroundColor: string; seriesFrequency?: SeriesFrequency; seriesEndDate?: string | null };
  reminderId?: string;
  onSuccess: () => void;
}

export interface SeriesPropagationState {
  isOpen: boolean;
  previousFrequency: SeriesFrequency;
  newFrequency: SeriesFrequency;
  affectedCount: number;
}

export interface UseReminderFormReturn {
  name: string;
  icon: string;
  backgroundColor: string;
  seriesFrequency: SeriesFrequency;
  seriesEndDate: string | null;
  errors: ReminderValidationErrors;
  isValid: boolean;
  isSaving: boolean;
  saveError: string | null;
  hasFrequencyChanged: boolean;
  setName: (value: string) => void;
  setIcon: (value: string) => void;
  setBackgroundColor: (value: string) => void;
  setSeriesFrequency: (value: SeriesFrequency) => void;
  setSeriesEndDate: (value: string | null) => void;
  handleSubmit: () => Promise<void>;
  propagationState: { isOpen: boolean; affectedCount: number };
  confirmPropagation: () => Promise<void>;
  declinePropagation: () => void;
  seriesPropagationState: SeriesPropagationState;
  confirmSeriesPropagation: () => Promise<void>;
  declineSeriesPropagation: () => void;
}

export const useReminderForm = (options: UseReminderFormOptions): UseReminderFormReturn => {
  const { initialValues, reminderId, onSuccess } = options;

  const [name, setNameState] = useState(initialValues?.name ?? '');
  const [icon, setIconState] = useState(initialValues?.icon ?? '');
  const [backgroundColor, setBackgroundColorState] = useState(
    initialValues?.backgroundColor ?? '',
  );
  const [seriesFrequency, setSeriesFrequencyState] = useState<SeriesFrequency>(
    initialValues?.seriesFrequency ?? 'never',
  );
  const [seriesEndDate, setSeriesEndDateState] = useState<string | null>(
    initialValues?.seriesEndDate ?? null,
  );
  const [errors, setErrors] = useState<ReminderValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [propagationState, setPropagationState] = useState<{
    isOpen: boolean;
    affectedCount: number;
  }>({ isOpen: false, affectedCount: 0 });
  const [seriesPropagationState, setSeriesPropagationState] = useState<SeriesPropagationState>({
    isOpen: false,
    previousFrequency: 'never',
    newFrequency: 'never',
    affectedCount: 0,
  });

  // Track original frequency for change detection (used by propagation logic)
  const originalFrequencyRef = useRef<SeriesFrequency>(
    initialValues?.seriesFrequency ?? 'never',
  );

  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Pre-populate for edit mode when initialValues change
  useEffect(() => {
    if (initialValues) {
      setNameState(initialValues.name);
      setIconState(initialValues.icon);
      setBackgroundColorState(initialValues.backgroundColor);
      setSeriesFrequencyState(initialValues.seriesFrequency ?? 'never');
      setSeriesEndDateState(initialValues.seriesEndDate ?? null);
      originalFrequencyRef.current = initialValues.seriesFrequency ?? 'never';
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
    (field: keyof ReminderValidationErrors, currentValues: { name: string; icon: string; backgroundColor: string; seriesFrequency: string }) => {
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
    (field: keyof ReminderValidationErrors, currentValues: { name: string; icon: string; backgroundColor: string; seriesFrequency: string }) => {
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
      const currentValues = { name: value, icon, backgroundColor, seriesFrequency };
      scheduleValidation('name', currentValues);
    },
    [icon, backgroundColor, seriesFrequency, scheduleValidation],
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
      const currentValues = { name, icon: value, backgroundColor, seriesFrequency };
      scheduleValidation('icon', currentValues);
    },
    [name, backgroundColor, seriesFrequency, scheduleValidation],
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
      const currentValues = { name, icon, backgroundColor: value, seriesFrequency };
      scheduleValidation('backgroundColor', currentValues);
    },
    [name, icon, seriesFrequency, scheduleValidation],
  );

  const setSeriesFrequency = useCallback(
    (value: SeriesFrequency) => {
      setSeriesFrequencyState(value);
      setSaveError(null);
      // Compute default end date when frequency changes
      const defaultEndDate = computeDefaultEndDate(value);
      setSeriesEndDateState(defaultEndDate);
      // Clear field error immediately on input change
      setErrors((prev) => {
        if (!prev.seriesFrequency) return prev;
        const next = { ...prev };
        delete next.seriesFrequency;
        return next;
      });
      const currentValues = { name, icon, backgroundColor, seriesFrequency: value };
      scheduleValidation('seriesFrequency', currentValues);
    },
    [name, icon, backgroundColor, scheduleValidation],
  );

  const setSeriesEndDate = useCallback(
    (value: string | null) => {
      setSeriesEndDateState(value);
      setSaveError(null);
      setErrors((prev) => {
        if (!prev.seriesEndDate) return prev;
        const next = { ...prev };
        delete next.seriesEndDate;
        return next;
      });
    },
    [],
  );

  const handlePostSavePropagation = useCallback(async (id: string) => {
    const frequencyChanged = seriesFrequency !== originalFrequencyRef.current;

    if (frequencyChanged) {
      // Series frequency change takes priority (Req 3.8, 3.9)
      const count = await checkSeriesPropagationNeeded(id);
      if (count > 0) {
        setSeriesPropagationState({
          isOpen: true,
          previousFrequency: originalFrequencyRef.current,
          newFrequency: seriesFrequency,
          affectedCount: count,
        });
      } else {
        // No events in current year → save directly (Req 3.7)
        onSuccess();
      }
    } else {
      // No frequency change → fall back to existing display-field propagation
      const count = await checkReminderPropagationNeeded(id);
      if (count > 0) {
        setPropagationState({ isOpen: true, affectedCount: count });
      } else {
        onSuccess();
      }
    }
  }, [seriesFrequency, onSuccess]);

  const handleSubmit = useCallback(async () => {
    const currentValues = { name, icon, backgroundColor, seriesFrequency, seriesEndDate };
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
        await handlePostSavePropagation(reminderId);
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
  }, [name, icon, backgroundColor, seriesFrequency, seriesEndDate, reminderId, onSuccess, handlePostSavePropagation]);

  const confirmPropagation = useCallback(async () => {
    await propagateReminderChanges(reminderId!);
    setPropagationState({ isOpen: false, affectedCount: 0 });
    onSuccess();
  }, [reminderId, onSuccess]);

  const declinePropagation = useCallback(() => {
    setPropagationState({ isOpen: false, affectedCount: 0 });
    onSuccess();
  }, [onSuccess]);

  const confirmSeriesPropagation = useCallback(async () => {
    const { previousFrequency, newFrequency } = seriesPropagationState;

    if (previousFrequency === 'never' && newFrequency !== 'never') {
      await propagateNeverToRepeating(reminderId!, newFrequency as 'weekly' | 'monthly' | 'yearly');
    } else if (previousFrequency !== 'never' && newFrequency === 'never') {
      await propagateRepeatingToNever(reminderId!);
    } else if (previousFrequency !== 'never' && newFrequency !== 'never') {
      await propagateRepeatingToRepeating(reminderId!, newFrequency as 'weekly' | 'monthly' | 'yearly');
    }

    setSeriesPropagationState({ isOpen: false, previousFrequency: 'never', newFrequency: 'never', affectedCount: 0 });
    onSuccess();
  }, [reminderId, seriesPropagationState, onSuccess]);

  const declineSeriesPropagation = useCallback(() => {
    setSeriesPropagationState({ isOpen: false, previousFrequency: 'never', newFrequency: 'never', affectedCount: 0 });
    onSuccess();
  }, [onSuccess]);

  const hasFrequencyChanged = useMemo(
    () => seriesFrequency !== originalFrequencyRef.current,
    [seriesFrequency],
  );

  const isValid =
    name.trim().length > 0 &&
    icon.length > 0 &&
    backgroundColor.length > 0 &&
    Object.keys(errors).length === 0;

  return {
    name,
    icon,
    backgroundColor,
    seriesFrequency,
    seriesEndDate,
    errors,
    isValid,
    isSaving,
    saveError,
    hasFrequencyChanged,
    setName,
    setIcon,
    setBackgroundColor,
    setSeriesFrequency,
    setSeriesEndDate,
    handleSubmit,
    propagationState,
    confirmPropagation,
    declinePropagation,
    seriesPropagationState,
    confirmSeriesPropagation,
    declineSeriesPropagation,
  };
};
