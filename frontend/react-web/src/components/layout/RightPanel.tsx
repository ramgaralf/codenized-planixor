import { PeriodSummary } from '@/components/widgets/PeriodSummary';
import { BarChart } from '@/components/widgets/BarChart';
import { DonutChart } from '@/components/widgets/DonutChart';
import { UpcomingList } from '@/components/widgets/UpcomingList';

import styles from './RightPanel.module.css';

export const RightPanel = () => {
  return (
    <div className={styles.panel}>
      <PeriodSummary />
      <BarChart />
      <DonutChart />
      <UpcomingList />
    </div>
  );
};
