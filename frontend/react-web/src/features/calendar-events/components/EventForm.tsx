import { useTranslation } from 'react-i18next';

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
}

/**
 * EventForm — shared form component for creating and editing calendar events.
 *
 * Renders all required fields: EventTypeSelector, day picker, start time, end time, notes.
 * Handles validation display and submission via the useEventForm hook.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.8, 1.9, 1.10, 2.2, 12.1**
 */
export const EventForm = ({ existingEvent, onSuccess, onCancel }: EventFormProps) => {
  const { t } = useTranslation();

  const {
    formState,
    fieldErrors,
    formError,
    isSubmitting,
    setField,
    handleSubmit,
    handleCancel,
  } = useEventForm({ existingEvent, onSuccess, onCancel });

  const handleEventTypeChange = (selection: { eventType: 'shift' | 'reminder'; eventTypeId: string }) => {
    setField('eventType', selection.eventType);
    setField('eventTypeId', selection.eventTypeId);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setField('day', e.target.value);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!isNaN(hours) && !isNaN(minutes)) {
      setField('startTime', hours * 60 + minutes);
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!isNaN(hours) && !isNaN(minutes)) {
      setField('endTime', hours * 60 + minutes);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setField('notes', e.target.value);
  };

  const formatMinutesToTime = (minutes: number | null): string => {
    if (minutes === null) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      {/* Event Type Selector */}
      <EventTypeSelector
        value={
          formState.eventType && formState.eventTypeId
            ? { eventType: formState.eventType, eventTypeId: formState.eventTypeId }
            : null
        }
        onChange={handleEventTypeChange}
        error={fieldErrors.eventType || fieldErrors.eventTypeId ? t(fieldErrors.eventType ?? fieldErrors.eventTypeId ?? '') : undefined}
      />

      {/* Day picker */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="event-day"
          style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 500 }}
        >
          {t('calendarEvent.form.day')}
        </label>
        <input
          id="event-day"
          type="date"
          value={formState.day}
          onChange={handleDayChange}
          aria-invalid={!!fieldErrors.day}
          aria-describedby={fieldErrors.day ? 'event-day-error' : undefined}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${fieldErrors.day ? 'var(--color-error)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            width: '100%',
            colorScheme: 'var(--color-scheme, light)',
          }}
        />
        {fieldErrors.day && (
          <p id="event-day-error" role="alert" style={{ color: 'var(--color-error)', fontSize: '12px', margin: 0 }}>
            {t(fieldErrors.day)}
          </p>
        )}
      </div>

      {/* Start Time */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="event-start-time"
          style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 500 }}
        >
          {t('calendarEvent.form.startTime')}
        </label>
        <input
          id="event-start-time"
          type="time"
          value={formatMinutesToTime(formState.startTime)}
          onChange={handleStartTimeChange}
          aria-invalid={!!fieldErrors.startTime}
          aria-describedby={fieldErrors.startTime ? 'event-start-time-error' : undefined}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${fieldErrors.startTime ? 'var(--color-error)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            width: '100%',
            colorScheme: 'var(--color-scheme, light)',
          }}
        />
        {fieldErrors.startTime && (
          <p id="event-start-time-error" role="alert" style={{ color: 'var(--color-error)', fontSize: '12px', margin: 0 }}>
            {t(fieldErrors.startTime)}
          </p>
        )}
      </div>

      {/* End Time */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="event-end-time"
          style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 500 }}
        >
          {t('calendarEvent.form.endTime')}
        </label>
        <input
          id="event-end-time"
          type="time"
          value={formatMinutesToTime(formState.endTime)}
          onChange={handleEndTimeChange}
          aria-invalid={!!fieldErrors.endTime}
          aria-describedby={fieldErrors.endTime ? 'event-end-time-error' : undefined}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${fieldErrors.endTime ? 'var(--color-error)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            width: '100%',
            colorScheme: 'var(--color-scheme, light)',
          }}
        />
        {fieldErrors.endTime && (
          <p id="event-end-time-error" role="alert" style={{ color: 'var(--color-error)', fontSize: '12px', margin: 0 }}>
            {t(fieldErrors.endTime)}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="event-notes"
          style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 500 }}
        >
          {t('calendarEvent.form.notes')}
        </label>
        <textarea
          id="event-notes"
          value={formState.notes}
          onChange={handleNotesChange}
          maxLength={200}
          rows={3}
          aria-invalid={!!fieldErrors.notes}
          aria-describedby={fieldErrors.notes ? 'event-notes-error' : undefined}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${fieldErrors.notes ? 'var(--color-error)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            width: '100%',
            resize: 'vertical',
          }}
          placeholder={t('calendarEvent.form.notesPlaceholder')}
        />
        {fieldErrors.notes && (
          <p id="event-notes-error" role="alert" style={{ color: 'var(--color-error)', fontSize: '12px', margin: 0 }}>
            {t(fieldErrors.notes)}
          </p>
        )}
      </div>

      {/* Form-level error (one-shift-per-day) */}
      {formError && (
        <p role="alert" style={{ color: 'var(--color-error)', fontSize: '13px', margin: 0, fontWeight: 500 }}>
          {t(formError)}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-3" style={{ paddingTop: '8px' }}>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
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
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
};
