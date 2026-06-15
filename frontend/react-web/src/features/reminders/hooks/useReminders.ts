import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import * as reminderService from '@features/reminders/services/reminderService';
import type { Reminder } from '@features/reminders/models';

export interface UseRemindersReturn {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  activate: (id: string) => Promise<void>;
  softDelete: (id: string) => Promise<void>;
}

export const useReminders = (): UseRemindersReturn => {
  const { t } = useTranslation();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await reminderService.getAll();
      setReminders(result);
    } catch (err) {
      console.error('Failed to load reminders:', err);
      setError(t('reminder.error.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const refresh = useCallback(async () => {
    await loadReminders();
  }, [loadReminders]);

  const deactivate = useCallback(async (id: string) => {
    try {
      await reminderService.deactivate(id);
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isActive: false, modifiedAt: new Date() } : r,
        ),
      );
    } catch (err) {
      console.error('Failed to deactivate reminder:', err);
    }
  }, []);

  const activate = useCallback(async (id: string) => {
    try {
      await reminderService.activate(id);
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isActive: true, modifiedAt: new Date() } : r,
        ),
      );
    } catch (err) {
      console.error('Failed to activate reminder:', err);
    }
  }, []);

  const softDelete = useCallback(async (id: string) => {
    try {
      await reminderService.softDelete(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  }, []);

  return {
    reminders,
    isLoading,
    error,
    refresh,
    deactivate,
    activate,
    softDelete,
  };
};
