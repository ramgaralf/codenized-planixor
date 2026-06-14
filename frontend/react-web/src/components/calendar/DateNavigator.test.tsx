import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/infrastructure/i18n';
import { useCalendarStore } from '@/stores/calendarStore';

import { DateNavigator } from './DateNavigator';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  useCalendarStore.setState({
    activeView: 'week',
    currentDate: new Date(2024, 5, 15),
  });
});

const renderDateNavigator = () => {
  return render(
    <I18nextProvider i18n={i18n}>
      <DateNavigator />
    </I18nextProvider>,
  );
};

describe('DateNavigator', () => {
  it('should render previous and next navigation buttons with aria-labels', () => {
    renderDateNavigator();

    expect(screen.getByRole('button', { name: /previous period/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next period/i })).toBeInTheDocument();
  });

  it('should render the Today button with i18n label', () => {
    renderDateNavigator();

    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  it('should render as a nav element with accessible label', () => {
    renderDateNavigator();

    expect(screen.getByRole('navigation', { name: /calendar navigation/i })).toBeInTheDocument();
  });

  it('should display week number and year in week view', () => {
    useCalendarStore.setState({ activeView: 'week', currentDate: new Date(2024, 5, 15) });
    renderDateNavigator();

    expect(screen.getByText(/week 24, 2024/i)).toBeInTheDocument();
  });

  it('should display full date with weekday in day view', () => {
    useCalendarStore.setState({ activeView: 'day', currentDate: new Date(2024, 5, 15) });
    renderDateNavigator();

    expect(screen.getByText(/saturday/i)).toBeInTheDocument();
    expect(screen.getByText(/june/i)).toBeInTheDocument();
    expect(screen.getByText(/2024/i)).toBeInTheDocument();
  });

  it('should display month name and year in month view', () => {
    useCalendarStore.setState({ activeView: 'month', currentDate: new Date(2024, 5, 15) });
    renderDateNavigator();

    expect(screen.getByText(/june 2024/i)).toBeInTheDocument();
  });

  it('should display only year in year view', () => {
    useCalendarStore.setState({ activeView: 'year', currentDate: new Date(2024, 5, 15) });
    renderDateNavigator();

    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('should call navigateBackward when previous button is clicked', async () => {
    const user = userEvent.setup();
    useCalendarStore.setState({ activeView: 'day', currentDate: new Date(2024, 5, 15) });
    renderDateNavigator();

    await user.click(screen.getByRole('button', { name: /previous period/i }));

    const state = useCalendarStore.getState();
    expect(state.currentDate.getDate()).toBe(14);
  });

  it('should call navigateForward when next button is clicked', async () => {
    const user = userEvent.setup();
    useCalendarStore.setState({ activeView: 'day', currentDate: new Date(2024, 5, 15) });
    renderDateNavigator();

    await user.click(screen.getByRole('button', { name: /next period/i }));

    const state = useCalendarStore.getState();
    expect(state.currentDate.getDate()).toBe(16);
  });

  it('should call goToToday when Today button is clicked', async () => {
    const user = userEvent.setup();
    useCalendarStore.setState({ activeView: 'week', currentDate: new Date(2020, 0, 1) });
    renderDateNavigator();

    await user.click(screen.getByRole('button', { name: /today/i }));

    const state = useCalendarStore.getState();
    const today = new Date();
    expect(state.currentDate.getDate()).toBe(today.getDate());
    expect(state.currentDate.getMonth()).toBe(today.getMonth());
    expect(state.currentDate.getFullYear()).toBe(today.getFullYear());
  });

  it('should respect locale for date formatting', async () => {
    await i18n.changeLanguage('es');
    useCalendarStore.setState({ activeView: 'month', currentDate: new Date(2024, 5, 15) });

    const { unmount } = renderDateNavigator();

    expect(screen.getByText(/junio/i)).toBeInTheDocument();

    unmount();
    await i18n.changeLanguage('en');
  });
});
