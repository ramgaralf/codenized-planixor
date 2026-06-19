import { PieChart, Pie, Cell } from 'recharts';

import type { TypeAggregate } from '../models';

interface DonutChartProps {
  data: TypeAggregate[];
  totalMinutes: number;
  centerText: string;
}

const OUTER_RADIUS = 90;
const INNER_RADIUS = 60;
const CHART_SIZE = 220;
const MIN_ANGLE = 3.6;

export const DonutChart = ({ data, totalMinutes, centerText }: DonutChartProps) => {
  if (totalMinutes === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <PieChart width={CHART_SIZE} height={CHART_SIZE}>
        <Pie
          data={data}
          dataKey="totalMinutes"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={INNER_RADIUS}
          outerRadius={OUTER_RADIUS}
          minAngle={MIN_ANGLE}
          startAngle={90}
          endAngle={-270}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.typeId} fill={entry.backgroundColor} />
          ))}
        </Pie>
      </PieChart>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-line',
            textAlign: 'center',
            lineHeight: '1.3',
          }}
        >
          {centerText}
        </span>
      </div>
    </div>
  );
};
