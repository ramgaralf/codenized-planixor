import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mockToggle = vi.fn();
let mockEnabled = false;
let mockIsLoading = false;

vi.mock('../hooks/useShiftMode', () => ({
  useShiftMode: () => ({
    enabled: mockEnabled,
    toggle: mockToggle,
    isLoading: mockIsLoading,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ShiftModeSection } from './ShiftModeSection';

describe('ShiftModeSection', () => {
  beforeEach(() => {
    mockEnabled = false;
    mockIsLoading = false;
    mockToggle.mockClear();
  });

  it('should render section title and description when loaded', () => {
    render(<ShiftModeSection />);

    expect(screen.getByText('shiftMode.toggle.label')).toBeInTheDocument();
    expect(screen.getByText('shiftMode.toggle.description')).toBeInTheDocument();
  });

  it('should render nothing when loading', () => {
    mockIsLoading = true;

    const { container } = render(<ShiftModeSection />);

    expect(container.innerHTML).toBe('');
  });

  it('should render switch with aria-checked false when disabled', () => {
    render(<ShiftModeSection />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('should render switch with aria-checked true when enabled', () => {
    mockEnabled = true;

    render(<ShiftModeSection />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('should call toggle when switch is clicked', async () => {
    const user = userEvent.setup();

    render(<ShiftModeSection />);

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should call toggle when Enter key is pressed on switch', async () => {
    const user = userEvent.setup();

    render(<ShiftModeSection />);

    const toggle = screen.getByRole('switch');
    toggle.focus();
    await user.keyboard('{Enter}');

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should call toggle when Space key is pressed on switch', async () => {
    const user = userEvent.setup();

    render(<ShiftModeSection />);

    const toggle = screen.getByRole('switch');
    toggle.focus();
    await user.keyboard(' ');

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should apply section class names when provided', () => {
    render(
      <ShiftModeSection
        sectionClassName="test-section"
        sectionTitleClassName="test-title"
      />,
    );

    const section = screen.getByRole('switch').closest('section');
    expect(section).toHaveClass('test-section');

    const title = screen.getByText('shiftMode.toggle.label');
    expect(title).toHaveClass('test-title');
  });

  it('should have accessible aria-label on the switch', () => {
    render(<ShiftModeSection />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-label', 'shiftMode.toggle.label');
  });
});
