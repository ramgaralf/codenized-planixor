import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ReminderForm } from '@features/reminders/components/ReminderForm';
import * as reminderService from '@features/reminders/services/reminderService';

import type { SeriesFrequency } from '@features/reminders/services/reminderValidation';

interface ReminderInitialValues {
  name: string;
  icon: string;
  backgroundColor: string;
  seriesFrequency: SeriesFrequency;
  seriesEndDate: string | null;
}

export const ReminderEditPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [initialValues, setInitialValues] = useState<ReminderInitialValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReminder = async () => {
      if (!id) {
        navigate('/reminders', { replace: true });
        return;
      }

      try {
        const reminder = await reminderService.getById(id);

        if (!reminder || reminder.isDeleted) {
          navigate('/reminders', { replace: true });
          return;
        }

        setInitialValues({
          name: reminder.name,
          icon: reminder.icon,
          backgroundColor: reminder.backgroundColor,
          seriesFrequency: reminder.seriesFrequency ?? 'never',
          seriesEndDate: reminder.seriesEndDate ?? null,
        });
      } catch {
        console.error('Failed to load reminder for editing');
        navigate('/reminders', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    loadReminder();
  }, [id, navigate]);

  const handleSubmitSuccess = useCallback(() => {
    navigate('/reminders');
  }, [navigate]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '4px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
          role="status"
          aria-label={t('common.loading')}
        />
      </div>
    );
  }

  if (!initialValues) {
    return null;
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px 32px' }}>
      <ReminderForm
        initialValues={initialValues}
        reminderId={id}
        onSubmitSuccess={handleSubmitSuccess}
      />
    </div>
  );
};
