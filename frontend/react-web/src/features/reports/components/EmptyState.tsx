import { useTranslation } from 'react-i18next';

/**
 * Empty state component for the Reports feature.
 *
 * Displays a localized "No data to display" message centered in the chart
 * content area. Uses role="status" for screen reader announcements.
 *
 * The parent container handles conditional rendering — this component is
 * shown only when no shift AND no reminder events exist for the period.
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3_
 */
export const EmptyState = () => {
  const { t } = useTranslation();

  return (
    <div role="status" className="flex items-center justify-center flex-1">
      <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
        {t('reports.emptyState', { defaultValue: 'No data to display' })}
      </span>
    </div>
  );
};
