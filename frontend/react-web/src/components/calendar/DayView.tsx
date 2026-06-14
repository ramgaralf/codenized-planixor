import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCalendarStore } from '@/stores/calendarStore';

import styles from './DayView.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const getCurrentTimeTopPercent = (): number => {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  return (totalMinutes / (24 * 60)) * 100;
};

export const DayView = () => {
  const { t, i18n } = useTranslation();
  const currentDate = useCalendarStore((state) => state.currentDate);

  const locale = i18n.language;
  const isToday = isSameDay(currentDate, new Date());

  const hourLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });

    return HOURS.map((hour) => {
      const date = new Date(2000, 0, 1, hour, 0);
      return formatter.format(date);
    });
  }, [locale]);

  const timeIndicatorTop = isToday ? getCurrentTimeTopPercent() : null;

  return (
    <div className={styles.dayView} role="grid" aria-label={t('views.day')}>
      <div className={styles.timeline}>
        {HOURS.map((hour) => (
          <div key={hour} className={styles.hourRow} role="row">
            <span className={styles.hourLabel} role="rowheader" aria-label={hourLabels[hour]}>
              {hourLabels[hour]}
            </span>
            <div className={styles.hourSlot} role="gridcell" aria-label={hourLabels[hour]} />
          </div>
        ))}

        {timeIndicatorTop !== null && (
          <div
            className={styles.currentTimeIndicator}
            style={{ top: `${timeIndicatorTop}%` }}
            aria-label={t('calendar.currentTime')}
            role="presentation"
          />
        )}
      </div>

    </div>
  );
};
