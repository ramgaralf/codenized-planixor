import { useTranslation } from 'react-i18next';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

import styles from './BarChart.module.css';

const BRAND_COLORS = {
  primary: '#2563EB',
  purple: '#7C3AED',
  teal: '#0B86D4',
  green: '#10B981',
} as const;

const EMPTY_DATA: readonly never[] = [];

export const BarChart = () => {
  const { t } = useTranslation();

  return (
    <section className={styles.container} aria-label={t('widgets.hoursWorked')}>
      <h3 className={styles.title}>{t('widgets.hoursWorked')}</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={160}>
          <RechartsBarChart data={[...EMPTY_DATA]} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
            />
            <Bar dataKey="hours" fill={BRAND_COLORS.primary} radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
        <p className={styles.emptyText}>{t('empty.noData')}</p>
      </div>
    </section>
  );
};
