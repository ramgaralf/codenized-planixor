import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useCalendarStore } from '@/stores/calendarStore';

/**
 * WeekNavigator — navigation control for the Week view.
 *
 * Provides previous/next buttons that shift the displayed week by ±7 days.
 * Uses the calendarStore's navigateWeek method directly.
 */
export const WeekNavigator = () => {
  const { t } = useTranslation();
  const navigateWeek = useCalendarStore((state) => state.navigateWeek);

  return (
    <nav
      className="flex items-center gap-2"
      aria-label={t('accessibility.calendarNavigation')}
    >
      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ color: 'var(--color-text-secondary)' }}
        onClick={() => navigateWeek(-1)}
        aria-label={t('accessibility.previousPeriod')}
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ color: 'var(--color-text-secondary)' }}
        onClick={() => navigateWeek(1)}
        aria-label={t('accessibility.nextPeriod')}
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </nav>
  );
};
