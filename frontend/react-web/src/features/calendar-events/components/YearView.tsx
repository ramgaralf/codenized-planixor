import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarEventDisplay } from '../models';

interface YearViewProps {
  events: CalendarEventDisplay[];
  currentDate: Date;
  onDayClick: (day: string) => void;
}

interface MiniMonthDay {
  dayNumber: number;
  isToday: boolean;
  dateISO: string;
}

const getFirstDayOfWeek = (locale: string): number => {
  // Monday = 1, Sunday = 0
  return locale.startsWith('es') ? 1 : 0;
};

const getLocalizedWeekdayInitials = (locale: string, firstDayOfWeek: number): string[] => {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const days: string[] = [];
  // Reference Monday: Jan 6, 2020
  const referenceMonday = new Date(2020, 0, 6);

  for (let i = 0; i < 7; i++) {
    const dayOffset = firstDayOfWeek === 1 ? i : (i + 6) % 7;
    const date = new Date(referenceMonday);
    date.setDate(referenceMonday.getDate() + dayOffset);
    days.push(formatter.format(date));
  }

  return days;
};

const getLocalizedMonthName = (year: number, month: number, locale: string): string => {
  const date = new Date(year, month, 1);
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
};

const formatISODate = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getMiniMonthGrid = (
  year: number,
  month: number,
  firstDayOfWeek: number,
  today: Date
): { leadingBlanks: number; days: MiniMonthDay[]; trailingBlanks: number } => {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const totalDaysInMonth = lastOfMonth.getDate();

  const startDayOfWeek = firstOfMonth.getDay();

  let leadingBlanks: number;
  if (firstDayOfWeek === 1) {
    leadingBlanks = (startDayOfWeek + 6) % 7;
  } else {
    leadingBlanks = startDayOfWeek;
  }

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const days: MiniMonthDay[] = [];
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const isToday = year === todayYear && month === todayMonth && day === todayDate;
    days.push({
      dayNumber: day,
      isToday,
      dateISO: formatISODate(year, month, day),
    });
  }

  const totalCells = leadingBlanks + totalDaysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const trailingBlanks = rows * 7 - totalCells;

  return { leadingBlanks, days, trailingBlanks };
};

/**
 * Determines the visual indicators for a day based on its events.
 */
interface DayIndicators {
  shiftColor: string | null;
  reminderEmoji: string | null;
}

/**
 * Advances an ISO date string by one day.
 */
