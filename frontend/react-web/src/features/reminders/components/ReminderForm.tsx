import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '@context/useTheme';

import { ColorPicker } from '@features/reminders/components/ColorPicker';
import { EmojiPicker } from '@features/reminders/components/EmojiPicker';
import { FrequencySelector } from '@features/reminders/components/FrequencySelector';
import { SeriesPropagationModal } from '@features/reminders/components/SeriesPropagationModal';
import { useReminderForm } from '@features/reminders/hooks/useReminderForm';
import { PropagationModal } from '@shared/components/PropagationModal';
import { ValidationError } from '@shared/components/ValidationError';

import type { SeriesFrequency } from '@features/reminders/services/reminderValidation';

interface ReminderFormProps {
  initialValues?: { name: string; icon: string; backgroundColor: string; seriesFrequency?: SeriesFrequency; seriesEndDate?: string | null };
  reminderId?: string;
  onSubmitSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontSize: '14px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: 'var(--color-error)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

export const ReminderForm = ({
  initialValues,
  reminderId,
  onSubmitSuccess,
}: ReminderFormProps) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const {
    name,
    icon,
    backgroundColor,
    seriesFrequency,
    seriesEndDate,
    errors,
    isSaving,
    saveError,
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
  } = useReminderForm({
    initialValues,
    reminderId,
    onSuccess: onSubmitSuccess,
  });

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit],
  );

  const handleCancel = useCallback(() => {
    navigate('/reminders');
  }, [navigate]);

  const mode = reminderId ? 'edit' : 'create';
  const title =
    mode === 'create'
      ? t('reminder.form.createTitle')
      : t('reminder.form.editTitle');

  const getFrequencyLabel = useCallback((freq: string): string => {
    if (freq === 'never') return t('reminder.form.frequency.never');
    return t(`reminder.series.${freq}`);
  }, [t]);

  return (
    <>
    <form
      onSubmit={handleFormSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', paddingBottom: '64px' }}
      aria-label={title}
      noValidate
    >
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-family)',
          margin: 0,
        }}
      >
        {title}
      </h2>

      {/* Save error banner */}
      {saveError && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-error)',
            color: '#ffffff',
            fontSize: '14px',
          }}
        >
          {t(saveError)}
        </div>
      )}

      {/* Name field */}
      <div style={fieldGroupStyle}>
        <label htmlFor="reminder-name" style={labelStyle}>
          {t('reminder.form.nameLabel')}
        </label>
        <input
          id="reminder-name"
          name="name"
          data-field="name"
          type="text"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('reminder.form.namePlaceholder')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'reminder-name-error' : undefined}
          style={errors.name ? inputErrorStyle : inputStyle}
        />
        {errors.name && (
          <ValidationError message={errors.name} />
        )}
      </div>

      {/* Icon field */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t('reminder.form.iconLabel')}</label>
        <EmojiPicker
          value={icon}
          onChange={setIcon}
          theme={resolvedTheme}
        />
        {errors.icon && (
          <ValidationError message={errors.icon} />
        )}
      </div>

      {/* Background Color field */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t('reminder.form.colorLabel')}</label>
        <ColorPicker
          value={backgroundColor}
          onChange={setBackgroundColor}
          theme={resolvedTheme}
        />
        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0 }}>
          {t('reminder.form.colorHint')}
        </p>
        {errors.backgroundColor && (
          <ValidationError message={errors.backgroundColor} />
        )}
      </div>

      {/* Frequency selector */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t('reminder.form.frequency.label')}</label>
        <FrequencySelector
          value={seriesFrequency}
          onChange={setSeriesFrequency}
          disabled={isSaving}
        />
        {errors.seriesFrequency && (
          <ValidationError message={errors.seriesFrequency} />
        )}
      </div>

      {/* Series end date — visible when frequency ≠ 'never' */}
      {seriesFrequency !== 'never' && (
        <div style={fieldGroupStyle}>
          <label htmlFor="reminder-series-end-date" style={labelStyle}>
            {t('reminder.form.endDate.label')}
          </label>
          <input
            id="reminder-series-end-date"
            name="seriesEndDate"
            data-field="seriesEndDate"
            type="date"
            value={seriesEndDate ?? ''}
            onChange={(e) => setSeriesEndDate(e.target.value || null)}
            disabled={isSaving}
            aria-invalid={!!errors.seriesEndDate}
            aria-describedby={errors.seriesEndDate ? 'reminder-end-date-error' : undefined}
            style={{
              ...inputStyle,
              ...(errors.seriesEndDate ? { borderColor: 'var(--color-error)' } : {}),
              colorScheme: 'var(--color-scheme, light)',
            }}
          />
          {errors.seriesEndDate && (
            <ValidationError message={errors.seriesEndDate} />
          )}
        </div>
      )}

      {/* Form actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          {t('reminder.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          {t('reminder.form.submit')}
        </button>
      </div>
    </form>
    <PropagationModal
      isOpen={propagationState.isOpen}
      templateName={name}
      templateType="reminder"
      affectedEventCount={propagationState.affectedCount}
      onConfirm={confirmPropagation}
      onDecline={declinePropagation}
    />
    <SeriesPropagationModal
      isOpen={seriesPropagationState.isOpen}
      reminderName={name}
      previousFrequency={getFrequencyLabel(seriesPropagationState.previousFrequency)}
      newFrequency={getFrequencyLabel(seriesPropagationState.newFrequency)}
      affectedEventCount={seriesPropagationState.affectedCount}
      onConfirm={confirmSeriesPropagation}
      onDecline={declineSeriesPropagation}
    />
    </>
  );
};
