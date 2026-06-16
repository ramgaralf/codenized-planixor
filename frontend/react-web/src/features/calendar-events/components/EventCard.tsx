import type { CalendarEventDisplay } from '../models';
import { formatTimeFromMinutes, formatDuration } from '../utils';

interface EventCardProps {
  event: CalendarEventDisplay;
  onClick: (event: CalendarEventDisplay) => void;
  /** Height in pixels (computed from duration) */
  height: number;
}

/**
 * EventCard — renders a calendar event card for Day view.
 *
 * Shows: icon + name (line 1), time range + duration (line 2), notes (line 3).
 * Background uses the event's backgroundColor.
 *
 * **Validates: Requirements 3.2, 3.5**
 */
export const EventCard = ({ event, onClick, height }: EventCardProps) => {
  const startLabel = formatTimeFromMinutes(event.startTime);
  const endLabel = formatTimeFromMinutes(event.endTime);
  const durationLabel = formatDuration(event.startTime, event.endTime);

  const handleClick = () => {
    onClick(event);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(event);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${event.name}, ${startLabel} – ${endLabel}`}
      style={{
        backgroundColor: event.backgroundColor,
        borderRadius: '8px',
        padding: '6px 8px',
        height: `${Math.max(height - 2, 20)}px`,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        boxSizing: 'border-box',
      }}
    >
      {/* Line 1: icon + name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          minWidth: 0,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '14px', flexShrink: 0 }}>
          {event.icon}
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {event.name}
        </span>
      </div>

      {/* Line 2: time range + duration */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.85)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {startLabel} – {endLabel} · {durationLabel}
      </div>

      {/* Line 3: notes (if space allows and notes exist) */}
      {event.notes && height >= 60 && (
        <div
          style={{
            fontSize: '11px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.7)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {event.notes}
        </div>
      )}
    </div>
  );
};
