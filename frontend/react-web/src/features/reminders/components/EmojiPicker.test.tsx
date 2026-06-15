import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { EmojiPicker } from './EmojiPicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('emoji-picker-react', () => ({
  __esModule: true,
  default: ({ onEmojiClick }: { onEmojiClick: (data: { emoji: string }) => void }) => (
    <div data-testid="emoji-picker-react">
      <button
        type="button"
        onClick={() => onEmojiClick({ emoji: '🔔' })}
      >
        🔔
      </button>
    </div>
  ),
  Theme: { DARK: 'dark', LIGHT: 'light' },
}));

describe('EmojiPicker', () => {
  it('should render a trigger button with placeholder when no value is selected', () => {
    render(<EmojiPicker value="" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'reminder.form.selectIcon' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('➕');
  });

  it('should render the currently selected emoji in the trigger button', () => {
    render(<EmojiPicker value="🎉" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'reminder.form.changeIcon' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('🎉');
  });

  it('should open the emoji picker when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<EmojiPicker value="" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'reminder.form.selectIcon' });
    await user.click(button);

    expect(screen.getByTestId('emoji-picker-react')).toBeInTheDocument();
  });

  it('should close the picker and call onChange when an emoji is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EmojiPicker value="" onChange={onChange} />);

    const trigger = screen.getByRole('button', { name: 'reminder.form.selectIcon' });
    await user.click(trigger);

    const emojiButton = screen.getByText('🔔');
    await user.click(emojiButton);

    expect(onChange).toHaveBeenCalledWith('🔔');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close the picker when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <EmojiPicker value="" onChange={vi.fn()} />
        <button type="button">Outside</button>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: 'reminder.form.selectIcon' });
    await user.click(trigger);
    expect(screen.getByTestId('emoji-picker-react')).toBeInTheDocument();

    const outsideButton = screen.getByText('Outside');
    await user.click(outsideButton);

    expect(screen.queryByTestId('emoji-picker-react')).not.toBeInTheDocument();
  });

  it('should set aria-expanded to true when picker is open', async () => {
    const user = userEvent.setup();
    render(<EmojiPicker value="" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'reminder.form.selectIcon' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should toggle the picker closed when the trigger is clicked while open', async () => {
    const user = userEvent.setup();
    render(<EmojiPicker value="" onChange={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'reminder.form.selectIcon' });
    await user.click(button);
    expect(screen.getByTestId('emoji-picker-react')).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByTestId('emoji-picker-react')).not.toBeInTheDocument();
  });
});
