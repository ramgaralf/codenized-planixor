import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AnnualConfigModal } from './AnnualConfigModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'reports.annualConfig.title': `Annual hours — ${params?.year ?? '2025'}`,
        'reports.annualConfig.label': 'Configured working hours',
        'reports.annualConfig.rangeError': 'Value must be between 1 and 8,784',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
      };
      return translations[key] ?? params?.defaultValue ?? key;
    },
  }),
}));

describe('AnnualConfigModal', () => {
  const defaultProps = {
    isOpen: true,
    selectedYear: 2025,
    existingValue: null,
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<AnnualConfigModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render the dialog when isOpen is true', () => {
    render(<AnnualConfigModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should show placeholder when no existing value', () => {
    render(<AnnualConfigModal {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', '1800');
    expect(input).toHaveValue('');
  });

  it('should pre-populate input with existing value', () => {
    render(<AnnualConfigModal {...defaultProps} existingValue={1500} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('1500');
  });

  it('should show validation error when value is less than 1', async () => {
    const user = userEvent.setup();
    render(<AnnualConfigModal {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '0');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Value must be between 1 and 8,784',
    );
  });

  it('should show validation error when value exceeds 8784', async () => {
    const user = userEvent.setup();
    render(<AnnualConfigModal {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '9000');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Value must be between 1 and 8,784',
    );
  });

  it('should not allow non-digit characters', async () => {
    const user = userEvent.setup();
    render(<AnnualConfigModal {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'abc.!@#');

    expect(input).toHaveValue('');
  });

  it('should call onSave with valid value on submit', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AnnualConfigModal {...defaultProps} onSave={onSave} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '1800');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(1800);
    });
  });

  it('should call onDelete when submit with empty input and existing config', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <AnnualConfigModal
        {...defaultProps}
        existingValue={1500}
        onDelete={onDelete}
      />,
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledOnce();
    });
  });

  it('should dismiss without persisting when empty input and no existing config', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(
      <AnnualConfigModal
        {...defaultProps}
        existingValue={null}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('should dismiss when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AnnualConfigModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should prevent submission when validation error exists', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<AnnualConfigModal {...defaultProps} onSave={onSave} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '9999');

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
