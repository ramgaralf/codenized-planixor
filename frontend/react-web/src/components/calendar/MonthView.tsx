import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCalendarStore } from '@/stores/calendarStore';

import styles from './MonthView.module.css';

const getFirstDayOfWeek = (locale: string): number => {
  // Monday = 1, Sunday = 0
  // Spanish locale starts on Monday, English on Sunday
  return locale.startsWith('es') ? 1 : 0;
};

const getLocalizedWeekdayAbbreviations = (locale: string, firstDayOfWeek: number): string[] => {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const days: string[] = [];

  // Use a known Monday (Jan 6, 2020) as reference
  const referenceMonday = new Date(2020, 0, 6);

  for (let i = 0; i < 7; i++) {
    const dayOffset = (firstDayOfWeek === 1) ? i : (i + 6) % 7;
    const date = new Date(referenceMonday);
    date.setDate(referenceMonday.getDate() + dayOffset);
    days.push(formatter.format(date));
  }

  return days;
};

interface MonthDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const getMonthGrid = (currentDate: Date, firstDayOfWeek: number): MonthDay[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Determine the day of the week for the first of the month
  const startDayOfWeek = firstOfMonth.getDay(); // 0=Sun, 1=Mon, ...

  // Calculate leading days from previous month
  let leadingDays: number;
  if (firstDayOfWeek === 1) {
    // Week starts on Monday
    leadingDays = (startDayOfWeek + 6) % 7;
  } else {
    // Week starts on Sunday
    leadingDays = startDayOfWeek;
  }

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
    });
  }

  return days;
};

export const MonthView = () => {
  const { t, i18n } = useTranslation();
  const currentDate = useCalendarStore((state) => state.currentDate);
  const locale = i18n.language;

  const firstDayOfWeek = useMemo(() => getFirstDayOfWeek(locale), [locale]);

  const weekdayHeaders = useMemo(
    () => getLocalizedWeekdayAbbreviations(locale, firstDayOfWeek),
    [locale, firstDayOfWeek]
  );

  const monthDays = useMemo(
    () => getMonthGrid(currentDate, firstDayOfWeek),
    [currentDate, firstDayOfWeek]
  );

  return (
    <div className={styles.monthView} role="grid" aria-label={t('views.month')}>
      <div className={styles.weekdayHeaders} role="row">
        {weekdayHeaders.map((day, index) => (
          <div
            key={index}
            className={styles.weekdayHeader}
            role="columnheader"
            aria-label={day}
          >
            {day}
          </div>
        ))}
      </div>

      <div className={styles.dayGrid}>
        {monthDays.map((day, index) => (
          <div
            key={index}
            className={`${styles.dayCell} ${!day.isCurrentMonth ? styles.adjacentMonth : ''}`}
            role="gridcell"
            aria-label={day.date.toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          >
            <span
              className={`${styles.dayNumber} ${day.isToday ? styles.today : ''}`}
              aria-current={day.isToday ? 'date' : undefined}
            >
              {day.dayNumber}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
