import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AlertConfigField } from './AlertConfigField';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'notifications.alertConfig.label': 'Alerts',
        'notifications.alertConfig.atStartTime': 'At start time',
        'notifications.alertConfig.tenMinutesBefore': '10 minutes before',
        'notifications.alertConfig.oneHourBefore': '1 hour before',
        'notifications.alertConfig.oneDayBefore': '1 day before',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('AlertConfigField', () => {
  it('should render nothing when visible is false', () => {
    const { container } = render(
      <AlertConfigField alertOffsets={[]} onChange={vi.fn()} visible={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render all 4 alert options when visible is true', () => {
    render(<AlertConfigField alertOffsets={[]} onChange={vi.fn()} visible={true} />);

    expect(screen.getByRole('checkbox', { name: 'At start time' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '10 minutes before' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '1 hour before' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '1 day before' })).toBeInTheDocument();
  });

  it('should render the label text', () => {
    render(<AlertConfigField alertOffsets={[]} onChange={vi.fn()} visible={true} />);
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('should mark selected offsets as checked', () => {
    render(<AlertConfigField alertOffsets={[0, 60]} onChange={vi.fn()} visible={true} />);

    expect(screen.getByRole('checkbox', { name: 'At start time' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: '10 minutes before' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('checkbox', { name: '1 hour before' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: '1 day before' })).toHaveAttribute('aria-checked', 'false');
  });

  it('should add offset when unselected chip is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AlertConfigField alertOffsets={[0]} onChange={onChange} visible={true} />);

    await user.click(screen.getByRole('checkbox', { name: '10 minutes before' }));

    expect(onChange).toHaveBeenCalledWith([0, 10]);
  });

  it('should remove offset when selected chip is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AlertConfigField alertOffsets={[0, 10, 60]} onChange={onChange} visible={true} />);

    await user.click(screen.getByRole('checkbox', { name: '10 minutes before' }));

    expect(onChange).toHaveBeenCalledWith([0, 60]);
  });

  it('should allow selecting all 4 offsets', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AlertConfigField alertOffsets={[0, 10, 60]} onChange={onChange} visible={true} />);

    await user.click(screen.getByRole('checkbox', { name: '1 day before' }));

    expect(onChange).toHaveBeenCalledWith([0, 10, 60, 1440]);
  });

  it('should allow deselecting all offsets', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AlertConfigField alertOffsets={[10]} onChange={onChange} visible={true} />);

    await user.click(screen.getByRole('checkbox', { name: '10 minutes before' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('should have role group for accessibility', () => {
    render(<AlertConfigField alertOffsets={[]} onChange={vi.fn()} visible={true} />);
    expect(screen.getByRole('group', { name: 'Alerts' })).toBeInTheDocument();
  });
});
