import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useCalendarStore } from '@/stores/calendarStore';

import styles from './DateNavigator.module.css';

const getISOWeekNumber = (date: Date): number => {
  const target = new Date(date.getTime());
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const jan4 = new Date(target.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((target.getTime() - jan4.getTime()) / 86400000 -
        3 +
        ((jan4.getDay() + 6) % 7)) /
        7
    )
  );
};

const formatDateLabel = (
  date: Date,
  activeView: 'day' | 'week' | 'month' | 'year',
  locale: string
): string => {
  switch (activeView) {
    case 'day': {
      const formatter = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return formatter.format(date);
    }
    case 'week': {
      return '';
    }
    case 'month': {
      const formatter = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
      });
      return formatter.format(date);
    }
    case 'year': {
      const formatter = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
      });
      return formatter.format(date);
    }
  }
};

export const DateNavigator = () => {
  const { t, i18n } = useTranslation();
  const { activeView, currentDate, navigateForward, navigateBackward, goToToday } =
    useCalendarStore();

  const locale = i18n.language;

  const dateLabel =
    activeView === 'week'
      ? t('calendar.weekNumber', {
          week: getISOWeekNumber(currentDate),
          year: currentDate.getFullYear(),
        })
      : formatDateLabel(currentDate, activeView, locale);

  return (
    <nav className={styles.dateNavigator} aria-label={t('accessibility.calendarNavigation')}>
      <button
        className={styles.navButton}
        type="button"
        onClick={navigateBackward}
        aria-label={t('accessibility.previousPeriod')}
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <span className={styles.dateLabel}>{dateLabel}</span>

      <button
        className={styles.navButton}
        type="button"
        onClick={navigateForward}
        aria-label={t('accessibility.nextPeriod')}
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      <button
        className={styles.todayButton}
        type="button"
        onClick={goToToday}
      >
        {t('calendar.today')}
      </button>
    </nav>
  );
};
