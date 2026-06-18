import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useCalendarStore } from '@/stores/calendarStore';

const NAV_BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  border: 'none',
  borderRadius: '50%',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  padding: 0,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  userSelect: 'none',
  textAlign: 'center',
  minWidth: '24px',
  display: 'inline-block',
};

/**
 * Returns the ISO 8601 week number for a given date.
 */
const getISOWeekNumber = (date: Date): number => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  return Math.round(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 6 - 3) / 7);
};

/**
 * WeekDateNavigator — navigation control for Week view.
 *
 * Layout: < WeekNumber >  < Year >
 *
 * Week segment uses ±1 week navigation.
 * Year segment uses ±1 year navigation.
 */
export const WeekDateNavigator = () => {
  const { t } = useTranslation();
  const currentDate = useCalendarStore((state) => state.currentDate);
  const navigateWeek = useCalendarStore((state) => state.navigateWeek);
  const navigateYear = useCalendarStore((state) => state.navigateYear);
  const goToToday = useCalendarStore((state) => state.goToToday);

  const weekNumber = useMemo(() => getISOWeekNumber(currentDate), [currentDate]);
  const year = currentDate.getFullYear();

  return (
    <nav
      className="flex items-center gap-1 w-full"
      aria-label={t('accessibility.calendarNavigation', { defaultValue: 'Calendar navigation' })}
    >
      {/* Week label + week number with controls */}
      <span style={{ ...LABEL_STYLE, marginRight: '4px' }}>
        {t('calendar.weekLabel', { defaultValue: 'Semana' })}
      </span>
      <button
        type="button"
        onClick={() => navigateWeek(-1)}
        aria-label={t('accessibility.previousPeriod', { defaultValue: 'Previous week' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span style={LABEL_STYLE}>
        {weekNumber}
      </span>
      <button
        type="button"
        onClick={() => navigateWeek(1)}
        aria-label={t('accessibility.nextPeriod', { defaultValue: 'Next week' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      {/* Year with controls */}
      <button
        type="button"
        onClick={() => navigateYear(-1)}
        aria-label={t('accessibility.previousYear', { defaultValue: 'Previous year' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span style={LABEL_STYLE}>
        {year}
      </span>
      <button
        type="button"
        onClick={() => navigateYear(1)}
        aria-label={t('accessibility.nextYear', { defaultValue: 'Next year' })}
        style={NAV_BUTTON_STYLE}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      {/* Today button */}
      <button
        type="button"
        onClick={goToToday}
        style={{
          marginLeft: 'auto',
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 600,
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          color: 'var(--color-primary)',
          cursor: 'pointer',
        }}
      >
        {t('calendar.today', { defaultValue: 'Hoy' })}
      </button>
    </nav>
  );
};
