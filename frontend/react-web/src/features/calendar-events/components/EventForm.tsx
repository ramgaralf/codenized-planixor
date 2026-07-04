import { useTranslation } from 'react-i18next';

import { AlertConfigField } from '@features/notifications/components/AlertConfigField';
import { ValidationError } from '@shared/components/ValidationError';

import { MAX_NOTES_LENGTH } from '../constants';
import { useEventForm } from '../hooks/useEventForm';
import type { CalendarEvent } from '../models';

import { EventTypeSelector } from './EventTypeSelector';

interface EventFormProps {
  /** Existing event for edit mode. Omit for create mode. */
  existingEvent?: CalendarEvent | null;
  /** Callback after successful save */
  onSuccess?: () => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Callback when user clicks delete (only in edit mode) */
  onDelete?: () => void;
}

const formatTotalHours = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatMinutesToTime = (minutes: number | null): string => {
  if (minutes === null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

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

const inputReadOnlyStyle: React.CSSProperties = {
  ...inputStyle,
  opacity: 0.7,
  cursor: 'not-allowed',
};

/**
 * Returns the appropriate input style based on error and read-only state.
 */
const getTimeInputStyle = (hasError: boolean, isReadOnly: boolean): React.CSSProperties => {
  if (hasError) return inputErrorStyle;
  if (isReadOnly) return inputReadOnlyStyle;
  return inputStyle;
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

/**
 * Computes the EventTypeSelector error string (or undefined).
 */
const getEventTypeSelectorError = (
  fieldErrors: Record<string, string | undefined>,
  t: (key: string) => string,
): string | undefined => {
  const key = fieldErrors.eventType ?? fieldErrors.eventTypeId;
  if (!key) return undefined;
  return t(key);
};

/**
 * EventForm — form component for creating and editing calendar events.
 * Styled to match the ShiftForm visual pattern.
 */
export const EventForm = ({ existingEvent, onSuccess, onCancel, onDelete }: EventFormProps) => {
  const { t } = useTranslation();

  const {
    formState,
    fieldErrors,
    formError,
    isSubmitting,
    isTimeReadOnly,
    isAlertConfigVisible,
    setField,
    selectEventType,
    handleSubmit,
    handleCancel,
    isEditMode,
  } = useEventForm({ existingEvent, onSuccess, onCancel });

  const handleEventTypeChange = (selection: { eventType: 'shift' | 'reminder'; eventTypeId: string }) => {
    selectEventType(selection.eventType, selection.eventTypeId);
  };

  const title = isEditMode
    ? t('calendarEvent.form.editTitle', { defaultValue: 'Edit Event' })
    : t('calendarEvent.form.createTitle', { defaultValue: 'New Event' });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', paddingBottom: '64px' }}
      aria-label={title}
      noValidate
    >
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', margin: 0 }}>
        {title}
      </h2>

      {/* Event Type Selector */}
      <div style={fieldGroupStyle}>
        <EventTypeSelector
          value={
            formState.eventType && formState.eventTypeId
              ? { eventType: formState.eventType, eventTypeId: formState.eventTypeId }
              : null
          }
          onChange={handleEventTypeChange}
          error={getEventTypeSelectorError(fieldErrors, t)}
        />
      </div>

      {/* Start Day */}
      <div style={fieldGroupStyle}>
        <label htmlFor="event-start-day" style={labelStyle}>
          {t('calendarEvent.form.startDay')}
        </label>
        <input
          id="event-start-day"
          name="startDay"
          data-field="startDay"
          type="date"
          value={formState.startDay}
          onChange={(e) => setField('startDay', e.target.value)}
          aria-invalid={!!fieldErrors.startDay}
          aria-describedby={fieldErrors.startDay ? 'event-start-day-error' : undefined}
          style={fieldErrors.startDay ? inputErrorStyle : inputStyle}
        />
        <ValidationError message={fieldErrors.startDay} />
      </div>

      {/* End Day */}
      <div style={fieldGroupStyle}>
        <label htmlFor="event-end-day" style={labelStyle}>
          {t('calendarEvent.form.endDay')}
        </label>
        <input
          id="event-end-day"
          name="endDay"
          data-field="endDay"
          type="date"
          value={formState.endDay}
          onChange={(e) => setField('endDay', e.target.value)}
          aria-invalid={!!fieldErrors.endDay}
          aria-describedby={fieldErrors.endDay ? 'event-end-day-error' : undefined}
          style={fieldErrors.endDay ? inputErrorStyle : inputStyle}
        />
        <ValidationError message={fieldErrors.endDay} />
      </div>

      {/* Start Time */}
      <div style={fieldGroupStyle}>
        <label htmlFor="event-start-time" style={labelStyle}>
          {t('calendarEvent.form.startTime')}
        </label>
        <input
          id="event-start-time"
          name="startTime"
          data-field="startTime"
          type="time"
          value={formatMinutesToTime(formState.startTime)}
          onChange={(e) => {
            const parts = e.target.value.split(':');
            const h = Number(parts[0]);
            const m = Number(parts[1]);
            if (!isNaN(h) && !isNaN(m)) setField('startTime', h * 60 + m);
          }}
          disabled={isTimeReadOnly}
          aria-invalid={!!fieldErrors.startTime}
          aria-describedby={fieldErrors.startTime ? 'event-start-time-error' : undefined}
          style={getTimeInputStyle(!!fieldErrors.startTime, isTimeReadOnly)}
        />
        <ValidationError message={fieldErrors.startTime} />
      </div>

      {/* End Time */}
      <div style={fieldGroupStyle}>
        <label htmlFor="event-end-time" style={labelStyle}>
          {t('calendarEvent.form.endTime')}
        </label>
        <input
          id="event-end-time"
          name="endTime"
          data-field="endTime"
          type="time"
          value={formatMinutesToTime(formState.endTime)}
          onChange={(e) => {
            const parts = e.target.value.split(':');
            const h = Number(parts[0]);
            const m = Number(parts[1]);
            if (!isNaN(h) && !isNaN(m)) setField('endTime', h * 60 + m);
          }}
          disabled={isTimeReadOnly}
          aria-invalid={!!fieldErrors.endTime}
          aria-describedby={fieldErrors.endTime ? 'event-end-time-error' : undefined}
          style={getTimeInputStyle(!!fieldErrors.endTime, isTimeReadOnly)}
        />
        <ValidationError message={fieldErrors.endTime} />
      </div>

      {/* Total Hours (read-only) */}
      <div style={fieldGroupStyle}>
        <label htmlFor="event-total-hours" style={labelStyle}>
          {t('calendarEvent.form.totalHours')}
        </label>
        <input
          id="event-total-hours"
          type="text"
          value={formatTotalHours(formState.totalHours)}
          readOnly
          aria-readonly="true"
          style={inputReadOnlyStyle}
        />
      </div>

      {/* Notes */}
      <div style={fieldGroupStyle}>
        <label htmlFor="event-notes" style={labelStyle}>
          {t('calendarEvent.form.notes')}
        </label>
        <textarea
          id="event-notes"
          name="notes"
          data-field="notes"
          value={formState.notes}
          onChange={(e) => setField('notes', e.target.value)}
          maxLength={MAX_NOTES_LENGTH}
          rows={3}
          aria-invalid={!!fieldErrors.notes}
          aria-describedby={fieldErrors.notes ? 'event-notes-error' : undefined}
          placeholder={t('calendarEvent.form.notesPlaceholder')}
          style={{
            ...(fieldErrors.notes ? inputErrorStyle : inputStyle),
            resize: 'vertical',
          }}
        />
        <ValidationError message={fieldErrors.notes} />
      </div>

      {/* Alert Config */}
      <AlertConfigField
        alertOffsets={formState.alertOffsets}
        onChange={(offsets) => setField('alertOffsets', offsets)}
        visible={isAlertConfigVisible}
      />

      {/* Form-level error */}
      {formError && (
        <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 500, margin: 0 }}>
          {t(formError)}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid var(--color-error)',
              backgroundColor: 'transparent',
              color: 'var(--color-error)',
              cursor: 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              marginRight: 'auto',
            }}
          >
            {t('calendarEvent.detail.delete', { defaultValue: 'Delete' })}
          </button>
        )}
        {!onDelete && <div style={{ marginRight: 'auto' }} />}
        <button
          type="button"
          onClick={handleCancel}
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
          {t('common.cancel')}
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
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
};
