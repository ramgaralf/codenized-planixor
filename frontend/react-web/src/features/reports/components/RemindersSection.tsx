import { useTranslation } from 'react-i18next';

import type { TypeAggregate } from '../models';
import {
  computeDonutSegments,
  formatDuration,
} from '../services/reportAggregator';
import { DonutChart } from './DonutChart';
import { HorizontalBarChart } from './HorizontalBarChart';
import { ReportTable } from './ReportTable';

interface RemindersSectionProps {
  data: TypeAggregate[];
  totalMinutes: number;
  mode: 'month' | 'year';
}

export const RemindersSection = ({
  data,
  totalMinutes,
}: RemindersSectionProps) => {
  const { t } = useTranslation();
  const percentages = new Map(
    data.map((item) => [item.typeId, item.percentage]),
  );
  const donutSegments = computeDonutSegments(percentages);

  const donutData = donutSegments.map((segment) => {
    const original = data.find((d) => d.typeId === segment.typeId);
    return {
      typeId: segment.typeId,
      name: original?.name ?? '',
      icon: original?.icon ?? '',
      backgroundColor: original?.backgroundColor ?? '#6B7280',
      totalMinutes: original?.totalMinutes ?? 0,
      eventCount: original?.eventCount ?? 0,
      percentage: segment.percentage,
    };
  });

  const centerText = formatDuration(totalMinutes);

  return (
    <section aria-label={t('reports.remindersSection', { defaultValue: 'Reminders' })}>
      <HorizontalBarChart data={data} />
      <DonutChart
        data={donutData}
        totalMinutes={totalMinutes}
        centerText={centerText}
      />
      <ReportTable
        data={data}
        totalMinutes={totalMinutes}
      />
    </section>
  );
};
