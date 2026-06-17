import type { CalendarEventDisplay } from '../models';
import { formatTimeFromMinutes } from '../utils';

interface EventCardProps {
  event: CalendarEventDisplay;
  onClick: (event: CalendarEventDisplay) => void;
  /** Height in pixels (computed from duration) */
  height: number;
}

/**
 * Formats totalHours (stored in minutes) as "Xh Ym".
 */
const formatTotalHours = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

/**
 * EventCard — renders a calendar event card for Day and Week views.
 *
 * Layout:
 * - Line 1: Icon (larger) + Name
 * - Line 2: startDay + startTime
 * - Line 3: endDay + endTime
 * - Line 4: Total hours (from stored totalHours, not computed)
 * - Line 5: Notes (max 2 lines, ellipsis on overflow, only if present)
 *
 * If the card height causes overflow, bottom lines are hidden via overflow: hidden.
 *
 * **Validates: Requirements 3.2, 3.5**
 */
export const EventCard = ({ event, onClick, height }: EventCardProps) => {
  const startTimeLabel = formatTimeFromMinutes(event.startTime);
  const endTimeLabel = formatTimeFromMinutes(event.endTime);
  const totalHoursLabel = formatTotalHours(event.totalHours);

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
      aria-label={`${event.name}, ${event.startDay} ${startTimeLabel} – ${event.endDay} ${endTimeLabel}`}
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
      {/* Line 1: icon (50% larger) + name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          minWidth: 0,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1 }}>
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

      {/* Line 2: startDay + startTime */}
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
        {event.startDay} {startTimeLabel}
      </div>

      {/* Line 3: endDay + endTime */}
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
        {event.endDay} {endTimeLabel}
      </div>

      {/* Line 4: totalHours (stored value, not computed) */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.9)',
          whiteSpace: 'nowrap',
        }}
      >
        {totalHoursLabel}
      </div>

      {/* Line 5: notes (only if present, max 2 lines with ellipsis) */}
      {event.notes && (
        <div
          style={{
            fontSize: '11px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.7)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {event.notes}
        </div>
      )}
    </div>
  );
};
