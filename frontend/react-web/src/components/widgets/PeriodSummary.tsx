import { useTranslation } from 'react-i18next';

import { useCalendarStore } from '@/stores/calendarStore';

import styles from './PeriodSummary.module.css';

const getViewKey = (view: string): string => `views.${view}`;

export const PeriodSummary = () => {
  const { t } = useTranslation();
  const activeView = useCalendarStore((state) => state.activeView);

  const viewLabel = t(getViewKey(activeView));
  const summaryLabel = `${t('widgets.summary')} — ${viewLabel}`;

  return (
    <section className={styles.container} aria-label={summaryLabel}>
      <h3 className={styles.title}>{summaryLabel}</h3>
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>0</span>
          <span className={styles.metricLabel}>{t('widgets.hoursWorked')}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>0</span>
          <span className={styles.metricLabel}>
            {t('widgets.shiftsCompleted')}
          </span>
        </div>
      </div>
    </section>
  );
};
