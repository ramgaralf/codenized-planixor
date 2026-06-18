import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarEventDisplay } from '@features/calendar-events/models';
import { formatTimeFromMinutes, getDateRangeForWeek } from '@features/calendar-events/utils';

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
 * Advances an ISO date string by one day.
 */
const nextDayISO = (current: string): string => {
  const [y, m, d] = current.split('-').map(Number) as [number, number, number];
  const nextDate = new Date(y, m - 1, d + 1);
  const ny = nextDate.getFullYear();
  const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const nd = String(nextDate.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
};

/**
 * Adds an event to the map for a specific day.
 */
const addEventToDay = (map: Record<string, CalendarEventDisplay[]>, day: string, event: CalendarEventDisplay): void => {
  if (!map[day]) {
    map[day] = [];
  }
  map[day]!.push(event);
};

/**
 * Expands a reminder event to all days it spans within the given range.
 */
const expandReminderToDays = (
  map: Record<string, CalendarEventDisplay[]>,
  event: CalendarEventDisplay,
  rangeStart: string,
  rangeEnd: string,
): void => {
  const eventStart = event.startDay < rangeStart ? rangeStart : event.startDay;
  const eventEnd = event.endDay > rangeEnd ? rangeEnd : event.endDay;
  let current = eventStart;
  while (current <= eventEnd) {
    addEventToDay(map, current, event);
    current = nextDayISO(current);
  }
};

/**
 * Groups events by day for Week/Month/Year views.
 * Shifts: only on startDay. Reminders: expanded to all spanned days.
 */
const groupEventsByDay = (
  events: CalendarEventDisplay[],
  rangeStart: string,
  rangeEnd: string,
): Record<string, CalendarEventDisplay[]> => {
  const map: Record<string, CalendarEventDisplay[]> = {};
  for (const event of events) {
    if (event.eventType === 'shift') {
      if (event.startDay >= rangeStart && event.startDay <= rangeEnd) {
        addEventToDay(map, event.startDay, event);
      }
    } else {
      expandReminderToDays(map, event, rangeStart, rangeEnd);
    }
  }
  for (const day of Object.keys(map)) {
    map[day]!.sort((a, b) => a.startTime - b.startTime);
  }
  return map;
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

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { start, end } = useMemo(
    () => getDateRangeForWeek(toISODateString(currentDate)),
    [currentDate]
  );

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          !event.isDeleted && event.startDay <= end && event.endDay >= start
      ),
    [events, start, end]
  );

  const eventsByDay = useMemo(
    () => groupEventsByDay(filteredEvents, start, end),
    [filteredEvents, start, end],
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {weekDates.map((date) => {
          const dateStr = toISODateString(date);
          const isToday = isSameDay(date, today);
          const dayEvents = eventsByDay[dateStr] ?? [];
          const dayNameFull = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);

          return (
            <div key={dateStr} style={{ borderBottom: '1px solid var(--color-border)' }}>
              {/* Day header */}
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                  color: isToday ? '#ffffff' : 'var(--color-text-primary)',
                  borderRadius: isToday ? '8px' : '0',
                  margin: isToday ? '4px 8px' : '0',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                  {dayNameFull} {date.getDate()}
                </span>
              </div>

              {/* Events with timeline */}
              {dayEvents.length > 0 && (
                <div style={{ padding: '4px 12px 8px' }}>
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}
                    >
                      {/* Time label */}
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', minWidth: '40px', paddingTop: '6px' }}>
                        {formatTimeFromMinutes(event.startTime)}
                      </span>
                      {/* Vertical line */}
                      <div style={{ width: '2px', minHeight: '40px', backgroundColor: 'var(--color-border)', borderRadius: '1px', flexShrink: 0 }} />
                      {/* Event card */}
                      <button
                        type="button"
                        onClick={() => onEventClick(event)}
                        style={{
                          flex: 1,
                          backgroundColor: event.backgroundColor,
                          borderRadius: '6px',
                          padding: '6px 8px',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        aria-label={event.name}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '16px' }} aria-hidden="true">{event.icon}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
                          {event.startDay} {formatTimeFromMinutes(event.startTime)} – {event.endDay} {formatTimeFromMinutes(event.endTime)}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop: 7-column grid
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
                style={{ padding: '2px', gap: '2px' }}
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
 * Formats totalHours (stored in minutes) as "Xh Ym".
 */
const formatTotalHoursLabel = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

/**
 * WeekEventCard — event card for the desktop week view.
 *
 * Shows the same content as Day view:
 * - Line 1: Icon (18px) + Name
 * - Line 2: startDay + startTime
 * - Line 3: endDay + endTime
 * - Line 4: Total hours (stored value)
 * - Line 5: Notes (max 2 lines, ellipsis, only if present)
 * Overflow hidden hides bottom lines.
 */
const WeekEventCard = ({ event, onClick }: WeekEventCardProps) => {
  const startTimeLabel = formatTimeFromMinutes(event.startTime);
  const endTimeLabel = formatTimeFromMinutes(event.endTime);
  const totalHoursLabel = formatTotalHoursLabel(event.totalHours);

  return (
    <button
      type="button"
      style={{
        width: '100%',
        backgroundColor: event.backgroundColor,
        padding: '6px 8px',
        borderRadius: '6px',
        overflow: 'hidden',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
      onClick={() => onClick(event)}
      aria-label={event.name}
    >
      {/* Line 1: icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
        <span aria-hidden="true" style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1 }}>{event.icon}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {event.name}
        </span>
      </div>
      {/* Line 2: startDay + startTime */}
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
        {event.startDay} {startTimeLabel}
      </div>
      {/* Line 3: endDay + endTime */}
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
        {event.endDay} {endTimeLabel}
      </div>
      {/* Line 4: totalHours */}
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
        {totalHoursLabel}
      </div>
      {/* Line 5: notes (max 2 lines with ellipsis, only if present) */}
      {event.notes && (
        <div
          style={{
            fontSize: '11px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.7)',
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
