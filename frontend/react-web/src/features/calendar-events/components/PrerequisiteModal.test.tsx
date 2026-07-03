import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll } from 'vitest';

import i18n from '@/infrastructure/i18n';

import { PrerequisiteModal } from './PrerequisiteModal';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const renderModal = (props: { missingShifts: boolean; missingReminders: boolean; onDismiss: () => void }) => {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <PrerequisiteModal {...props} />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe('PrerequisiteModal', () => {
  it('should display message for both missing shifts and reminders', () => {
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: true, onDismiss });

    expect(screen.getByText('Cannot Create Event')).toBeInTheDocument();
    expect(
      screen.getByText(/at least one shift and one reminder/),
    ).toBeInTheDocument();
  });

  it('should display message for missing shifts only', () => {
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: false, onDismiss });

    expect(
      screen.getByText(/at least one shift before/),
    ).toBeInTheDocument();
  });

  it('should display message for missing reminders only', () => {
    const onDismiss = vi.fn();
    renderModal({ missingShifts: false, missingReminders: true, onDismiss });

    expect(
      screen.getByText(/at least one reminder before/),
    ).toBeInTheDocument();
  });

  it('should show Go to Shifts button when shifts are missing', () => {
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: false, onDismiss });

    expect(screen.getByRole('button', { name: 'Go to Shifts' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to Reminders' })).not.toBeInTheDocument();
  });

  it('should show Go to Reminders button when reminders are missing', () => {
    const onDismiss = vi.fn();
    renderModal({ missingShifts: false, missingReminders: true, onDismiss });

    expect(screen.getByRole('button', { name: 'Go to Reminders' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to Shifts' })).not.toBeInTheDocument();
  });

  it('should show both navigation buttons when both are missing', () => {
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: true, onDismiss });

    expect(screen.getByRole('button', { name: 'Go to Shifts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Reminders' })).toBeInTheDocument();
  });

  it('should call onDismiss and navigate to /shifts when Go to Shifts is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: false, onDismiss });

    await user.click(screen.getByRole('button', { name: 'Go to Shifts' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/shifts');
  });

  it('should call onDismiss and navigate to /reminders when Go to Reminders is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderModal({ missingShifts: false, missingReminders: true, onDismiss });

    await user.click(screen.getByRole('button', { name: 'Go to Reminders' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/reminders');
  });

  it('should call onDismiss when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: true, onDismiss });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: true, onDismiss });

    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: true, onDismiss });

    const overlay = screen.getByRole('presentation');
    await user.click(overlay);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should have role="dialog" with aria-modal', () => {
    const onDismiss = vi.fn();
    renderModal({ missingShifts: true, missingReminders: true, onDismiss });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
