import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

import { ColorPicker } from '@features/reminders/components/ColorPicker';
import type { ShiftValidationErrors } from '@features/shifts/services/shiftValidation';

import { useTheme } from '@context/useTheme';

interface ShiftFormFields {
  name: string;
  icon: string;
  backgroundColor: string;
  startTime: string;
  endTime: string;
  hoursWorked: string;
}

interface ShiftFormProps {
  fields: ShiftFormFields;
  errors: ShiftValidationErrors;
  onFieldChange: (field: keyof ShiftFormFields, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
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
  colorScheme: 'var(--color-scheme, light)' as string,
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

export const ShiftForm = ({
  fields,
  errors,
  onFieldChange,
  onSubmit,
  onCancel,
  isSubmitting,
  mode,
}: ShiftFormProps) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit();
    },
    [onSubmit],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const title =
    mode === 'create'
      ? t('shift.form.createTitle')
      : t('shift.form.editTitle');

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}
      aria-label={title}
      noValidate
    >
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', margin: 0 }}>
        {title}
      </h2>

      {/* Name field */}
      <div style={fieldGroupStyle}>
        <label htmlFor="shift-name" style={labelStyle}>
          {t('shift.form.nameLabel')}
        </label>
        <input
          id="shift-name"
          type="text"
          maxLength={50}
          value={fields.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          placeholder={t('shift.form.namePlaceholder')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'shift-name-error' : undefined}
          style={errors.name ? inputErrorStyle : inputStyle}
        />
        {errors.name && (
          <p id="shift-name-error" style={errorStyle} role="alert">
            {t(errors.name)}
          </p>
        )}
      </div>

      {/* Icon field */}
      <div style={fieldGroupStyle} ref={emojiPickerRef}>
        <label style={labelStyle}>{t('shift.form.iconLabel')}</label>
        <div>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-expanded={showEmojiPicker}
            aria-haspopup="grid"
            aria-describedby={errors.icon ? 'shift-icon-error' : undefined}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: `1px solid ${errors.icon ? 'var(--color-error)' : 'var(--color-border)'}`,
              backgroundColor: 'var(--color-surface)',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            {fields.icon || '➕'}
          </button>
        </div>

        {showEmojiPicker && (
          <div style={{ marginTop: '8px', position: 'relative', zIndex: 10 }}>
            <EmojiPicker
              onEmojiClick={(emojiData: EmojiClickData) => {
                onFieldChange('icon', emojiData.emoji);
                setShowEmojiPicker(false);
              }}
              theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
              width="100%"
              height={350}
              searchPlaceHolder={t('shift.form.searchEmoji')}
              lazyLoadEmojis
            />
          </div>
        )}

        {errors.icon && (
          <p id="shift-icon-error" style={errorStyle} role="alert">
            {t(errors.icon)}
          </p>
        )}
      </div>

      {/* Background Color field */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t('shift.form.colorLabel')}</label>
        <ColorPicker
          value={fields.backgroundColor}
          onChange={(color) => onFieldChange('backgroundColor', color)}
          theme={resolvedTheme}
        />
        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0 }}>
          {t('shift.form.colorHint')}
        </p>
        {errors.backgroundColor && (
          <p id="shift-color-error" style={errorStyle} role="alert">
            {t(errors.backgroundColor)}
          </p>
        )}
      </div>

      {/* Start Time field */}
      <div style={fieldGroupStyle}>
        <label htmlFor="shift-start-time" style={labelStyle}>
          {t('shift.form.startTimeLabel')}
        </label>
        <input
          id="shift-start-time"
          type="time"
          value={fields.startTime}
          onChange={(e) => onFieldChange('startTime', e.target.value)}
          aria-invalid={!!errors.startTime}
          aria-describedby={errors.startTime ? 'shift-start-time-error' : undefined}
          style={errors.startTime ? inputErrorStyle : inputStyle}
        />
        {errors.startTime && (
          <p id="shift-start-time-error" style={errorStyle} role="alert">
            {t(errors.startTime)}
          </p>
        )}
      </div>

      {/* End Time field */}
      <div style={fieldGroupStyle}>
        <label htmlFor="shift-end-time" style={labelStyle}>
          {t('shift.form.endTimeLabel')}
        </label>
        <input
          id="shift-end-time"
          type="time"
          value={fields.endTime}
          onChange={(e) => onFieldChange('endTime', e.target.value)}
          aria-invalid={!!errors.endTime}
          aria-describedby={errors.endTime ? 'shift-end-time-error' : undefined}
          style={errors.endTime ? inputErrorStyle : inputStyle}
        />
        {errors.endTime && (
          <p id="shift-end-time-error" style={errorStyle} role="alert">
            {t(errors.endTime)}
          </p>
        )}
      </div>

      {/* Hours Worked field */}
      <div style={fieldGroupStyle}>
        <label htmlFor="shift-hours-worked" style={labelStyle}>
          {t('shift.form.hoursWorkedLabel')}
        </label>
        <input
          id="shift-hours-worked"
          type="time"
          value={fields.hoursWorked}
          onChange={(e) => onFieldChange('hoursWorked', e.target.value)}
          aria-invalid={!!errors.hoursWorked}
          aria-describedby={errors.hoursWorked ? 'shift-hours-worked-error' : undefined}
          style={errors.hoursWorked ? inputErrorStyle : inputStyle}
        />
        {errors.hoursWorked && (
          <p id="shift-hours-worked-error" style={errorStyle} role="alert">
            {t(errors.hoursWorked)}
          </p>
        )}
      </div>

      {/* Form actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          {t('shift.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            cursor: 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          {t('shift.form.submit')}
        </button>
      </div>
    </form>
  );
};
