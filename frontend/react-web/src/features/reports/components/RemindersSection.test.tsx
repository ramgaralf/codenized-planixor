import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { TypeAggregate } from '../models';
import { RemindersSection } from './RemindersSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, params?: Record<string, string>) => {
      return params?.defaultValue ?? _key;
    },
  }),
}));

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  LabelList: () => <div data-testid="label-list" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
}));

describe('RemindersSection', () => {
  describe('Soft-deleted reminder definition still renders with last known metadata', () => {
    it('should render reminder data with its last known name and icon even if definition was soft-deleted', () => {
      // This data represents a reminder whose definition was soft-deleted,
      // but the aggregation engine resolved the last known metadata.
      // The component renders whatever metadata is passed to it.
      const dataWithSoftDeletedReminder: TypeAggregate[] = [
        {
          typeId: 'deleted-reminder-1',
          name: 'Take Medicine',
          icon: '💊',
          backgroundColor: '#EF4444',
          totalMinutes: 180,
          percentage: 60,
        },
        {
          typeId: 'active-reminder-2',
          name: 'Workout',
          icon: '🏋️',
          backgroundColor: '#10B981',
          totalMinutes: 120,
          percentage: 40,
        },
      ];

      render(
        <RemindersSection
          data={dataWithSoftDeletedReminder}
          totalMinutes={300}
          mode="month"
        />,
      );

      // Soft-deleted reminder still renders with last known metadata
      expect(screen.getByText('Take Medicine')).toBeInTheDocument();
      // "3h 0m" appears in bar chart row + table row
      expect(screen.getAllByText('3h 0m').length).toBeGreaterThanOrEqual(1);
      // 💊 appears multiple times (bar chart icon + table row icon)
      expect(screen.getAllByText('💊').length).toBeGreaterThanOrEqual(1);

      // Active reminder also renders
      expect(screen.getByText('Workout')).toBeInTheDocument();
      // "2h 0m" appears in bar chart row + table row
      expect(screen.getAllByText('2h 0m').length).toBeGreaterThanOrEqual(1);
    });

    it('should render unknown fallback metadata when definition is completely missing', () => {
      // When a definition is not found at all, the aggregation engine
      // uses fallback values: icon ❓, name "Unknown", color #6B7280
      const dataWithUnknownReminder: TypeAggregate[] = [
        {
          typeId: 'missing-reminder-1',
          name: 'Unknown',
          icon: '❓',
          backgroundColor: '#6B7280',
          totalMinutes: 90,
          percentage: 100,
        },
      ];

      render(
        <RemindersSection
          data={dataWithUnknownReminder}
          totalMinutes={90}
          mode="month"
        />,
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
      // ❓ appears multiple times (bar chart icon + table row icon)
      expect(screen.getAllByText('❓').length).toBeGreaterThanOrEqual(1);
      // "1h 30m" appears multiple times (donut center + table row + total row)
      expect(screen.getAllByText('1h 30m').length).toBeGreaterThanOrEqual(1);
    });
  });
});
