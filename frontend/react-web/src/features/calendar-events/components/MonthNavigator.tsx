import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useCalendarStore } from '@/stores/calendarStore';

export const MonthNavigator = () => {
  const { t } = useTranslation();
  const navigateMonth = useCalendarStore((state) => state.navigateMonth);

  return (
    <nav
      className="flex items-center gap-1"
      aria-label={t('accessibility.monthNavigation')}
    >
      <button
        type="button"
        onClick={() => navigateMonth(-1)}
        aria-label={t('accessibility.previousMonth')}
        className="flex items-center justify-center w-8 h-8 rounded-full"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => navigateMonth(1)}
        aria-label={t('accessibility.nextMonth')}
        className="flex items-center justify-center w-8 h-8 rounded-full"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
};
