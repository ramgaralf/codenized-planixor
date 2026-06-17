import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarEventDisplay } from '@features/calendar-events/models';
import { getDateRangeForWeek } from '@features/calendar-events/utils';

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

  const { start, end } = useMemo(
    () => getDateRangeForWeek(toISODateString(currentDate)),
    [currentDate]
  );

  // Filter: isDeleted === false AND [startDay, endDay] intersects [start, end]
  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          !event.isDeleted && event.startDay <= end && event.endDay >= start
      ),
    [events, start, end]
  );

  // Group events by each day they span within the week, sorted by startTime
  // Shift events: only shown on their startDay (even if multi-day)
  // Reminder events: shown on all days they span
  const eventsByDay = useMemo(
    () => groupEventsByDay(filteredEvents, start, end),
    [filteredEvents, start, end],
  );

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
 * WeekEventCard — minimal event card for the week view.
 *
 * Layout:
 * - Line 1: Icon (centered horizontally)
 * - Line 2: Name (centered, truncated with ellipsis)
 * Nothing else.
 */
const WeekEventCard = ({ event, onClick }: WeekEventCardProps) => {
  return (
    <button
      type="button"
      className="w-full cursor-pointer"
      style={{ backgroundColor: event.backgroundColor, padding: '6px 8px', borderRadius: '6px', overflow: 'hidden', textAlign: 'center' }}
      onClick={() => onClick(event)}
      aria-label={event.name}
    >
      {/* Line 1: icon centered */}
      <div style={{ fontSize: '18px', lineHeight: 1 }}>
        <span aria-hidden="true">{event.icon}</span>
      </div>
      {/* Line 2: name centered */}
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
        {event.name}
      </div>
    </button>
  );
};
