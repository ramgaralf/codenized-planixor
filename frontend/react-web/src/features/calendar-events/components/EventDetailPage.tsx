import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

import type { CalendarEventDisplay } from '../models';

import { EventForm } from './EventForm';

interface EventDetailPageProps {
  /** The calendar event to display/edit */
  event: CalendarEventDisplay;
  /** Callback to navigate back */
  onBack: () => void;
  /** Callback after successful deletion */
  onDelete?: () => void;
}

/**
 * EventDetailPage — displays a calendar event in edit mode with a delete action.
 *
 * Renders the event header (read-only name + icon) and the EventForm in edit mode.
 * Exposes a delete button that triggers a delete flow (handled externally via onDelete
 * or via ConfirmationModal in task 4.4).
 *
 * On save: the EventForm calls onBack to navigate back to CalendarPage.
 * On cancel: calls onBack to discard unsaved changes.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
 */
export const EventDetailPage = ({ event, onBack, onDelete }: EventDetailPageProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-col gap-6"
      style={{ padding: '24px 32px', height: '100%', overflow: 'auto' }}
    >
      {/* Header with event info and delete button */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            style={{
              fontSize: '28px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              backgroundColor: event.backgroundColor,
            }}
          >
            {event.icon}
          </span>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {event.name}
          </h2>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('calendarEvent.detail.deleteAriaLabel', { name: event.name })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid var(--color-error)',
              backgroundColor: 'transparent',
              color: 'var(--color-error)',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            {t('calendarEvent.detail.delete')}
          </button>
        )}
      </header>

      {/* EventForm in edit mode */}
      <EventForm
        existingEvent={event}
        onSuccess={onBack}
        onCancel={onBack}
      />
    </div>
  );
};
