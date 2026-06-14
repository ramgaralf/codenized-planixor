import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/infrastructure/i18n';

import { HeaderBar } from './HeaderBar';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const renderHeaderBar = () => {
  return render(
    <I18nextProvider i18n={i18n}>
      <HeaderBar />
    </I18nextProvider>,
  );
};

describe('HeaderBar', () => {
  it('should render the notification bell button with accessible label', () => {
    renderHeaderBar();

    const bell = screen.getByRole('button', { name: /notifications/i });
    expect(bell).toBeInTheDocument();
  });

  it('should render the new event button with text label', () => {
    renderHeaderBar();

    const newEventBtn = screen.getByRole('button', { name: /new event/i });
    expect(newEventBtn).toBeInTheDocument();
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

  it('should render three buttons total', () => {
    renderHeaderBar();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });
});
