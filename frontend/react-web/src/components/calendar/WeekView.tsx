import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCalendarStore } from '@/stores/calendarStore';

import styles from './WeekView.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getFirstDayOfWeek = (locale: string): number => {
  return locale === 'en' ? 0 : 1;
};

const getWeekDates = (currentDate: Date, firstDayOfWeek: number): Date[] => {
  const date = new Date(currentDate);
  const dayOfWeek = date.getDay();
  const diff = (dayOfWeek - firstDayOfWeek + 7) % 7;
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - diff);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });
};

const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const formatHourLabel = (hour: number, locale: string): string => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale === 'en',
  }).format(date);
};

const formatDayName = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
};

export const WeekView = () => {
  const { t, i18n } = useTranslation();
  const currentDate = useCalendarStore((state) => state.currentDate);
  const locale = i18n.language;
  const today = useMemo(() => new Date(), []);

  const firstDayOfWeek = useMemo(() => getFirstDayOfWeek(locale), [locale]);

  const weekDates = useMemo(
    () => getWeekDates(new Date(currentDate), firstDayOfWeek),
    [currentDate, firstDayOfWeek]
  );

  return (
    <div className={styles.weekView} role="grid" aria-label={t('views.week')}>
      <div className={styles.header} role="row">
        <div className={styles.headerGutter} role="columnheader" aria-label="" />
        {weekDates.map((date) => {
          const isToday = isSameDay(date, today);
          return (
            <div
              key={date.toISOString()}
              className={styles.dayHeader}
              role="columnheader"
              aria-label={new Intl.DateTimeFormat(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }).format(date)}
            >
              <span className={styles.dayName}>{formatDayName(date, locale)}</span>
              <span
                className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}
              >
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.body}>
        {HOURS.map((hour) => (
          <div key={hour} className={styles.hourRow} role="row">
            <div className={styles.hourLabel} role="rowheader" aria-label={formatHourLabel(hour, locale)}>
              {formatHourLabel(hour, locale)}
            </div>
            {weekDates.map((date) => (
              <div
                key={date.toISOString()}
                className={styles.dayCell}
                role="gridcell"
                aria-label={`${formatDayName(date, locale)} ${date.getDate()}, ${formatHourLabel(hour, locale)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
