import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/infrastructure/i18n';

import { HeaderBar } from './HeaderBar';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const renderHeaderBar = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <I18nextProvider i18n={i18n}>
        <HeaderBar />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe('HeaderBar', () => {
  it('should render the notification bell button with accessible label', () => {
    renderHeaderBar();

    const bell = screen.getByRole('button', { name: /notifications/i });
    expect(bell).toBeInTheDocument();
  });

  it('should render the new event button on calendar page', () => {
    renderHeaderBar(['/']);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('should not render the new event button on non-calendar pages', () => {
    renderHeaderBar(['/settings']);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('should render the user avatar button with accessible label', () => {
    renderHeaderBar();

    const avatar = screen.getByRole('button', { name: /user menu/i });
    expect(avatar).toBeInTheDocument();
  });

  it('should render as a header element', () => {
    renderHeaderBar();

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('should display the page title', () => {
    renderHeaderBar(['/']);

    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});
