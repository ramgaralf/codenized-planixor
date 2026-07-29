import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarEventDisplay } from '../models';

const MAX_VISIBLE_EMOJIS = 3;
const MAX_WITH_OVERFLOW = 2;

interface MonthDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  /** ISO date string YYYY-MM-DD */
  isoDate: string;
}

const formatISODate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthGrid = (currentDate: Date): MonthDay[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Week starts on Monday (ISO)
  const startDayOfWeek = firstOfMonth.getDay(); // 0=Sun, 1=Mon
  const leadingDays = (startDayOfWeek + 6) % 7; // Convert to Monday-based offset

  const totalDaysInMonth = lastOfMonth.getDate();
  const totalCells = leadingDays + totalDaysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const totalGridCells = rows * 7;

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const days: MonthDay[] = [];

  for (let i = 0; i < totalGridCells; i++) {
    const dayOffset = i - leadingDays;
    const date = new Date(year, month, 1 + dayOffset);
    const isCurrentMonth = date.getMonth() === month && date.getFullYear() === year;
    const isToday =
      date.getFullYear() === todayYear &&
      date.getMonth() === todayMonth &&
      date.getDate() === todayDate;

    days.push({
      date,
      dayNumber: date.getDate(),
      isCurrentMonth,
      isToday,
      isoDate: formatISODate(date),
    });
  }

  return days;
};

const getWeekdayHeaders = (locale: string): string[] => {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const days: string[] = [];
  // Reference Monday: Jan 6, 2020
  const referenceMonday = new Date(2020, 0, 6);

  for (let i = 0; i < 7; i++) {
    const date = new Date(referenceMonday);
    date.setDate(referenceMonday.getDate() + i);
    days.push(formatter.format(date));
  }

  return days;
};

interface DayEventsInfo {
  shiftColor: string | null;
  emojis: string[];
  totalCount: number;
}

const getDayEventsInfo = (events: CalendarEventDisplay[]): DayEventsInfo => {
  const activeEvents = events.filter((e) => !e.isDeleted);

  // Sort: shifts first, then reminders
  const shifts = activeEvents.filter((e) => e.eventType === 'shift');
  const reminders = activeEvents.filter((e) => e.eventType === 'reminder');
  const ordered = [...shifts, ...reminders];

  // Determine shift color for the left strip
  let shiftColor: string | null = null;
  if (shifts.length > 0 && shifts[0]?.backgroundColor) {
    shiftColor = shifts[0].backgroundColor;
  }

  const emojis = ordered.map((e) => e.icon);
  const totalCount = emojis.length;

  return { shiftColor, emojis, totalCount };
};

/**
 * Advances an ISO date string (YYYY-MM-DD) by one day.
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
 * Adds an event to the map for a given day key.
 */
const addEventToMap = (map: Map<string, CalendarEventDisplay[]>, day: string, event: CalendarEventDisplay): void => {
  const existing = map.get(day) ?? [];
  existing.push(event);
  map.set(day, existing);
};

/**
 * Expands a reminder event to all days it spans within the given range, adding it to the map.
 */
const expandReminderToDays = (
  map: Map<string, CalendarEventDisplay[]>,
  event: CalendarEventDisplay,
  rangeStart: string,
  rangeEnd: string,
): void => {
  const eventStart = event.startDay < rangeStart ? rangeStart : event.startDay;
  const eventEnd = event.endDay > rangeEnd ? rangeEnd : event.endDay;
  let current = eventStart;
  while (current <= eventEnd) {
    addEventToMap(map, current, event);
    current = nextDayISO(current);
  }
};

/**
 * Groups events by day for the month grid.
 * Shifts: only on startDay. Reminders: expanded to all spanned days within range.
 */
const buildEventsByDay = (
  events: CalendarEventDisplay[],
  rangeStart: string,
  rangeEnd: string,
): Map<string, CalendarEventDisplay[]> => {
  const map = new Map<string, CalendarEventDisplay[]>();
  for (const event of events) {
    if (event.isDeleted) continue;
    if (event.startDay > rangeEnd || event.endDay < rangeStart) continue;

    if (event.eventType === 'shift') {
      if (event.startDay >= rangeStart && event.startDay <= rangeEnd) {
        addEventToMap(map, event.startDay, event);
      }
    } else {
      expandReminderToDays(map, event, rangeStart, rangeEnd);
    }
  }
  return map;
};

