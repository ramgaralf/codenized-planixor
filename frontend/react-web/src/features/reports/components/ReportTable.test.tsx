import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { TypeAggregate } from '../models';
import { ReportTable } from './ReportTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'reports.table.total': 'Total',
        'reports.table.configured': 'Configured',
        'reports.table.difference': 'Difference',
        'reports.table.label': 'Report breakdown',
      };
      return translations[_key] ?? params?.defaultValue ?? _key;
    },
  }),
}));

const SURPLUS_COLOR = 'rgb(16, 185, 129)'; // #10B981
const DEFICIT_COLOR = 'rgb(239, 68, 68)'; // #EF4444

describe('ReportTable', () => {
  const sampleData: TypeAggregate[] = [
    {
      typeId: '1',
      name: 'Morning',
      icon: '☀️',
      backgroundColor: '#10B981',
      totalMinutes: 480,
      eventCount: 5,
      percentage: 60,
    },
    {
      typeId: '2',
      name: 'Afternoon',
      icon: '🌤️',
      backgroundColor: '#7C3AED',
      totalMinutes: 320,
      eventCount: 3,
      percentage: 40,
    },
  ];

  describe('Shift_Table alphabetical ordering in monthly mode', () => {
    it('should display rows with shift data correctly', () => {
      const alphabeticalData: TypeAggregate[] = [
        {
          typeId: 'a',
          name: 'Alpha Shift',
          icon: '🅰️',
          backgroundColor: '#2563EB',
          totalMinutes: 120,
          eventCount: 2,
          percentage: 30,
        },
        {
          typeId: 'b',
          name: 'Beta Shift',
          icon: '🅱️',
          backgroundColor: '#7C3AED',
          totalMinutes: 280,
          eventCount: 4,
          percentage: 70,
        },
      ];

      render(<ReportTable data={alphabeticalData} totalMinutes={400} />);

      const rows = screen.getAllByRole('row');
      // First data row should have "Alpha Shift" (alphabetical ordering done by ShiftsSection)
      expect(rows[0]).toHaveTextContent('Alpha Shift');
      expect(rows[0]).toHaveTextContent('2h 0m');
      expect(rows[1]).toHaveTextContent('Beta Shift');
      expect(rows[1]).toHaveTextContent('4h 40m');
    });

    it('should show Total summary row', () => {
      render(<ReportTable data={sampleData} totalMinutes={800} />);

      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('13h 20m')).toBeInTheDocument();
    });
  });

  describe('Annual surplus/deficit row color', () => {
    it('should show surplus in green when total exceeds configured hours', () => {
      // totalMinutes = 2000, configured = 30 hours = 1800 minutes
      // Difference = 2000 - 1800 = 200 (surplus)
      render(
        <ReportTable
          data={sampleData}
          totalMinutes={2000}
          annualConfig={{ configuredHours: 30 }}
        />,
      );

      const differenceText = screen.getByText('+3h 20m');
      expect(differenceText).toHaveStyle({ color: SURPLUS_COLOR });
    });

    it('should show deficit in red when total is less than configured hours', () => {
      // totalMinutes = 800, configured = 30 hours = 1800 minutes
      // Difference = 800 - 1800 = -1000 (deficit)
      render(
        <ReportTable
          data={sampleData}
          totalMinutes={800}
          annualConfig={{ configuredHours: 30 }}
        />,
      );

      // abs(-1000) = 1000 minutes = "16h 40m"
      const differenceText = screen.getByText('-16h 40m');
      expect(differenceText).toHaveStyle({ color: DEFICIT_COLOR });
    });

    it('should show surplus in green when total equals configured hours', () => {
      // totalMinutes = 1800, configured = 30 hours = 1800 minutes
      // Difference = 1800 - 1800 = 0 (>=, so surplus/green)
      render(
        <ReportTable
          data={sampleData}
          totalMinutes={1800}
          annualConfig={{ configuredHours: 30 }}
        />,
      );

      const differenceText = screen.getByText('+0h 0m');
      expect(differenceText).toHaveStyle({ color: SURPLUS_COLOR });
    });

    it('should display Configured and Difference rows when annualConfig is provided', () => {
      render(
        <ReportTable
          data={sampleData}
          totalMinutes={2000}
          annualConfig={{ configuredHours: 30 }}
        />,
      );

      expect(screen.getByText('Configured')).toBeInTheDocument();
      expect(screen.getByText('Difference')).toBeInTheDocument();
      expect(screen.getByText('30h 0m')).toBeInTheDocument();
    });

    it('should not display Configured and Difference rows when annualConfig is not provided', () => {
      render(<ReportTable data={sampleData} totalMinutes={800} />);

      expect(screen.queryByText('Configured')).not.toBeInTheDocument();
      expect(screen.queryByText('Difference')).not.toBeInTheDocument();
    });
  });
});
