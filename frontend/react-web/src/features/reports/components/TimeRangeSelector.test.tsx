import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { TimeRangeSelector } from './TimeRangeSelector';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'views.month': 'Month',
        'views.year': 'Year',
        'reports.timeRangeSelector': 'Time range selector',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('TimeRangeSelector', () => {
  it('should render Month and Year tabs', () => {
    render(<TimeRangeSelector mode="month" onModeChange={() => {}} />);

    expect(screen.getByRole('tab', { name: 'Month' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Year' })).toBeInTheDocument();
  });

  it('should mark Month tab as selected when mode is month', () => {
    render(<TimeRangeSelector mode="month" onModeChange={() => {}} />);

    expect(screen.getByRole('tab', { name: 'Month' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Year' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('should mark Year tab as selected when mode is year', () => {
    render(<TimeRangeSelector mode="year" onModeChange={() => {}} />);

    expect(screen.getByRole('tab', { name: 'Year' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Month' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('should call onModeChange with year when Year tab is clicked', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(<TimeRangeSelector mode="month" onModeChange={onModeChange} />);

    await user.click(screen.getByRole('tab', { name: 'Year' }));
    expect(onModeChange).toHaveBeenCalledWith('year');
  });

  it('should call onModeChange with month when Month tab is clicked', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(<TimeRangeSelector mode="year" onModeChange={onModeChange} />);

    await user.click(screen.getByRole('tab', { name: 'Month' }));
    expect(onModeChange).toHaveBeenCalledWith('month');
  });
});
