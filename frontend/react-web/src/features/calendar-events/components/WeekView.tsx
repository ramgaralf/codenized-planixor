import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarEventDisplay } from '@features/calendar-events/models';
import { formatDuration, formatTimeFromMinutes, getDateRangeForWeek } from '@features/calendar-events/utils';

const MAX_NAME_LENGTH = 25;

/**
 * Returns a formatted ISO date string (YYYY-MM-DD) from a Date object.
 */
const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns the Monday–Sunday dates for the week containing currentDate.
 */
const getWeekDates = (currentDate: Date): Date[] => {
  const d = new Date(currentDate);
  const dayOfWeek = d.getDay();
  // Convert to Monday-based offset: Monday=0 ... Sunday=6
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
};

/**
 * Returns the abbreviated day name for a given Date, localized.
 */
const getLocalizedDayName = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
};

/**
 * Checks if two dates are the same calendar day.
 */
const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

/**
 * Truncates text to maxLength characters with ellipsis if needed.
 */
const truncateName = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
};

interface WeekViewProps {
  events: CalendarEventDisplay[];
  currentDate: Date;
  onEventClick: (event: CalendarEventDisplay) => void;
}

/**
 * WeekView — displays 7 day blocks (Monday–Sunday) with event cards.
 *
 * Each day column shows a header with day name + date (current day highlighted),
 * and EventCards ordered by startTime ascending. Filters events to only show
 * non-deleted events within the Mon–Sun date range.
 */
export const WeekView = ({ events, currentDate, onEventClick }: WeekViewProps) => {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const today = useMemo(() => new Date(), []);
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const { start, end } = useMemo(
    () => getDateRangeForWeek(toISODateString(currentDate)),
    [currentDate]
  );

  // Filter: isDeleted === false AND day within Mon–Sun range
  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          !event.isDeleted && event.day >= start && event.day <= end
      ),
    [events, start, end]
  );

  // Group events by day and sort by startTime
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEventDisplay[]> = {};
    for (const event of filteredEvents) {
      if (!map[event.day]) {
        map[event.day] = [];
      }
      map[event.day]!.push(event);
    }
    // Sort each day's events by startTime
    for (const day of Object.keys(map)) {
      map[day]!.sort((a, b) => a.startTime - b.startTime);
    }
    return map;
  }, [filteredEvents]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="grid grid-cols-7 gap-0 flex-1 overflow-hidden">
        {weekDates.map((date) => {
          const dateStr = toISODateString(date);
          const isToday = isSameDay(date, today);
          const dayEvents = eventsByDay[dateStr] ?? [];

          return (
            <div
              key={dateStr}
              className="flex flex-col overflow-hidden"
              style={{ borderRight: '1px solid var(--color-border)' }}
            >
              {/* Day header */}
              <div
                className="flex flex-col items-center justify-center py-2 px-1"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: isToday ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isToday ? '#ffffff' : 'var(--color-text-primary)',
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{
                    color: isToday ? '#ffffff' : 'var(--color-text-secondary)',
                  }}
                >
                  {getLocalizedDayName(date, locale)}
                </span>
                <span className="text-sm font-semibold">
                  {date.getDate()}
                </span>
              </div>

              {/* Events container */}
              <div
                className="flex-1 overflow-y-auto flex flex-col"
                style={{ padding: 0, gap: '1px' }}
              >
                {dayEvents.map((event) => (
                  <WeekEventCard
                    key={event.id}
                    event={event}
                    onClick={onEventClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface WeekEventCardProps {
  event: CalendarEventDisplay;
  onClick: (event: CalendarEventDisplay) => void;
}

/**
 * WeekEventCard — compact event card for the week view.
 *
 * Line 1: icon + name (📝 appended if notes, truncated at 25 chars with ellipsis)
 * Line 2: startTime HH:mm – endTime HH:mm + total hours
 */
const WeekEventCard = ({ event, onClick }: WeekEventCardProps) => {
  const nameWithNotes = event.name;
  const displayName = truncateName(nameWithNotes, MAX_NAME_LENGTH);

  const timeRange = `${formatTimeFromMinutes(event.startTime)} – ${formatTimeFromMinutes(event.endTime)}`;
  const duration = formatDuration(event.startTime, event.endTime);

  return (
    <button
      type="button"
      className="w-full text-left cursor-pointer"
      style={{ backgroundColor: event.backgroundColor, padding: '8px 10px', borderRadius: '6px' }}
      onClick={() => onClick(event)}
      aria-label={`${event.name}, ${timeRange}`}
    >
      {/* Line 1: icon + name */}
      <div className="text-xs font-medium text-white truncate">
        <span aria-hidden="true">{event.icon}</span>{' '}
        {displayName}
      </div>
      {/* Line 2: time range */}
      <div className="text-xs text-white opacity-90">
        {timeRange}
      </div>
      {/* Line 3: total hours */}
      <div className="text-xs text-white opacity-90">
        {duration}
      </div>
      {/* Line 4: notes (max 2 lines with ellipsis) */}
      {event.notes && (
        <div
          className="text-xs text-white opacity-75"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginTop: '2px',
          }}
        >
          {event.notes}
        </div>
      )}
    </button>
  );
};
