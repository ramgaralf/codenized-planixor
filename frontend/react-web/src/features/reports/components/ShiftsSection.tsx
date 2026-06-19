import { useTranslation } from 'react-i18next';

import type { TypeAggregate } from '../models';
import {
  computeDonutSegments,
  formatDuration,
  formatHoursComparison,
} from '../services/reportAggregator';
import { DonutChart } from './DonutChart';
import { HorizontalBarChart } from './HorizontalBarChart';
import { ReportTable } from './ReportTable';

interface ShiftsSectionProps {
  data: TypeAggregate[];
  totalMinutes: number;
  mode: 'month' | 'year';
  annualConfig?: { configuredHours: number } | null;
}

export const ShiftsSection = ({
  data,
  totalMinutes,
  mode,
  annualConfig,
}: ShiftsSectionProps) => {
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
      percentage: segment.percentage,
    };
  });

  const useComparison =
    mode === 'year' && annualConfig != null;

  const centerText = useComparison
    ? formatHoursComparison(totalMinutes, annualConfig!.configuredHours)
    : formatDuration(totalMinutes);

  const tableData =
    mode === 'month'
      ? [...data].sort((a, b) => a.name.localeCompare(b.name))
      : data;

  const tableAnnualConfig = mode === 'year' ? annualConfig : undefined;

  return (
    <section aria-label={t('reports.shiftsSection', { defaultValue: 'Shifts' })}>
      <HorizontalBarChart data={data} />
      <DonutChart
        data={donutData}
        totalMinutes={totalMinutes}
        centerText={centerText}
      />
      <ReportTable
        data={tableData}
        totalMinutes={totalMinutes}
        annualConfig={tableAnnualConfig}
      />
    </section>
  );
};
