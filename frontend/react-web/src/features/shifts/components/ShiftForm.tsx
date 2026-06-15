import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { PREDEFINED_PALETTE } from '@features/shifts/constants';
import type { ShiftValidationErrors } from '@features/shifts/services/shiftValidation';

const COMMON_EMOJIS = [
  '☀️', '🌙', '⭐', '🌅', '🌃',
  '💼', '🏥', '🏭', '🏢', '🏪',
  '🚗', '✈️', '🚀', '🎯', '📋',
  '🔧', '🖥️', '📞', '🎓', '🏠',
  '☕', '🍽️', '🏃', '💪', '🎉',
];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit();
    },
    [onSubmit],
  );

  // Close emoji picker when clicking outside
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
      className="mx-auto w-full max-w-lg space-y-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800"
      aria-label={title}
      noValidate
    >
      <h2 className="font-[Poppins] text-2xl font-bold text-gray-900 dark:text-gray-100">
        {title}
      </h2>

      {/* Name field */}
      <div className="space-y-1">
        <label
          htmlFor="shift-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
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
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
            errors.name
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500 dark:border-gray-600'
          }`}
        />
        {errors.name && (
          <p id="shift-name-error" className="text-xs text-red-500" role="alert">
            {t(errors.name)}
          </p>
        )}
      </div>

      {/* Icon field */}
      <div className="space-y-1" ref={emojiPickerRef}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('shift.form.iconLabel')}
        </label>
        <div
          aria-invalid={!!errors.icon}
          aria-describedby={errors.icon ? 'shift-icon-error' : undefined}
        >
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-expanded={showEmojiPicker}
            aria-haspopup="grid"
            className={`flex h-12 w-12 items-center justify-center rounded-lg border text-2xl transition-colors focus:ring-2 focus:ring-blue-500 ${
              errors.icon
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } ${fields.icon ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-700'}`}
          >
            {fields.icon || '➕'}
          </button>
        </div>

        {showEmojiPicker && (
          <div
            role="grid"
            aria-label={t('shift.form.iconLabel')}
            className="mt-2 grid grid-cols-5 gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-600 dark:bg-gray-700"
          >
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="gridcell"
                onClick={() => {
                  onFieldChange('icon', emoji);
                  setShowEmojiPicker(false);
                }}
                aria-label={emoji}
                aria-selected={fields.icon === emoji}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  fields.icon === emoji
                    ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-900/30'
                    : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {errors.icon && (
          <p id="shift-icon-error" className="text-xs text-red-500" role="alert">
            {t(errors.icon)}
          </p>
        )}
      </div>

      {/* Background Color field */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('shift.form.colorLabel')}
        </label>
        <div
          role="radiogroup"
          aria-label={t('shift.form.colorLabel')}
          aria-invalid={!!errors.backgroundColor}
          aria-describedby={
            errors.backgroundColor ? 'shift-color-error' : undefined
          }
          className="flex flex-wrap gap-3"
        >
          {PREDEFINED_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={fields.backgroundColor === color}
              aria-label={color}
              onClick={() => onFieldChange('backgroundColor', color)}
              className={`h-8 w-8 rounded-full transition-transform hover:scale-110 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                fields.backgroundColor === color
                  ? 'ring-2 ring-blue-500 ring-offset-2 scale-110'
                  : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        {errors.backgroundColor && (
          <p
            id="shift-color-error"
            className="text-xs text-red-500"
            role="alert"
          >
            {t(errors.backgroundColor)}
          </p>
        )}
      </div>

      {/* Start Time field */}
      <div className="space-y-1">
        <label
          htmlFor="shift-start-time"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t('shift.form.startTimeLabel')}
        </label>
        <input
          id="shift-start-time"
          type="time"
          value={fields.startTime}
          onChange={(e) => onFieldChange('startTime', e.target.value)}
          aria-invalid={!!errors.startTime}
          aria-describedby={errors.startTime ? 'shift-start-time-error' : undefined}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
            errors.startTime
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500 dark:border-gray-600'
          }`}
        />
        {errors.startTime && (
          <p
            id="shift-start-time-error"
            className="text-xs text-red-500"
            role="alert"
          >
            {t(errors.startTime)}
          </p>
        )}
      </div>

      {/* End Time field */}
      <div className="space-y-1">
        <label
          htmlFor="shift-end-time"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t('shift.form.endTimeLabel')}
        </label>
        <input
          id="shift-end-time"
          type="time"
          value={fields.endTime}
          onChange={(e) => onFieldChange('endTime', e.target.value)}
          aria-invalid={!!errors.endTime}
          aria-describedby={errors.endTime ? 'shift-end-time-error' : undefined}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
            errors.endTime
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500 dark:border-gray-600'
          }`}
        />
        {errors.endTime && (
          <p
            id="shift-end-time-error"
            className="text-xs text-red-500"
            role="alert"
          >
            {t(errors.endTime)}
          </p>
        )}
      </div>

      {/* Hours Worked field */}
      <div className="space-y-1">
        <label
          htmlFor="shift-hours-worked"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t('shift.form.hoursWorkedLabel')}
        </label>
        <input
          id="shift-hours-worked"
          type="time"
          value={fields.hoursWorked}
          onChange={(e) => onFieldChange('hoursWorked', e.target.value)}
          aria-invalid={!!errors.hoursWorked}
          aria-describedby={
            errors.hoursWorked ? 'shift-hours-worked-error' : undefined
          }
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
            errors.hoursWorked
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500 dark:border-gray-600'
          }`}
        />
        {errors.hoursWorked && (
          <p
            id="shift-hours-worked-error"
            className="text-xs text-red-500"
            role="alert"
          >
            {t(errors.hoursWorked)}
          </p>
        )}
      </div>

      {/* Form actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t('shift.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {t('shift.form.submit')}
        </button>
      </div>
    </form>
  );
};
