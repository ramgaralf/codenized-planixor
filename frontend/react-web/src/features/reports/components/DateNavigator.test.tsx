import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { DateNavigator } from './DateNavigator';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'reports.dateNavigation': 'Report date navigation',
        'accessibility.previousMonth': 'Previous month',
        'accessibility.nextMonth': 'Next month',
        'accessibility.previousYear': 'Previous year',
        'accessibility.nextYear': 'Next year',
        'calendar.today': 'Today',
      };
      if (params?.defaultValue) return params.defaultValue;
      return translations[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('lucide-react', () => ({
  ChevronLeft: (props: Record<string, unknown>) => (
    <svg data-testid="chevron-left" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="chevron-right" {...props} />
  ),
}));

describe('DateNavigator', () => {
  const defaultProps = {
    mode: 'month' as const,
    selectedMonth: 5,
    selectedYear: 2025,
    onPreviousMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onPreviousYear: vi.fn(),
    onNextYear: vi.fn(),
    onToday: vi.fn(),
  };

  it('should display year label in year mode', () => {
    render(<DateNavigator {...defaultProps} mode="year" selectedYear={2025} />);

    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('should display month and year separately in month mode', () => {
    render(<DateNavigator {...defaultProps} selectedMonth={5} selectedYear={2025} />);

    expect(screen.getByText('2025')).toBeInTheDocument();
    // Month name should be rendered (locale-dependent, but in English test it should be "June")
    expect(screen.getByText(/june/i)).toBeInTheDocument();
  });

  it('should display a Today button', () => {
    render(<DateNavigator {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('should call onPreviousMonth when month left arrow is clicked', async () => {
    const user = userEvent.setup();
    const onPreviousMonth = vi.fn();

    render(<DateNavigator {...defaultProps} onPreviousMonth={onPreviousMonth} />);

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onPreviousMonth).toHaveBeenCalledOnce();
  });

  it('should call onNextMonth when month right arrow is clicked', async () => {
    const user = userEvent.setup();
    const onNextMonth = vi.fn();

    render(<DateNavigator {...defaultProps} onNextMonth={onNextMonth} />);

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onNextMonth).toHaveBeenCalledOnce();
  });

  it('should call onPreviousYear when year left arrow is clicked', async () => {
    const user = userEvent.setup();
    const onPreviousYear = vi.fn();

    render(<DateNavigator {...defaultProps} onPreviousYear={onPreviousYear} />);

    await user.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(onPreviousYear).toHaveBeenCalledOnce();
  });

  it('should call onNextYear when year right arrow is clicked', async () => {
    const user = userEvent.setup();
    const onNextYear = vi.fn();

    render(<DateNavigator {...defaultProps} onNextYear={onNextYear} />);

    await user.click(screen.getByRole('button', { name: 'Next year' }));
    expect(onNextYear).toHaveBeenCalledOnce();
  });

  it('should call onToday when Today button is clicked', async () => {
    const user = userEvent.setup();
    const onToday = vi.fn();

    render(<DateNavigator {...defaultProps} onToday={onToday} />);

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalledOnce();
  });

  it('should not show month navigator in year mode', () => {
    render(<DateNavigator {...defaultProps} mode="year" />);

    expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next month' })).not.toBeInTheDocument();
  });

  it('should show both month and year navigators in month mode', () => {
    render(<DateNavigator {...defaultProps} mode="month" />);

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeInTheDocument();
  });
});
