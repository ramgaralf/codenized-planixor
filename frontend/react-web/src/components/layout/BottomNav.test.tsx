import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/infrastructure/i18n';

import { BottomNav } from './BottomNav';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const renderBottomNav = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <I18nextProvider i18n={i18n}>
        <BottomNav />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe('BottomNav', () => {
  it('should render 5 items with icons and labels in correct order', () => {
    renderBottomNav();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    expect(links).toHaveLength(5);
    expect(links[0]).toHaveTextContent('Calendar');
    expect(links[1]).toHaveTextContent('Shifts');
    expect(links[2]).toHaveTextContent('Reminders');
    expect(links[3]).toHaveTextContent('Reports');
    expect(links[4]).toHaveTextContent('Settings');
  });

  it('should render an icon for each nav item', () => {
    renderBottomNav();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    links.forEach((link) => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('should highlight the active item with primary-blue color class', () => {
    renderBottomNav(['/']);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    expect(links[0].className).toMatch(/navItemActive/);
    expect(links[1].className).not.toMatch(/navItemActive/);
    expect(links[2].className).not.toMatch(/navItemActive/);
    expect(links[3].className).not.toMatch(/navItemActive/);
    expect(links[4].className).not.toMatch(/navItemActive/);
  });

  it('should highlight the correct item when navigated to a different route', () => {
    renderBottomNav(['/settings']);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    expect(links[0].className).not.toMatch(/navItemActive/);
    expect(links[4].className).toMatch(/navItemActive/);
  });

  it('should not contain a Home nav item', () => {
    renderBottomNav();

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');

    links.forEach((link) => {
      expect(link).not.toHaveTextContent(/^Home$/i);
    });

    expect(screen.queryByText(/^Home$/i)).not.toBeInTheDocument();
  });
});
