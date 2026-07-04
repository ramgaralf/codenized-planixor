import type { CalendarEventDisplay } from '@features/calendar-events/models';

import { formatTime } from './utils';

interface ShiftCardProps {
  event: CalendarEventDisplay;
  onEditShift: (eventId: string) => void;
}

/**
 * ShiftCard — compact card displaying shift information within the Day_Action_Modal.
 *
 * Layout: 4px color border | emoji icon (vertically centered) | name (line 1) + time range (line 2)
 * Clickable — triggers onEditShift handler.
 * When orphaned (deleted shift), displays "[Deleted]" name and is disabled (not clickable).
 *
 * **Validates: Requirements 9.3, 6.9, 8.9**
 */
export const ShiftCard = ({ event, onEditShift }: ShiftCardProps) => {
  const isDisabled = event.isOrphaned;

  const handleClick = () => {
    if (!isDisabled) {
      onEditShift(event.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEditShift(event.id);
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
