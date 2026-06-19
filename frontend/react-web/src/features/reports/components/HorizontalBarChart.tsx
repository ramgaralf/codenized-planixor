import { formatDuration } from '../services/reportAggregator';
import type { TypeAggregate } from '../models';

interface HorizontalBarChartProps {
  data: TypeAggregate[];
}

export const HorizontalBarChart = ({ data }: HorizontalBarChartProps) => {
  if (data.length === 0) return null;

  const maxMinutes = Math.max(...data.map((d) => d.totalMinutes), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
      {data.map((item) => {
        const barWidthPercent = (item.totalMinutes / maxMinutes) * 100;

        return (
          <div
            key={item.typeId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '28px',
            }}
          >
            {/* Emoji icon */}
            <span
              style={{ fontSize: '20px', width: '28px', textAlign: 'center', flexShrink: 0 }}
              aria-hidden="true"
            >
              {item.icon}
            </span>

            {/* Bar container (fills remaining space) */}
            <div
              style={{
                flex: 1,
                height: '18px',
                position: 'relative',
                borderRadius: '4px',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <div
                style={{
                  width: `${Math.max(barWidthPercent, 2)}%`,
                  height: '100%',
                  backgroundColor: item.backgroundColor,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Duration label */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap',
                minWidth: '60px',
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {formatDuration(item.totalMinutes)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
