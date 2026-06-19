import { useTranslation } from 'react-i18next';

import type { TypeAggregate } from '../models';
import { formatDuration } from '../services/reportAggregator';

interface ReportTableProps {
  data: TypeAggregate[];
  totalMinutes: number;
  annualConfig?: { configuredHours: number } | null;
}

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 0',
  borderBottom: '1px solid var(--color-border)',
};

const ICON_STYLE: React.CSSProperties = {
  width: '24px',
  textAlign: 'center',
  fontSize: '16px',
  flexShrink: 0,
};

const NAME_STYLE: React.CSSProperties = {
  flex: 1,
  fontSize: '14px',
  fontWeight: 400,
  color: 'var(--color-text-primary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const COUNT_STYLE: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  whiteSpace: 'nowrap',
  textAlign: 'left',
  minWidth: '32px',
  flexShrink: 0,
};

const HOURS_STYLE: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  whiteSpace: 'nowrap',
  minWidth: '80px',
  textAlign: 'right',
  flexShrink: 0,
};

const SUMMARY_NAME_STYLE: React.CSSProperties = {
  ...NAME_STYLE,
  fontWeight: 600,
};

const SUMMARY_COUNT_STYLE: React.CSSProperties = {
  ...COUNT_STYLE,
  fontWeight: 600,
};

const SURPLUS_COLOR = '#10B981';
const DEFICIT_COLOR = '#EF4444';

export const ReportTable = ({ data, totalMinutes, annualConfig }: ReportTableProps) => {
  const { t } = useTranslation();

  const totalLabel = t('reports.table.total', { defaultValue: 'Total' });
  const configuredLabel = t('reports.table.configured', { defaultValue: 'Configured' });
  const differenceLabel = t('reports.table.difference', { defaultValue: 'Difference' });

  const totalEventCount = data.reduce((sum, item) => sum + item.eventCount, 0);

  const differenceMinutes = annualConfig
    ? totalMinutes - annualConfig.configuredHours * 60
    : 0;
  const isSurplus = differenceMinutes >= 0;

  return (
    <div role="table" aria-label={t('reports.table.label', { defaultValue: 'Report breakdown' })}>
      {data.map((item) => (
        <div key={item.typeId} role="row" style={ROW_STYLE}>
          <span role="cell" style={ICON_STYLE} aria-hidden="true">
            {item.icon}
          </span>
          <span role="cell" style={NAME_STYLE}>
            {item.name}
          </span>
          <span role="cell" style={COUNT_STYLE}>
            {item.eventCount}
          </span>
          <span role="cell" style={HOURS_STYLE}>
            {formatDuration(item.totalMinutes)}
          </span>
        </div>
      ))}

      <div role="row" style={{ ...ROW_STYLE, borderBottom: annualConfig ? '1px solid var(--color-border)' : 'none' }}>
        <span role="cell" style={ICON_STYLE} aria-hidden="true" />
        <span role="cell" style={SUMMARY_NAME_STYLE}>
          {totalLabel}
        </span>
        <span role="cell" style={SUMMARY_COUNT_STYLE}>
          {totalEventCount}
        </span>
        <span role="cell" style={HOURS_STYLE}>
          {formatDuration(totalMinutes)}
        </span>
      </div>

      {annualConfig && (
        <>
          <div role="row" style={ROW_STYLE}>
            <span role="cell" style={ICON_STYLE} aria-hidden="true" />
            <span role="cell" style={SUMMARY_NAME_STYLE}>
              {configuredLabel}
            </span>
            <span role="cell" style={COUNT_STYLE} />
            <span role="cell" style={HOURS_STYLE}>
              {formatDuration(annualConfig.configuredHours * 60)}
            </span>
          </div>

          <div role="row" style={{ ...ROW_STYLE, borderBottom: 'none' }}>
            <span role="cell" style={ICON_STYLE} aria-hidden="true" />
            <span role="cell" style={SUMMARY_NAME_STYLE}>
              {differenceLabel}
            </span>
            <span role="cell" style={COUNT_STYLE} />
            <span
              role="cell"
              style={{
                ...HOURS_STYLE,
                color: isSurplus ? SURPLUS_COLOR : DEFICIT_COLOR,
              }}
            >
              {`${isSurplus ? '+' : '-'}${formatDuration(Math.abs(differenceMinutes))}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
