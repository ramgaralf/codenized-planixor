import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

import { db } from '@/data/db';

import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';
import { formatTimeFromMinutes } from '../utils';

interface EventTypeSelectorProps {
  value: { eventType: 'shift' | 'reminder'; eventTypeId: string } | null;
  onChange: (selection: { eventType: 'shift' | 'reminder'; eventTypeId: string }) => void;
  error?: string;
}

interface EventTypeOption {
  eventType: 'shift' | 'reminder';
  eventTypeId: string;
  displayName: string;
  name: string;
  icon: string;
  backgroundColor: string;
  startTime?: number;
  endTime?: number;
}

/**
 * EventTypeSelector — custom dropdown displaying available shifts and reminders
 * with rich option rendering: backgroundColor, icon, name, and time range for shifts.
 */
export const EventTypeSelector = ({ value, onChange, error }: EventTypeSelectorProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      startTime: shift.startTime,
      endTime: shift.endTime,
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

    return [...shiftOptions, ...reminderOptions].sort((a, b) => {
      // First group by type: shifts first, then reminders
      if (a.eventType !== b.eventType) {
        return a.eventType === 'shift' ? -1 : 1;
      }
      // Within same type, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [activeShifts, activeReminders, t]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return (
      options.find(
        (opt) => opt.eventType === value.eventType && opt.eventTypeId === value.eventTypeId,
      ) ?? null
    );
  }, [value, options]);

  const handleSelect = useCallback((option: EventTypeOption) => {
    onChange({ eventType: option.eventType, eventTypeId: option.eventTypeId });
    setIsOpen(false);
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} ref={containerRef}>
      <label
        id="event-type-selector-label"
        style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}
      >
        {t('calendarEvent.eventTypeSelector.label')}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby="event-type-selector-label"
        aria-describedby={error ? 'event-type-error' : undefined}
        style={{
          width: '100%',
          padding: '10px 16px',
          fontSize: '14px',
          borderRadius: '8px',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
          backgroundColor: 'var(--color-surface)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left',
        }}
      >
        {selectedOption ? (
          <>
            <span
              aria-hidden="true"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: selectedOption.backgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              {selectedOption.icon}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedOption.name}
              </span>
              {selectedOption.eventType === 'shift' && selectedOption.startTime !== undefined && selectedOption.endTime !== undefined && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {formatTimeFromMinutes(selectedOption.startTime)} – {formatTimeFromMinutes(selectedOption.endTime)}
                </span>
              )}
            </div>
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{t('calendarEvent.eventTypeSelector.placeholder')}</span>
        )}
        <ChevronDown size={16} style={{ flexShrink: 0, color: 'var(--color-text-secondary)' }} aria-hidden="true" />
      </button>

      {/* Dropdown list */}
      {isOpen && (
        <div
          role="listbox"
          aria-labelledby="event-type-selector-label"
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            backgroundColor: 'var(--color-surface)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            maxHeight: '280px',
            overflowY: 'auto',
            zIndex: 20,
          }}
        >
          {options.map((option) => (
            <button
              key={`${option.eventType}:${option.eventTypeId}`}
              type="button"
              role="option"
              aria-selected={value?.eventTypeId === option.eventTypeId && value?.eventType === option.eventType}
              onClick={() => handleSelect(option)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {/* Color indicator */}
              <span
                aria-hidden="true"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: option.backgroundColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >
                {option.icon}
              </span>

              {/* Name + time info */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {option.name}
                </span>
                {option.eventType === 'shift' && option.startTime !== undefined && option.endTime !== undefined && (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {formatTimeFromMinutes(option.startTime)} – {formatTimeFromMinutes(option.endTime)}
                  </span>
                )}
              </div>
            </button>
          ))}
          {options.length === 0 && (
            <div style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              {t('calendarEvent.eventTypeSelector.noOptions', { defaultValue: 'No shifts or reminders available' })}
            </div>
          )}
        </div>
      )}

      {error && (
        <p id="event-type-error" role="alert" style={{ fontSize: '12px', color: 'var(--color-error)', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
};
