import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';

import { db } from '@/data/db';

import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';

interface EventTypeSelectorProps {
  /** Currently selected event type ("shift" | "reminder" | null) */
  value: { eventType: 'shift' | 'reminder'; eventTypeId: string } | null;
  /** Callback when user selects an option */
  onChange: (selection: { eventType: 'shift' | 'reminder'; eventTypeId: string }) => void;
  /** Optional error message to display */
  error?: string;
}

interface EventTypeOption {
  eventType: 'shift' | 'reminder';
  eventTypeId: string;
  displayName: string;
  name: string;
  icon: string;
  backgroundColor: string;
}

/**
 * EventTypeSelector — dropdown component displaying available shifts and reminders.
 *
 * Queries IndexedDB (Dexie) for active, non-deleted shifts and reminders,
 * formats them as "{type}: {name}" sorted alphabetically by display name.
 * On selection, emits eventType and eventTypeId. Displays derived read-only
 * fields (name, icon, backgroundColor) from the selected item.
 *
 * Uses `useLiveQuery` for reactive updates when shifts/reminders change.
 *
 * Data Isolation (Req 13.4): Only queries local db.shifts and db.reminders.
 * No cross-user data is ever accessible — ownership is implicit via local storage.
 *
 * **Validates: Requirements 1.4, 1.5, 13.4**
 */
export const EventTypeSelector = ({ value, onChange, error }: EventTypeSelectorProps) => {
  const { t } = useTranslation();

  const activeShifts = useLiveQuery(
    () =>
      db.shifts
        .filter((shift) => shift.isActive === true && shift.isDeleted === false)
        .toArray(),
    [],
  );

  const activeReminders = useLiveQuery(
    () =>
      db.reminders
        .filter((reminder) => reminder.isActive === true && reminder.isDeleted === false)
        .toArray(),
    [],
  );

  const options: EventTypeOption[] = useMemo(() => {
    const shiftOptions: EventTypeOption[] = (activeShifts ?? []).map((shift: Shift) => ({
      eventType: 'shift' as const,
      eventTypeId: shift.id,
      displayName: `${t('calendarEvent.eventTypeSelector.shiftPrefix')}: ${shift.name}`,
      name: shift.name,
      icon: shift.icon,
      backgroundColor: shift.backgroundColor,
    }));

    const reminderOptions: EventTypeOption[] = (activeReminders ?? []).map(
      (reminder: Reminder) => ({
        eventType: 'reminder' as const,
        eventTypeId: reminder.id,
        displayName: `${t('calendarEvent.eventTypeSelector.reminderPrefix')}: ${reminder.name}`,
        name: reminder.name,
        icon: reminder.icon,
        backgroundColor: reminder.backgroundColor,
      }),
    );

    return [...shiftOptions, ...reminderOptions].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
  }, [activeShifts, activeReminders, t]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return (
      options.find(
        (opt) => opt.eventType === value.eventType && opt.eventTypeId === value.eventTypeId,
      ) ?? null
    );
  }, [value, options]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;

    const option = options.find(
      (opt) => `${opt.eventType}:${opt.eventTypeId}` === selectedValue,
    );
    if (option) {
      onChange({ eventType: option.eventType, eventTypeId: option.eventTypeId });
    }
  };

  const currentSelectValue = value
    ? `${value.eventType}:${value.eventTypeId}`
    : '';

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="event-type-selector"
        style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 500 }}
      >
        {t('calendarEvent.eventTypeSelector.label')}
      </label>

      <select
        id="event-type-selector"
        value={currentSelectValue}
        onChange={handleChange}
        aria-describedby={error ? 'event-type-error' : undefined}
        aria-invalid={!!error}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          fontSize: '14px',
          width: '100%',
          cursor: 'pointer',
          appearance: 'auto',
        }}
      >
        <option value="">
          {t('calendarEvent.eventTypeSelector.placeholder')}
        </option>
        {options.map((option) => (
          <option
            key={`${option.eventType}:${option.eventTypeId}`}
            value={`${option.eventType}:${option.eventTypeId}`}
          >
            {option.displayName}
          </option>
        ))}
      </select>

      {error && (
        <p
          id="event-type-error"
          role="alert"
          style={{ color: 'var(--color-error)', fontSize: '12px', margin: 0 }}
        >
          {error}
        </p>
      )}

      {selectedOption && (
        <div
          className="flex items-center gap-3"
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: selectedOption.backgroundColor,
            marginTop: '4px',
          }}
          aria-label={t('calendarEvent.eventTypeSelector.selectedDetails')}
        >
          <span aria-hidden="true" style={{ fontSize: '20px' }}>
            {selectedOption.icon}
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#FFFFFF',
            }}
          >
            {selectedOption.name}
          </span>
        </div>
      )}
    </div>
  );
};
