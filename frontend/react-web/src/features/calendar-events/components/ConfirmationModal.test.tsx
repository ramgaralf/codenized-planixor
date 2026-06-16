import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ConfirmationModal } from './ConfirmationModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'calendarEvent.delete.title': `Delete '${params?.name ?? ''}'?`,
        'calendarEvent.delete.message': 'This action is permanent and cannot be undone.',
        'calendarEvent.delete.confirm': 'Delete',
        'calendarEvent.delete.cancel': 'Cancel',
      };
      return translations[key] ?? key;
    },
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
}));

const mockSoftDelete = vi.fn();
vi.mock('../services/calendarEventService', () => ({
  softDelete: (...args: unknown[]) => mockSoftDelete(...args),
}));

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    eventName: 'Morning Shift',
    eventId: 'event-123',
    onConfirm: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSoftDelete.mockResolvedValue(undefined);
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render modal with event name and deletion message when isOpen is true', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText("Delete 'Morning Shift'?")).toBeInTheDocument();
    expect(
      screen.getByText('This action is permanent and cannot be undone.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should have role="dialog" and aria-modal="true" for accessibility', () => {
    render(<ConfirmationModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });

  it('should call softDelete and onConfirm when Delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockSoftDelete).toHaveBeenCalledWith('event-123');
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onDismiss when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(mockSoftDelete).not.toHaveBeenCalled();
  });

  it('should call onDismiss when clicking outside the modal', async () => {
    const user = userEvent.setup();
    render(<ConfirmationModal {...defaultProps} />);

    // Click on the overlay (parent of the dialog)
    const overlay = screen.getByRole('dialog').parentElement!;
    await user.click(overlay);

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(mockSoftDelete).not.toHaveBeenCalled();
  });

  it('should call onDismiss when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<ConfirmationModal {...defaultProps} />);

    await user.keyboard('{Escape}');

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(mockSoftDelete).not.toHaveBeenCalled();
  });

  it('should call onDismiss on softDelete failure without calling onConfirm', async () => {
    mockSoftDelete.mockRejectedValue(new Error('Storage write error'));
    const user = userEvent.setup();
    render(<ConfirmationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  it('should disable both buttons while deletion is in progress', async () => {
    // Delay the softDelete to observe loading state
    mockSoftDelete.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    const user = userEvent.setup();
    render(<ConfirmationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    // Both buttons should be disabled during deletion
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const deleteButton = screen.getByRole('button', { name: '...' });
    expect(cancelButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