const getCellTextColor = (hasShift: boolean, isCurrentMonth: boolean): string => {
  if (hasShift) return '#ffffff';
  if (isCurrentMonth) return 'var(--color-text-primary)';
  return 'var(--color-text-secondary)';
};

interface MonthViewProps {
  events: CalendarEventDisplay[];
  currentDate: Date;
  onDayClick: (day: string) => void;
}

export const MonthView = ({ events, currentDate, onDayClick }: MonthViewProps) => {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const weekdayHeaders = useMemo(() => getWeekdayHeaders(locale), [locale]);

  const monthDays = useMemo(() => getMonthGrid(currentDate), [currentDate]);

  // Compute the displayed month range for intersection filtering
  const monthRange = useMemo(() => {
    const firstDay = monthDays[0];
    const lastDay = monthDays[monthDays.length - 1];
    return {
      start: firstDay?.isoDate ?? '',
      end: lastDay?.isoDate ?? '',
    };
  }, [monthDays]);

  // Group events by each day they span within the displayed month grid
  const eventsByDay = useMemo(
    () => buildEventsByDay(events, monthRange.start, monthRange.end),
    [events, monthRange],
  );

  const rowCount = Math.ceil(monthDays.length / 7);

  return (
    <div className="flex flex-col w-full h-full" style={{ padding: '12px', minHeight: 0 }}>
      {/* Weekday headers */}
      <div
        className="grid grid-cols-7"
        role="row"
        style={{
          paddingBottom: '8px',
          marginBottom: '4px',
          gap: '3px',
        }}
      >
        {weekdayHeaders.map((day, index) => (
          <div
            key={index}
            className="flex items-center justify-center"
            role="columnheader"
            aria-label={day}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              textTransform: 'capitalize',
              userSelect: 'none',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid — equal row heights, mini-cards with gap */}
      <div
        className="grid grid-cols-7 flex-1"
        role="grid"
        aria-label="month-grid"
        style={{
          gridTemplateRows: `repeat(${rowCount}, 1fr)`,
          gap: '3px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {monthDays.map((day, index) => {
          const dayEvents = eventsByDay.get(day.isoDate) ?? [];
          const eventsInfo = getDayEventsInfo(dayEvents);
          const hasShift = eventsInfo.shiftColor !== null;

          const cellTextColor = getCellTextColor(hasShift, day.isCurrentMonth);

          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-label={day.date.toLocaleDateString(locale, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              onClick={() => onDayClick(day.isoDate)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '2px 4px',
                opacity: day.isCurrentMonth ? 1 : 0.35,
                color: cellTextColor,
                cursor: 'pointer',
                background: hasShift ? eventsInfo.shiftColor! : 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                overflow: 'hidden',
                minHeight: 0,
              }}
            >
              {/* Day number */}
              <span
                className="flex items-center justify-center"
                style={{
                  width: day.isToday ? '20px' : '100%',
                  height: day.isToday ? '20px' : 'auto',
                  padding: day.isToday ? '0' : '2px 0',
                  fontSize: '11px',
                  fontWeight: day.isToday ? 600 : 400,
                  lineHeight: 1,
                  backgroundColor: day.isToday ? 'var(--color-primary)' : 'transparent',
                  color: day.isToday ? '#ffffff' : undefined,
                  borderRadius: day.isToday ? '50%' : '0',
                }}
                aria-current={day.isToday ? 'date' : undefined}
              >
                {day.dayNumber}
              </span>

              {/* Event emojis — one per line, vertical stack */}
              {eventsInfo.totalCount > 0 && (
                <div
                  className="flex flex-col items-center"
                  style={{
                    width: '100%',
                    flex: 1,
                    overflow: 'hidden',
                    gap: '1px',
                    marginTop: '2px',
                  }}
                >
                  {(() => {
                    const showOverflow = eventsInfo.totalCount > MAX_VISIBLE_EMOJIS;
                    const visibleCount = showOverflow ? MAX_WITH_OVERFLOW : eventsInfo.totalCount;
                    const hiddenCount = eventsInfo.totalCount - visibleCount;
                    return (
                      <>
                        {eventsInfo.emojis.slice(0, visibleCount).map((emoji, emojiIndex) => (
                          <span
                            key={emojiIndex}
                            aria-hidden="true"
                            style={{ fontSize: '13px', lineHeight: 1.2 }}
                          >
                            {emoji}
                          </span>
                        ))}
                        {showOverflow && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: hasShift ? '#ffffff' : 'var(--color-text-secondary)',
                              lineHeight: 1,
                            }}
                          >
                            +{hiddenCount}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
