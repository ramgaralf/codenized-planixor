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
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 10;
  const maxYear = currentYear + 10;

  it('should display year label in year mode', () => {
    render(
      <DateNavigator
        mode="year"
        selectedMonth={0}
        selectedYear={2025}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );

    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('should display a Today button', () => {
    render(
      <DateNavigator
        mode="month"
        selectedMonth={5}
        selectedYear={2025}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('should call onPrevious when left arrow is clicked', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();

    render(
      <DateNavigator
        mode="month"
        selectedMonth={5}
        selectedYear={2025}
        onPrevious={onPrevious}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  it('should call onNext when right arrow is clicked', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    render(
      <DateNavigator
        mode="month"
        selectedMonth={5}
        selectedYear={2025}
        onPrevious={() => {}}
        onNext={onNext}
        onToday={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('should call onToday when Today button is clicked', async () => {
    const user = userEvent.setup();
    const onToday = vi.fn();

    render(
      <DateNavigator
        mode="year"
        selectedMonth={0}
        selectedYear={2020}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={onToday}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalledOnce();
  });

  it('should disable previous button at minimum year boundary in year mode', () => {
    render(
      <DateNavigator
        mode="year"
        selectedMonth={0}
        selectedYear={minYear}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );

    const prevButton = screen.getByRole('button', { name: 'Previous year' });
    expect(prevButton).toBeDisabled();
  });

  it('should disable next button at maximum year boundary in year mode', () => {
    render(
      <DateNavigator
        mode="year"
        selectedMonth={0}
        selectedYear={maxYear}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );

    const nextButton = screen.getByRole('button', { name: 'Next year' });
    expect(nextButton).toBeDisabled();
  });

  it('should disable previous button at minimum month boundary', () => {
    render(
      <DateNavigator
        mode="month"
        selectedMonth={0}
        selectedYear={minYear}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );

    const prevButton = screen.getByRole('button', { name: 'Previous month' });
    expect(prevButton).toBeDisabled();
  });

  it('should disable next button at maximum month boundary', () => {
    render(
      <DateNavigator
        mode="month"
        selectedMonth={11}
        selectedYear={maxYear}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );

    const nextButton = screen.getByRole('button', { name: 'Next month' });
    expect(nextButton).toBeDisabled();
  });

  it('should not disable navigation buttons when within range', () => {
    render(
      <DateNavigator
        mode="year"
        selectedMonth={0}
        selectedYear={currentYear}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
      />,
    );

    const prevButton = screen.getByRole('button', { name: 'Previous year' });
    const nextButton = screen.getByRole('button', { name: 'Next year' });
    expect(prevButton).not.toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });
});
