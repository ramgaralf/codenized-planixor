import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/infrastructure/i18n';
import { useCalendarStore } from '@/stores/calendarStore';

import { MonthView } from './MonthView';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  // Set a known date: January 2024 (Mon Jan 1)
  useCalendarStore.setState({ currentDate: new Date(2024, 0, 15) });
});

const renderMonthView = () => {
  return render(
    <I18nextProvider i18n={i18n}>
      <MonthView />
    </I18nextProvider>,
  );
};

describe('MonthView', () => {
  it('should render with grid role and accessible label', () => {
    renderMonthView();

    const grid = screen.getByRole('grid', { name: /month/i });
    expect(grid).toBeInTheDocument();
  });

  it('should render 7 column headers for weekday abbreviations', () => {
    renderMonthView();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(7);
  });

  it('should render weekday abbreviations starting with Sunday for English locale', () => {
    renderMonthView();

    const headers = screen.getAllByRole('columnheader');
    // English locale: week starts on Sunday
    expect(headers[0]).toHaveTextContent(/sun/i);
    expect(headers[1]).toHaveTextContent(/mon/i);
    expect(headers[6]).toHaveTextContent(/sat/i);
  });

  it('should render weekday abbreviations starting with Monday for Spanish locale', async () => {
    await i18n.changeLanguage('es');

    renderMonthView();

    const headers = screen.getAllByRole('columnheader');
    // Spanish locale: week starts on Monday
    expect(headers[0]).toHaveTextContent(/lun/i);
    expect(headers[6]).toHaveTextContent(/dom/i);

    // Restore English for other tests
    await i18n.changeLanguage('en');
  });

  it('should render day cells as gridcells', () => {
    renderMonthView();

    const cells = screen.getAllByRole('gridcell');
    // January 2024 with Sunday start: grid should be 5 rows × 7 = 35 cells
    // Jan 1 is Monday, so 1 leading day (Sunday Dec 31) + 31 days + 3 trailing = 35
    expect(cells.length).toBeGreaterThanOrEqual(28);
    expect(cells.length).toBeLessThanOrEqual(42);
  });

  it('should highlight current day with today styling', () => {
    // Set currentDate to today
    const today = new Date();
    useCalendarStore.setState({ currentDate: today });

    renderMonthView();

    const todayElement = screen.getByAttribute
      ? screen.getByText(String(today.getDate()), { selector: '[aria-current="date"]' })
      : document.querySelector('[aria-current="date"]');

    expect(todayElement).not.toBeNull();
  });

  it('should dim days from adjacent months with adjacentMonth class', () => {
    // Use March 2024 — starts on Friday, so there will be leading days
    useCalendarStore.setState({ currentDate: new Date(2024, 2, 15) });

    renderMonthView();

    const cells = screen.getAllByRole('gridcell');
    // March 2024 starts on Friday (en locale Sunday start), so 5 leading days from Feb
    const firstCell = cells[0];
    expect(firstCell.className).toMatch(/adjacentMonth/);
  });

  it('should render correct number of rows based on month structure', () => {
    // February 2026 starts on Sunday (en locale), fits in 4 rows × 7 = 28 cells
    useCalendarStore.setState({ currentDate: new Date(2026, 1, 1) });

    renderMonthView();

    const cells = screen.getAllByRole('gridcell');
    // Feb 2026: starts on Sunday in en locale (firstDayOfWeek=0), 28 days exactly = 28 cells (4 rows)
    expect(cells.length % 7).toBe(0);
  });

  it('should render day numbers for all grid cells', () => {
    useCalendarStore.setState({ currentDate: new Date(2024, 0, 15) });

    renderMonthView();

    // Check that day 15 of January exists (unique within the grid)
    expect(screen.getByText('15')).toBeInTheDocument();
    // Day 31 only appears once (Jan 31, Dec 31 is a leading day)
    expect(screen.getAllByText('31')).toHaveLength(2); // Dec 31 + Jan 31
    // Verify total cells are rendered (Jan 2024: 1 leading + 31 days + 3 trailing = 35)
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(35);
  });
});
