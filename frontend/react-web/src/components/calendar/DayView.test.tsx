import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/infrastructure/i18n';
import { useCalendarStore } from '@/stores/calendarStore';

import { DayView } from './DayView';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  useCalendarStore.setState({ activeView: 'day', currentDate: new Date() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderDayView = () => {
  return render(
    <I18nextProvider i18n={i18n}>
      <DayView />
    </I18nextProvider>,
  );
};

describe('DayView', () => {
  it('should render 24 hourly slots', () => {
    renderDayView();

    const gridCells = screen.getAllByRole('gridcell');
    expect(gridCells).toHaveLength(24);
  });

  it('should render hour labels for all 24 hours', () => {
    renderDayView();

    const rowHeaders = screen.getAllByRole('rowheader');
    expect(rowHeaders).toHaveLength(24);
  });

  it('should format hour labels per locale', async () => {
    await i18n.changeLanguage('en');
    renderDayView();

    const rowHeaders = screen.getAllByRole('rowheader');
    expect(rowHeaders[0]).toHaveTextContent('0:00');
    expect(rowHeaders[9]).toHaveTextContent('9:00');
    expect(rowHeaders[23]).toHaveTextContent('23:00');
  });

  it('should render with grid role and accessible label', () => {
    renderDayView();

    const grid = screen.getByRole('grid', { name: /day/i });
    expect(grid).toBeInTheDocument();
  });

  it('should show current time indicator when viewing today', () => {
    useCalendarStore.setState({ currentDate: new Date() });
    renderDayView();

    const indicator = screen.getByLabelText(/current time/i);
    expect(indicator).toBeInTheDocument();
  });

  it('should not show current time indicator when viewing a different day', () => {
    const pastDate = new Date(2020, 0, 1);
    useCalendarStore.setState({ currentDate: pastDate });
    renderDayView();

    const indicator = screen.queryByLabelText(/current time/i);
    expect(indicator).not.toBeInTheDocument();
  });
});
