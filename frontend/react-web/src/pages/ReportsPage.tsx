import { Reports } from '@features/reports/reports';

/**
 * ReportsPage — route-level component that composes the Reports feature.
 *
 * Does NOT render its own page title heading (handled by global top bar).
 *
 * _Requirements: 1.1, 1.9_
 */
export const ReportsPage = () => {
  return <Reports />;
};
