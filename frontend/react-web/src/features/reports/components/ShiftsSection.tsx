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

  const useComparison = mode === 'year' && annualConfig != null;
  const configuredMinutes = useComparison
    ? annualConfig!.configuredHours * 60
    : 0;

  // Build donut data with "remaining" segment when annual config exists in year mode
  let donutSourceData: typeof data;
  let donutTotalMinutes: number;

  if (useComparison && totalMinutes < configuredMinutes) {
    const remainingMinutes = configuredMinutes - totalMinutes;
    donutSourceData = [
      ...data,
      {
        typeId: '__remaining__',
        name: 'Remaining',
        icon: '',
        backgroundColor: '#E5E7EB',
        totalMinutes: remainingMinutes,
        eventCount: 0,
        percentage: 0,
      },
    ];
    donutTotalMinutes = configuredMinutes;
  } else {
    donutSourceData = data;
    donutTotalMinutes = totalMinutes;
  }

  const percentages = new Map(
    donutSourceData.map((item) => [item.typeId, item.percentage]),
  );
  const donutSegments = computeDonutSegments(percentages);

  const donutData = donutSegments.map((segment) => {
    const original = donutSourceData.find((d) => d.typeId === segment.typeId);
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
        totalMinutes={donutTotalMinutes}
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
