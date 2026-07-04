import type { CalendarEventDisplay } from '@features/calendar-events/models';

import { formatTime } from './utils';

interface ReminderCardProps {
  event: CalendarEventDisplay;
  onEditReminder: (eventId: string) => void;
}

/**
 * ReminderCard — compact card displaying reminder information within the Day_Action_Modal.
 *
 * Layout: 4px color border | emoji icon (vertically centered) | name (line 1) + time range (line 2)
 * Clickable — triggers onEditReminder handler.
 * When orphaned (deleted reminder), displays "[Deleted]" name and is disabled (not clickable).
 *
 * **Validates: Requirements 9.4, 6.10, 8.10**
 */
export const ReminderCard = ({ event, onEditReminder }: ReminderCardProps) => {
  const isDisabled = event.isOrphaned;

  const handleClick = () => {
    if (!isDisabled) {
      onEditReminder(event.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEditReminder(event.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${event.name} ${formatTime(event.startTime)} - ${formatTime(event.endTime)}`}
      aria-disabled={isDisabled}
      style={{
        borderLeft: `4px solid ${isDisabled ? 'var(--color-border)' : event.backgroundColor}`,
        borderRadius: '8px',
        padding: '12px 16px',
        backgroundColor: 'var(--color-surface)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        opacity: isDisabled ? 0.5 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: '24px',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {event.icon}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {event.name}
        </div>
        <div
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '12px',
            fontWeight: 400,
            marginTop: '2px',
          }}
        >
          {formatTime(event.startTime)} – {formatTime(event.endTime)}
        </div>
      </div>
    </div>
  );
};
