import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useCalendarStore } from '@/stores/calendarStore';

export const YearNavigator = () => {
  const { t } = useTranslation();
  const navigateYear = useCalendarStore((state) => state.navigateYear);

  return (
    <nav
      className="flex items-center gap-1"
      aria-label={t('accessibility.yearNavigation')}
    >
      <button
        type="button"
        onClick={() => navigateYear(-1)}
        aria-label={t('accessibility.previousYear')}
        className="flex items-center justify-center w-8 h-8 rounded-full"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => navigateYear(1)}
        aria-label={t('accessibility.nextYear')}
        className="flex items-center justify-center w-8 h-8 rounded-full"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
};