const nextDayISO = (current: string): string => {
  const [y, m, d] = current.split('-').map(Number) as [number, number, number];
  const nextDate = new Date(y, m - 1, d + 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
};

/**
 * Adds an event to a Map-based day grouping.
 */
const addEventToDayMap = (map: Map<string, CalendarEventDisplay[]>, day: string, event: CalendarEventDisplay): void => {
  const existing = map.get(day);
  if (existing) {
    existing.push(event);
  } else {
    map.set(day, [event]);
  }
};

/**
 * Expands a reminder event to all days it spans within the given range, adding to map.
 */
const expandReminderToDayMap = (
  map: Map<string, CalendarEventDisplay[]>,
  event: CalendarEventDisplay,
  rangeStart: string,
  rangeEnd: string,
): void => {
  const eventStart = event.startDay < rangeStart ? rangeStart : event.startDay;
  const eventEnd = event.endDay > rangeEnd ? rangeEnd : event.endDay;
  let current = eventStart;
  while (current <= eventEnd) {
    addEventToDayMap(map, current, event);
    current = nextDayISO(current);
  }
};

/**
 * Groups events by day for Year view.
 * Shifts: only on startDay. Reminders: expanded to all spanned days within range.
 */
const buildEventsByDayMap = (
  events: CalendarEventDisplay[],
  rangeStart: string,
  rangeEnd: string,
): Map<string, CalendarEventDisplay[]> => {
  const map = new Map<string, CalendarEventDisplay[]>();
  for (const event of events) {
    if (event.startDay > rangeEnd || event.endDay < rangeStart) continue;
    if (event.eventType === 'shift') {
      if (event.startDay >= rangeStart && event.startDay <= rangeEnd) {
        addEventToDayMap(map, event.startDay, event);
      }
    } else {
      expandReminderToDayMap(map, event, rangeStart, rangeEnd);
    }
  }
  return map;
};

const getDayIndicators = (
  dayISO: string,
  eventsByDay: Map<string, CalendarEventDisplay[]>
): DayIndicators => {
  const dayEvents = eventsByDay.get(dayISO);

  if (!dayEvents || dayEvents.length === 0) {
    return { shiftColor: null, reminderEmoji: null };
  }

  const shiftEvent = dayEvents.find((e) => e.eventType === 'shift');
  const reminderEvents = dayEvents
    .filter((e) => e.eventType === 'reminder')
    .sort((a, b) => a.startTime - b.startTime);

  const shiftColor = shiftEvent ? shiftEvent.backgroundColor : null;
  const reminderEmoji = reminderEvents.length > 0 ? reminderEvents[0]?.icon ?? null : null;

  return { shiftColor, reminderEmoji };
};

interface MiniMonthProps {
  year: number;
  month: number;
  locale: string;
  firstDayOfWeek: number;
  weekdayInitials: string[];
  today: Date;
  eventsByDay: Map<string, CalendarEventDisplay[]>;
  onDayClick: (dayISO: string) => void;
  dataMonth?: number;
}

const MiniMonth = ({
  year,
  month,
  locale,
  firstDayOfWeek,
  weekdayInitials,
  today,
  eventsByDay,
  onDayClick,
  dataMonth,
}: MiniMonthProps) => {
  const monthName = useMemo(() => getLocalizedMonthName(year, month, locale), [year, month, locale]);
  const { leadingBlanks, days, trailingBlanks } = useMemo(
    () => getMiniMonthGrid(year, month, firstDayOfWeek, today),
    [year, month, firstDayOfWeek, today]
  );

  return (
    <div
      data-month={dataMonth}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {/* Month header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 0',
          marginBottom: '4px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          textTransform: 'capitalize',
          userSelect: 'none',
        }}
      >
        {monthName}
      </div>

      {/* Weekday initials row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          marginBottom: '2px',
        }}
      >
        {weekdayInitials.map((initial, index) => (
          <span
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              userSelect: 'none',
              lineHeight: '1',
              padding: '2px 0',
            }}
          >
            {initial}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}
      >
        {/* Leading blanks */}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div
            key={`lead-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '1',
            }}
          />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const indicators = getDayIndicators(day.dateISO, eventsByDay);

          return (
            <DayCell
              key={day.dayNumber}
              day={day}
              indicators={indicators}
              locale={locale}
              year={year}
              month={month}
              onDayClick={onDayClick}
            />
          );
        })}

        {/* Trailing blanks */}
        {Array.from({ length: trailingBlanks }, (_, i) => (
          <div
            key={`trail-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '1',
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface DayCellProps {
  day: MiniMonthDay;
  indicators: DayIndicators;
  locale: string;
  year: number;
  month: number;
  onDayClick: (dayISO: string) => void;
}

const DayCell = ({ day, indicators, locale, year, month, onDayClick }: DayCellProps) => {
  const dateLabel = useMemo(() => {
    const date = new Date(year, month, day.dayNumber);
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [year, month, day.dayNumber, locale]);

  const hasShift = indicators.shiftColor !== null;
  const hasReminder = indicators.reminderEmoji !== null;

  // Border: indicates reminder exists — thicker, black in light / white in dark
  const borderStyle = hasReminder ? '3px solid var(--color-text-primary)' : 'none';
  // Fill: shift color if shift exists, transparent otherwise
  const fillColor = hasShift ? indicators.shiftColor! : 'transparent';
  // Text color: white on colored fill, primary on transparent
  const textColor = hasShift ? '#ffffff' : 'var(--color-text-primary)';

  return (
    <button
      type="button"
      onClick={() => onDayClick(day.dateISO)}
      aria-label={dateLabel}
      aria-current={day.isToday ? 'date' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minWidth: '24px',
        minHeight: '24px',
        aspectRatio: '1',
        fontSize: day.isToday ? '13px' : '11px',
        fontWeight: day.isToday ? 700 : 400,
        color: textColor,
        border: borderStyle,
        backgroundColor: fillColor,
        borderRadius: '50%',
        cursor: 'pointer',
        padding: 0,
        lineHeight: '1',
      }}
    >
      {/* Day number */}
      <span style={{ position: 'relative', zIndex: 1 }}>{day.dayNumber}</span>
    </button>
  );
};

/**
 * YearView — displays all 12 months for the current year with event indicators.
 *
 * Features:
 * - 12 months grid (4×3 desktop, 3×4 tablet, 2×6 mobile)
 * - Current day highlighted with primary-blue
 * - Day indicators: colored circle for shifts, emoji for reminders, both if both
 * - YearNavigator for ±1 year
 * - Day click navigates to event detail page
 * - Error handling with retry on navigation failure
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
 */
export const YearView = ({ events, currentDate, onDayClick }: YearViewProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const today = useMemo(() => new Date(), []);

  const [error, setError] = useState<string | null>(null);
  const [failedDay, setFailedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const gridRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current month when displaying current year
  useEffect(() => {
    if (year === today.getFullYear() && gridRef.current) {
      const currentMonth = today.getMonth(); // 0-based
      const monthElements = gridRef.current.querySelectorAll('[data-month]');
      const target = monthElements[currentMonth];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [year, today]);

  const firstDayOfWeek = useMemo(() => getFirstDayOfWeek(locale), [locale]);
  const weekdayInitials = useMemo(
    () => getLocalizedWeekdayInitials(locale, firstDayOfWeek),
    [locale, firstDayOfWeek]
  );

  // Build events-by-day lookup map for O(1) access per day
  const eventsByDay = useMemo(
    () => buildEventsByDayMap(events, `${year}-01-01`, `${year}-12-31`),
    [events, year],
  );

  const handleDayClick = useCallback(
    (dayISO: string) => {
      try {
        setError(null);
        setFailedDay(null);
        onDayClick(dayISO);
      } catch (err) {
        console.error('Failed to navigate to day events:', err);
        setError(t('calendar.yearView.navigationError', { defaultValue: 'Failed to navigate. Please try again.' }));
        setFailedDay(dayISO);
      }
    },
    [onDayClick, t]
  );

  const handleRetry = useCallback(() => {
    if (failedDay) {
      handleDayClick(failedDay);
    }
  }, [failedDay, handleDayClick]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Error message with retry */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 shrink-0"
          style={{
            padding: '8px 12px',
            marginBottom: '8px',
            backgroundColor: 'var(--color-error)',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              border: '1px solid #ffffff',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('common.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      )}

      {/* Month grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto"
        role="grid"
        aria-label={t('calendar.yearView.label', { defaultValue: 'Year view', year })}
      >
        <div
          className="grid grid-cols-2 gap-4 w-full p-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {Array.from({ length: 12 }, (_, monthIndex) => (
            <MiniMonth
              key={monthIndex}
              year={year}
              month={monthIndex}
              locale={locale}
              firstDayOfWeek={firstDayOfWeek}
              weekdayInitials={weekdayInitials}
              today={today}
              eventsByDay={eventsByDay}
              onDayClick={handleDayClick}
              dataMonth={monthIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
