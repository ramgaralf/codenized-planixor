import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/infrastructure/i18n';
import { useCalendarStore } from '@/stores/calendarStore';

import { ViewSelector } from './ViewSelector';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  useCalendarStore.setState({ activeView: 'day', currentDate: new Date() });
});

const renderViewSelector = () => {
  return render(
    <I18nextProvider i18n={i18n}>
      <ViewSelector />
    </I18nextProvider>,
  );
};

describe('ViewSelector', () => {
  it('should render four view options as tabs', () => {
    renderViewSelector();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('should render Day, Week, Month, Year labels', () => {
    renderViewSelector();

    expect(screen.getByRole('tab', { name: 'Day' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Week' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Month' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Year' })).toBeInTheDocument();
  });

  it('should render with tablist role and accessible label', () => {
    renderViewSelector();

    const tablist = screen.getByRole('tablist', {
      name: /calendar navigation/i,
    });
    expect(tablist).toBeInTheDocument();
  });

  it('should mark the active view tab with aria-selected true', () => {
    useCalendarStore.setState({ activeView: 'week' });
    renderViewSelector();

    const weekTab = screen.getByRole('tab', { name: 'Week' });
    expect(weekTab).toHaveAttribute('aria-selected', 'true');

    const dayTab = screen.getByRole('tab', { name: 'Day' });
    expect(dayTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should call setView when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderViewSelector();

    const monthTab = screen.getByRole('tab', { name: 'Month' });
    await user.click(monthTab);

    expect(useCalendarStore.getState().activeView).toBe('month');
  });

  it('should update active state after clicking a different view', async () => {
    const user = userEvent.setup();
    renderViewSelector();

    const weekTab = screen.getByRole('tab', { name: 'Week' });
    await user.click(weekTab);

    expect(weekTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});
