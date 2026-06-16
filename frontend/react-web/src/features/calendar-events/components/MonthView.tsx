import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarEventDisplay } from '../models';

import { MonthNavigator } from './MonthNavigator';
import { YearNavigator } from './YearNavigator';

const MAX_VISIBLE_EMOJIS = 5;

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
  shiftBackgroundColor: string | null;
  emojis: string[];
  totalCount: number;
}

const getDayEventsInfo = (events: CalendarEventDisplay[]): DayEventsInfo => {
  const activeEvents = events.filter((e) => !e.isDeleted);

  // Sort: shifts first, then reminders
  const shifts = activeEvents.filter((e) => e.eventType === 'shift');
  const reminders = activeEvents.filter((e) => e.eventType === 'reminder');
  const ordered = [...shifts, ...reminders];

  // Determine container background from shift
  let shiftBackgroundColor: string | null = null;
  if (shifts.length > 0 && shifts[0].backgroundColor) {
    shiftBackgroundColor = shifts[0].backgroundColor;
  }

  const emojis = ordered.map((e) => e.icon);
  const totalCount = emojis.length;

  return { shiftBackgroundColor, emojis, totalCount };
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

  // Group events by day for quick lookup
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDisplay[]>();
    for (const event of events) {
      if (event.isDeleted) continue;
      const existing = map.get(event.day) ?? [];
      existing.push(event);
      map.set(event.day, existing);
    }
    return map;
  }, [events]);

  // Format the month/year label
  const monthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
    });
    return formatter.format(currentDate);
  }, [currentDate, locale]);

  return (
    <div className="flex flex-col w-full h-full" style={{ padding: 'var(--spacing-md, 16px)' }}>
      {/* Navigation header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
        <span
          className="text-base font-semibold capitalize"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {monthLabel}
        </span>
        <div className="flex items-center gap-2">
          <MonthNavigator />
          <YearNavigator />
        </div>
      </div>

      {/* Weekday headers */}
      <div
        className="grid grid-cols-7"
        role="row"
        style={{
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '8px',
          marginBottom: '8px',
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

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1" role="grid" aria-label={monthLabel}>
        {monthDays.map((day, index) => {
          const dayEvents = eventsByDay.get(day.isoDate) ?? [];
          const eventsInfo = getDayEventsInfo(dayEvents);

          return (
            <button
              key={index}
              type="button"
              className="flex flex-col items-center p-1"
              role="gridcell"
              aria-label={day.date.toLocaleDateString(locale, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              onClick={() => onDayClick(day.isoDate)}
              style={{
                minHeight: '64px',
                borderBottom: '1px solid var(--color-border)',
                opacity: day.isCurrentMonth ? 1 : 0.4,
                color: day.isCurrentMonth
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                borderBottomStyle: 'solid',
                borderBottomWidth: '1px',
                borderBottomColor: 'var(--color-border)',
              }}
            >
              {/* Day number */}
              <span
                className="flex items-center justify-center rounded-full"
                style={{
                  width: '28px',
                  height: '28px',
                  fontSize: '13px',
                  fontWeight: day.isToday ? 600 : 400,
                  lineHeight: 1,
                  ...(day.isToday
                    ? {
                        border: '2px solid var(--color-primary)',
                        color: 'var(--color-primary)',
                      }
                    : {}),
                }}
                aria-current={day.isToday ? 'date' : undefined}
              >
                {day.dayNumber}
              </span>

              {/* Event container */}
              {eventsInfo.totalCount > 0 && (
                <div
                  className="flex flex-wrap items-center justify-center gap-0.5 mt-1 rounded"
                  style={{
                    backgroundColor: eventsInfo.shiftBackgroundColor ?? 'transparent',
                    padding: '2px',
                    minHeight: '20px',
                    width: '100%',
                  }}
                >
                  {eventsInfo.emojis.slice(0, MAX_VISIBLE_EMOJIS).map((emoji, emojiIndex) => (
                    <span
                      key={emojiIndex}
                      aria-hidden="true"
                      style={{ fontSize: '12px', lineHeight: 1 }}
                    >
                      {emoji}
                    </span>
                  ))}
                  {eventsInfo.totalCount > MAX_VISIBLE_EMOJIS && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: eventsInfo.shiftBackgroundColor
                          ? '#ffffff'
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      +{eventsInfo.totalCount - MAX_VISIBLE_EMOJIS}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
