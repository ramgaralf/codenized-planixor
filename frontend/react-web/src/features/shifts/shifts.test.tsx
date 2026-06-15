import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ShiftsContainer } from './shifts';
import * as shiftService from '@features/shifts/services/shiftService';
import type { Shift } from '@features/shifts/models';

vi.mock('@features/shifts/services/shiftService');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

const createShift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 'shift-1',
  name: 'Morning Shift',
  icon: '☀️',
  backgroundColor: '#2563EB',
  startTime: 480,
  endTime: 960,
  hoursWorked: 480,
  isActive: true,
  createdAt: new Date('2024-01-01T08:00:00Z'),
  modifiedAt: new Date('2024-01-01T08:00:00Z'),
  syncedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('ShiftsContainer', () => {
  it('should display a loading spinner while shifts are being retrieved', () => {
    vi.mocked(shiftService.getAll).mockReturnValue(new Promise(() => {}));

    render(<ShiftsContainer />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display empty state message when no shifts exist', async () => {
    vi.mocked(shiftService.getAll).mockResolvedValue([]);

    render(<ShiftsContainer />);

    await waitFor(() => {
      expect(screen.getByText('shift.empty')).toBeInTheDocument();
    });
  });

  it('should display error message when shift retrieval fails', async () => {
    vi.mocked(shiftService.getAll).mockRejectedValue(new Error('DB error'));

    render(<ShiftsContainer />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('shift.error.loadFailed')).toBeInTheDocument();
    });
  });

  it('should render shift list in order after loading completes', async () => {
    const shifts = [
      createShift({ id: '1', name: 'Early Shift', createdAt: new Date('2024-01-01') }),
      createShift({ id: '2', name: 'Late Shift', createdAt: new Date('2024-01-02') }),
    ];
    vi.mocked(shiftService.getAll).mockResolvedValue(shifts);

    render(<ShiftsContainer />);

    await waitFor(() => {
      expect(screen.getByText('Early Shift')).toBeInTheDocument();
    });

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveAccessibleName('Early Shift');
    expect(articles[1]).toHaveAccessibleName('Late Shift');
  });

  it('should show deactivation confirmation modal when deactivate is triggered', async () => {
    const user = userEvent.setup();
    const shifts = [createShift({ id: 'shift-1', name: 'Day Shift', isActive: true })];
    vi.mocked(shiftService.getAll).mockResolvedValue(shifts);

    render(<ShiftsContainer />);

    await waitFor(() => {
      expect(screen.getByText('Day Shift')).toBeInTheDocument();
    });

    const deactivateButton = screen.getByRole('button', {
      name: 'shift.actions.deactivate Day Shift',
    });
    await user.click(deactivateButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('shift.deactivate.title')).toBeInTheDocument();
    expect(screen.getByText('shift.deactivate.confirm')).toBeInTheDocument();
  });

  it('should show delete confirmation modal with permanent warning when delete is triggered', async () => {
    const user = userEvent.setup();
    const shifts = [createShift({ id: 'shift-1', name: 'Night Shift' })];
    vi.mocked(shiftService.getAll).mockResolvedValue(shifts);

    render(<ShiftsContainer />);

    await waitFor(() => {
      expect(screen.getByText('Night Shift')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', {
      name: 'shift.actions.delete Night Shift',
    });
    await user.click(deleteButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('shift.delete.title')).toBeInTheDocument();
    expect(screen.getByText('shift.delete.confirm')).toBeInTheDocument();
  });

  it('should dismiss delete modal and make no changes when cancel is clicked', async () => {
    const user = userEvent.setup();
    const shifts = [createShift({ id: 'shift-1', name: 'Evening Shift' })];
    vi.mocked(shiftService.getAll).mockResolvedValue(shifts);
    vi.mocked(shiftService.softDelete).mockResolvedValue(undefined);

    render(<ShiftsContainer />);

    await waitFor(() => {
      expect(screen.getByText('Evening Shift')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', {
      name: 'shift.actions.delete Evening Shift',
    });
    await user.click(deleteButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'common.cancel' });
    await user.click(cancelButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(shiftService.softDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Evening Shift')).toBeInTheDocument();
  });
});
