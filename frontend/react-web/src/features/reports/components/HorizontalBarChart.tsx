import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';

import { formatDuration } from '../services/reportAggregator';
import type { TypeAggregate } from '../models';

interface HorizontalBarChartProps {
  data: TypeAggregate[];
}

const BAR_HEIGHT = 36;
const CHART_MARGIN = { top: 8, right: 80, bottom: 8, left: 40 };

const renderCustomBarLabel = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;

  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      fill="var(--color-text-primary)"
      fontSize={12}
      fontFamily="var(--font-family)"
      fontWeight={500}
      dominantBaseline="central"
    >
      {formatDuration(value)}
    </text>
  );
};

const renderEmojiTick = (props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) => {
  const { x = 0, y = 0, payload } = props;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={18}
    >
      {payload?.value ?? ''}
    </text>
  );
};

export const HorizontalBarChart = ({ data }: HorizontalBarChartProps) => {
  const chartHeight = Math.max(data.length * BAR_HEIGHT + 32, 80);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={CHART_MARGIN}
        barCategoryGap="20%"
      >
        <XAxis
          type="number"
          domain={[0, 'auto']}
          hide
        />
        <YAxis
          type="category"
          dataKey="icon"
          width={32}
          axisLine={false}
          tickLine={false}
          tick={renderEmojiTick}
        />
        <Bar dataKey="totalMinutes" radius={[4, 4, 4, 4]} barSize={24}>
          {data.map((entry) => (
            <Cell key={entry.typeId} fill={entry.backgroundColor} />
          ))}
          <LabelList
            dataKey="totalMinutes"
            content={renderCustomBarLabel}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
