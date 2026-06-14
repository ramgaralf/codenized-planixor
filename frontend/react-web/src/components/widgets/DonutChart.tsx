import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import styles from './DonutChart.module.css';

const BRAND_COLORS = ['#2563EB', '#7C3AED', '#0B86D4', '#10B981'] as const;

const PLACEHOLDER_DATA = [{ name: 'empty', value: 1 }];

export const DonutChart = () => {
  const { t } = useTranslation();

  return (
    <section
      className={styles.container}
      aria-label={t('reports.hoursByShiftType')}
    >
      <h3 className={styles.title}>{t('reports.hoursByShiftType')}</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={PLACEHOLDER_DATA}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              dataKey="value"
              stroke="none"
            >
              {PLACEHOLDER_DATA.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BRAND_COLORS[index % BRAND_COLORS.length]}
                  opacity={0.3}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <p className={styles.emptyText}>{t('empty.noData')}</p>
      </div>
    </section>
  );
};
