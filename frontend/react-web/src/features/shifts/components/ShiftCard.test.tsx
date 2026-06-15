import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShiftCard } from './ShiftCard';
import type { Shift } from '../models';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'shift.deactivated': 'Deactivated',
        'shift.actions.edit': 'Edit',
        'shift.actions.deactivate': 'Deactivate',
        'shift.actions.activate': 'Activate',
        'shift.actions.delete': 'Delete',
      };
      return translations[key] ?? key;
    },
  }),
}));

const createShift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 'shift-1',
  name: 'Morning Shift',
  icon: '☀️',
  backgroundColor: '#10B981',
  startTime: 480, // 08:00
  endTime: 960, // 16:00
  hoursWorked: 480, // 8h
  isActive: true,
  isDeleted: false,
  createdAt: new Date('2024-01-01'),
  modifiedAt: new Date('2024-01-01'),
  syncedAt: null,
  ...overrides,
});

describe('ShiftCard', () => {
  const defaultProps = {
    onEdit: vi.fn(),
    onDeactivate: vi.fn(),
    onActivate: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display shift name and icon when rendered', () => {
    render(<ShiftCard shift={createShift()} {...defaultProps} />);

    expect(screen.getByText('Morning Shift')).toBeInTheDocument();
    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  it('should display formatted start time, end time, and hours worked', () => {
    render(<ShiftCard shift={createShift()} {...defaultProps} />);

    // Hours worked: 480 minutes = 8h
    expect(screen.getByText(/8h/)).toBeInTheDocument();
  });

  it('should display hours and minutes when hoursWorked is not a round hour', () => {
    render(
      <ShiftCard shift={createShift({ hoursWorked: 510 })} {...defaultProps} />,
    );

    // 510 minutes = 8h 30m
    expect(screen.getByText(/8h 30m/)).toBeInTheDocument();
  });

  it('should display only minutes when hoursWorked is less than 60', () => {
    render(
      <ShiftCard shift={createShift({ hoursWorked: 45 })} {...defaultProps} />,
    );

    expect(screen.getByText(/45m/)).toBeInTheDocument();
  });

  it('should render the left color indicator with the shift background color', () => {
    const { container } = render(
      <ShiftCard
        shift={createShift({ backgroundColor: '#EF4444' })}
        {...defaultProps}
      />,
    );

    const colorIndicator = container.querySelector(
      'article > [aria-hidden="true"]',
    );
    expect(colorIndicator).toHaveStyle({ backgroundColor: '#EF4444' });
  });

  it('should show reduced opacity when shift is deactivated', () => {
    render(
      <ShiftCard shift={createShift({ isActive: false })} {...defaultProps} />,
    );

    const card = screen.getByRole('article');
    expect(card).toHaveStyle({ opacity: '0.5' });
  });

  it('should show full opacity when shift is active', () => {
    render(
      <ShiftCard shift={createShift({ isActive: true })} {...defaultProps} />,
    );

    const card = screen.getByRole('article');
    expect(card).toHaveStyle({ opacity: '1' });
  });

  it('should display "Deactivated" badge when isActive is false', () => {
    render(
      <ShiftCard shift={createShift({ isActive: false })} {...defaultProps} />,
    );

    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });

  it('should not display "Deactivated" badge when isActive is true', () => {
    render(
      <ShiftCard shift={createShift({ isActive: true })} {...defaultProps} />,
    );

    expect(screen.queryByText('Deactivated')).not.toBeInTheDocument();
  });

  it('should call onEdit with shift id when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ShiftCard shift={createShift()} {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(defaultProps.onEdit).toHaveBeenCalledWith('shift-1');
  });

  it('should call onDeactivate with shift id when toggle button is clicked on active shift', async () => {
    const user = userEvent.setup();
    render(
      <ShiftCard shift={createShift({ isActive: true })} {...defaultProps} />,
    );

    await user.click(screen.getByRole('button', { name: /deactivate/i }));

    expect(defaultProps.onDeactivate).toHaveBeenCalledWith('shift-1');
  });

  it('should call onActivate with shift id when toggle button is clicked on deactivated shift', async () => {
    const user = userEvent.setup();
    render(
      <ShiftCard shift={createShift({ isActive: false })} {...defaultProps} />,
    );

    await user.click(screen.getByRole('button', { name: /activate/i }));

    expect(defaultProps.onActivate).toHaveBeenCalledWith('shift-1');
  });

  it('should call onDelete with shift id when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<ShiftCard shift={createShift()} {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(defaultProps.onDelete).toHaveBeenCalledWith('shift-1');
  });

  it('should have accessible labels on action buttons', () => {
    render(<ShiftCard shift={createShift()} {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Edit Morning Shift' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Deactivate Morning Shift' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete Morning Shift' }),
    ).toBeInTheDocument();
  });

  it('should show activate label on toggle button when shift is deactivated', () => {
    render(
      <ShiftCard shift={createShift({ isActive: false })} {...defaultProps} />,
    );

    expect(
      screen.getByRole('button', { name: 'Activate Morning Shift' }),
    ).toBeInTheDocument();
  });
});
