import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BarChart } from '@/components/widgets/BarChart';
import { DonutChart } from '@/components/widgets/DonutChart';
import { UpcomingList } from '@/components/widgets/UpcomingList';

import styles from './ReportsPage.module.css';

type TimeRange = 'day' | 'week' | 'month' | 'year';

const TIME_RANGE_OPTIONS: TimeRange[] = ['day', 'week', 'month', 'year'];

const TIME_RANGE_LABEL_KEYS: Record<TimeRange, string> = {
  day: 'views.day',
  week: 'views.week',
  month: 'views.month',
  year: 'views.year',
};

export const ReportsPage = () => {
  const { t } = useTranslation();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('week');

  return (
    <div className={styles.reportsPage}>
      <h1 className={styles.pageTitle}>{t('reports.title')}</h1>

      <div
        className={styles.timeRangeSelector}
        role="tablist"
        aria-label={t('reports.title')}
      >
        {TIME_RANGE_OPTIONS.map((range) => (
          <button
            key={range}
            role="tab"
            aria-selected={selectedRange === range}
            className={`${styles.timeRangeTab} ${selectedRange === range ? styles.timeRangeTabActive : ''}`}
            onClick={() => setSelectedRange(range)}
          >
            {t(TIME_RANGE_LABEL_KEYS[range])}
          </button>
        ))}
      </div>

      <section className={styles.chartsSection}>
        <BarChart />
        <DonutChart />
        <UpcomingList />
      </section>

      <p className={styles.emptyMessage}>{t('empty.noRecords')}</p>
    </div>
  );
};
