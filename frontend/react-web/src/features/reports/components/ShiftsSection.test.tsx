import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { TypeAggregate } from '../models';
import { ShiftsSection } from './ShiftsSection';

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

describe('ShiftsSection', () => {
  describe('Monthly mode alphabetical ordering in table', () => {
    it('should sort table data alphabetically by name in month mode', () => {
      const data: TypeAggregate[] = [
        {
          typeId: 'z',
          name: 'Zebra Shift',
          icon: '🦓',
          backgroundColor: '#2563EB',
          totalMinutes: 500,
          percentage: 50,
        },
        {
          typeId: 'a',
          name: 'Alpha Shift',
          icon: '🅰️',
          backgroundColor: '#10B981',
          totalMinutes: 300,
          percentage: 30,
        },
        {
          typeId: 'm',
          name: 'Morning Shift',
          icon: '☀️',
          backgroundColor: '#7C3AED',
          totalMinutes: 200,
          percentage: 20,
        },
      ];

      render(<ShiftsSection data={data} totalMinutes={1000} mode="month" />);

      const rows = screen.getAllByRole('row');
      // In month mode, table rows are sorted alphabetically
      expect(rows[0]).toHaveTextContent('Alpha Shift');
      expect(rows[1]).toHaveTextContent('Morning Shift');
      expect(rows[2]).toHaveTextContent('Zebra Shift');
    });

    it('should preserve descending order in year mode table', () => {
      const data: TypeAggregate[] = [
        {
          typeId: 'a',
          name: 'Alpha Shift',
          icon: '🅰️',
          backgroundColor: '#10B981',
          totalMinutes: 500,
          percentage: 50,
        },
        {
          typeId: 'b',
          name: 'Beta Shift',
          icon: '🅱️',
          backgroundColor: '#7C3AED',
          totalMinutes: 300,
          percentage: 30,
        },
        {
          typeId: 'c',
          name: 'Charlie Shift',
          icon: '🔵',
          backgroundColor: '#2563EB',
          totalMinutes: 200,
          percentage: 20,
        },
      ];

      render(<ShiftsSection data={data} totalMinutes={1000} mode="year" />);

      const rows = screen.getAllByRole('row');
      // In year mode, table preserves the data order (descending by hours from container)
      expect(rows[0]).toHaveTextContent('Alpha Shift');
      expect(rows[1]).toHaveTextContent('Beta Shift');
      expect(rows[2]).toHaveTextContent('Charlie Shift');
    });
  });
});
