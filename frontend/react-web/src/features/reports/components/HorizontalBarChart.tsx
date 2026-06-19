import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import type { LabelContentType } from 'recharts/types/component/Label';
import type { YAxisTickContentProps, TickProp } from 'recharts/types/util/types';

import { formatDuration } from '../services/reportAggregator';
import type { TypeAggregate } from '../models';

interface HorizontalBarChartProps {
  data: TypeAggregate[];
}

const BAR_HEIGHT = 36;
const CHART_MARGIN = { top: 8, right: 80, bottom: 8, left: 40 };

const renderCustomBarLabel: LabelContentType = (props) => {
  const x = typeof props.x === 'number' ? props.x : 0;
  const y = typeof props.y === 'number' ? props.y : 0;
  const width = typeof props.width === 'number' ? props.width : 0;
  const height = typeof props.height === 'number' ? props.height : 0;
  const value = typeof props.value === 'number' ? props.value : 0;

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

const renderEmojiTick: TickProp<YAxisTickContentProps> = (props) => {
  const x = typeof props.x === 'number' ? props.x : 0;
  const y = typeof props.y === 'number' ? props.y : 0;
  const payload = props.payload as { value?: string } | undefined;

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
