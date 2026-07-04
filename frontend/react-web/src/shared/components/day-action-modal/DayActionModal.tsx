import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarEventDisplay } from '@features/calendar-events/models';

import { ReminderCard } from './ReminderCard';
import { ShiftCard } from './ShiftCard';

interface DayActionModalProps {
  date: string;
  shiftEvents: CalendarEventDisplay[];
  reminderEvents: CalendarEventDisplay[];
  onCreateEvent: () => void;
  onEditShift: (eventId: string) => void;
  onEditReminder: (eventId: string) => void;
  onDismiss: () => void;
}

const DAY_MODAL_I18N_KEYS = {
  CREATE_EVENT: 'shiftMode.dayModal.createEvent',
  DATE_FORMAT: 'shiftMode.dayModal.dateFormat',
  CLOSE: 'shiftMode.dayModal.close',
} as const;

/**
 * Formats a date string (YYYY-MM-DD) according to locale.
 * Spanish: "dd de MMMM de yyyy"
 * English: "MMMM dd, yyyy"
 */
const formatDateByLocale = (isoDate: string, locale: string): string => {
  const parts = isoDate.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const date = new Date(year, month, day);

  const isSpanish = locale.toLowerCase().startsWith('es');
  const resolvedLocale = isSpanish ? 'es-ES' : 'en-US';

  return date.toLocaleDateString(resolvedLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * DayActionModal — modal dialog displayed when a user taps a day that has
 * existing shifts and/or reminders in Shift Mode.
 *
 * Displays:
 * - Date header formatted by locale
 * - "Create calendar event" button at top
 * - Shift cards sorted alphabetically by name
 * - Reminder cards sorted alphabetically by name
 *
 * Supports vertical scrolling if content overflows. Fixed header and create button.
 * Dismissible by clicking outside or pressing Escape.
 *
 * **Validates: Requirements 6.1, 6.2, 6.11, 8.1, 8.2, 8.11, 9.1, 9.2, 9.5, 9.6, 9.8, 9.9**
 */
export const DayActionModal = ({
  date,
  shiftEvents,
  reminderEvents,
  onCreateEvent,
  onEditShift,
  onEditReminder,
  onDismiss,
}: DayActionModalProps) => {
  const { t, i18n } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  const sortedShifts = [...shiftEvents].sort((a, b) => a.name.localeCompare(b.name));
  const sortedReminders = [...reminderEvents].sort((a, b) => a.name.localeCompare(b.name));

  // Focus the create button when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      createButtonRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key and focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [role="button"][tabindex="0"], [tabindex]:not([tabindex="-1"])',
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  const titleId = 'day-action-modal-title';
  const formattedDate = formatDateByLocale(date, i18n.language);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      role="presentation"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex flex-col"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          maxWidth: '440px',
          width: '90%',
          maxHeight: '80vh',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Fixed header + create button */}
        <div
          className="flex flex-col gap-3"
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div className="flex items-center justify-between">
            <h2
              id={titleId}
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '18px',
                fontWeight: 600,
                margin: 0,
              }}
            >
              {formattedDate}
            </h2>

            <button
              type="button"
              onClick={onDismiss}
              aria-label={t(DAY_MODAL_I18N_KEYS.CLOSE)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '4px',
              }}
            >
              ×
            </button>
          </div>

          <button
            ref={createButtonRef}
            type="button"
            onClick={onCreateEvent}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {t(DAY_MODAL_I18N_KEYS.CREATE_EVENT)}
          </button>
        </div>

        {/* Scrollable card list */}
        <div
          className="flex flex-col gap-2"
          style={{
            padding: '16px 24px 20px',
            overflowY: 'auto',
            flexGrow: 1,
          }}
        >
          {sortedShifts.map((event) => (
            <ShiftCard key={event.id} event={event} onEditShift={onEditShift} />
          ))}

          {sortedReminders.map((event) => (
            <ReminderCard key={event.id} event={event} onEditReminder={onEditReminder} />
          ))}
        </div>
      </div>
    </div>
  );
};
