import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '@context/useTheme';

import { ColorPicker } from '@features/reminders/components/ColorPicker';
import { EmojiPicker } from '@features/reminders/components/EmojiPicker';
import { useReminderForm } from '@features/reminders/hooks/useReminderForm';

interface ReminderFormProps {
  initialValues?: { name: string; icon: string; backgroundColor: string };
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

const errorStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-error)',
  marginTop: '4px',
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
    errors,
    isValid,
    isSaving,
    saveError,
    setName,
    setIcon,
    setBackgroundColor,
    handleSubmit,
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

  return (
    <form
      onSubmit={handleFormSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}
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
          <p id="reminder-name-error" style={errorStyle} role="alert">
            {t(errors.name)}
          </p>
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
          <p id="reminder-icon-error" style={errorStyle} role="alert">
            {t(errors.icon)}
          </p>
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
          <p id="reminder-color-error" style={errorStyle} role="alert">
            {t(errors.backgroundColor)}
          </p>
        )}
      </div>

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
          disabled={!isValid || isSaving}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            cursor: !isValid || isSaving ? 'not-allowed' : 'pointer',
            opacity: !isValid || isSaving ? 0.5 : 1,
          }}
        >
          {t('reminder.form.submit')}
        </button>
      </div>
    </form>
  );
};
