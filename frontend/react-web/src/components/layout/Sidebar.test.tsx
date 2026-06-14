import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeAll } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/infrastructure/i18n';

import { Sidebar } from './Sidebar';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const renderSidebar = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <I18nextProvider i18n={i18n}>
        <Sidebar />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe('Sidebar', () => {
  it('should render 5 nav items in correct order: Calendar, Reports, Shifts, Reminders, Settings', () => {
    renderSidebar();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    expect(links).toHaveLength(5);
    expect(links[0]).toHaveTextContent('Calendar');
    expect(links[1]).toHaveTextContent('Reports');
    expect(links[2]).toHaveTextContent('Shifts');
    expect(links[3]).toHaveTextContent('Reminders');
    expect(links[4]).toHaveTextContent('Settings');
  });

  it('should highlight the active item with primary-blue color class', () => {
    renderSidebar(['/']);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    expect(links[0].className).toMatch(/navLinkActive/);
    expect(links[1].className).not.toMatch(/navLinkActive/);
    expect(links[2].className).not.toMatch(/navLinkActive/);
    expect(links[3].className).not.toMatch(/navLinkActive/);
    expect(links[4].className).not.toMatch(/navLinkActive/);
  });

  it('should highlight the correct item when navigated to a different route', () => {
    renderSidebar(['/reports']);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    expect(links[0].className).not.toMatch(/navLinkActive/);
    expect(links[1].className).toMatch(/navLinkActive/);
  });

  it('should support keyboard navigation with Tab through all items', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    await user.tab();
    expect(links[0]).toHaveFocus();

    await user.tab();
    expect(links[1]).toHaveFocus();

    await user.tab();
    expect(links[2]).toHaveFocus();

    await user.tab();
    expect(links[3]).toHaveFocus();

    await user.tab();
    expect(links[4]).toHaveFocus();
  });

  it('should activate a nav item when Enter key is pressed', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    await user.tab();
    await user.tab();
    expect(links[1]).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(links[1].className).toMatch(/navLinkActive/);
  });

  it('should have visible focus indicator when focused via keyboard', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    await user.tab();
    await user.tab();
    await user.tab();
    expect(links[2]).toHaveFocus();
    expect(links[2].className).toMatch(/navLink/);
  });

  it('should not contain a Home nav item', () => {
    renderSidebar();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    links.forEach((link) => {
      expect(link).not.toHaveTextContent(/^Home$/i);
    });

    expect(screen.queryByText(/^Home$/i)).not.toBeInTheDocument();
  });
});
