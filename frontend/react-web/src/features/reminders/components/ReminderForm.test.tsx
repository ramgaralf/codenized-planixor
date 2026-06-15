import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { PREDEFINED_PALETTE } from '../constants';

// --- Mocks ---

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'reminder.form.createTitle': 'Create Reminder',
        'reminder.form.editTitle': 'Edit Reminder',
        'reminder.form.nameLabel': 'Name',
        'reminder.form.namePlaceholder': 'Enter reminder name',
        'reminder.form.iconLabel': 'Icon',
        'reminder.form.colorLabel': 'Background Color',
        'reminder.form.colorHint': 'Select a color from the palette',
        'reminder.form.cancel': 'Cancel',
        'reminder.form.submit': 'Save',
        'reminder.form.selectIcon': 'Select icon',
        'reminder.form.changeIcon': 'Change icon',
        'reminder.form.emojiPickerLabel': 'Emoji picker',
        'reminder.form.searchEmoji': 'Search emoji',
        'reminder.validation.name.required': 'Name is required',
        'reminder.validation.name.maxLength': 'Name must be 50 characters or less',
        'reminder.validation.icon.required': 'Select an icon',
        'reminder.validation.color.required': 'Select a background color',
        'reminder.error.saveFailed': 'Could not save the reminder',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@context/useTheme', () => ({
  useTheme: () => ({
    mode: 'light' as const,
    resolvedTheme: 'light' as const,
  }),
}));

vi.mock('@features/reminders/services/reminderService', () => ({
  create: vi.fn(),
  update: vi.fn(),
}));

import * as reminderService from '@features/reminders/services/reminderService';
import { ReminderForm } from './ReminderForm';

const mockedCreate = vi.mocked(reminderService.create);
const mockedUpdate = vi.mocked(reminderService.update);

const VALID_INITIAL_VALUES = {
  name: 'Morning Reminder',
  icon: '☀️',
  backgroundColor: '#EF4444',
};

const SINGLE_EMOJIS = ['😀', '🎉', '☀️', '🌙', '🔥', '💼', '🏠', '🚗', '⭐', '🎯'];

describe('ReminderForm', () => {
  const defaultProps = {
    onSubmitSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // --- Create mode renders empty fields ---

  describe('create mode', () => {
    it('should render empty name field when no initialValues provided', () => {
      render(<ReminderForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Name');
      expect(nameInput).toHaveValue('');
    });

    it('should display create title when no reminderId provided', () => {
      render(<ReminderForm {...defaultProps} />);

      expect(screen.getByText('Create Reminder')).toBeInTheDocument();
    });

    it('should render the form with submit button', () => {
      render(<ReminderForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should have submit disabled when fields are empty in create mode', () => {
      render(<ReminderForm {...defaultProps} />);

      const submitBtn = screen.getByRole('button', { name: 'Save' });
      expect(submitBtn).toBeDisabled();
    });
  });

  // --- Edit mode pre-populates all fields ---

  describe('edit mode', () => {
    it('should pre-populate name field with initial value', () => {
      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      const nameInput = screen.getByLabelText('Name');
      expect(nameInput).toHaveValue('Morning Reminder');
    });

    it('should pre-populate icon field with initial value', () => {
      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      // The EmojiPicker renders the icon in the toggle button
      expect(screen.getByText('☀️')).toBeInTheDocument();
    });

    it('should pre-populate backgroundColor with initial value', () => {
      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      // The ColorPicker uses a button+dropdown pattern; the button shows the selected color
      const colorButton = screen.getByRole('button', { name: /Selected color: #EF4444/i });
      expect(colorButton).toBeInTheDocument();
    });

    it('should display edit title when reminderId is provided', () => {
      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      expect(screen.getByText('Edit Reminder')).toBeInTheDocument();
    });

    it('should have submit enabled when all fields are pre-populated with valid values', () => {
      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: 'Save' });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // --- Validation error display on invalid input ---

  describe('validation error display', () => {
    it('should show name validation error when name is cleared and debounce fires', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, '   ');

      // Advance past debounce time
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('should show all field errors on submit with empty form', async () => {
      render(<ReminderForm {...defaultProps} />);

      // Force-click submit even though disabled - use form submit
      const form = screen.getByRole('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });
  });

  // --- Validation error clears on correction ---

  describe('validation error clears on correction', () => {
    it('should remove name error when valid name is typed after error', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <ReminderForm
          initialValues={{ ...VALID_INITIAL_VALUES, name: '' }}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      const nameInput = screen.getByLabelText('Name');

      // Type whitespace to trigger name required error
      await user.type(nameInput, '   ');
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });

      // Clear and type valid name
      await user.clear(nameInput);
      await user.type(nameInput, 'Valid Name');
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      });
    });
  });

  // --- Submit disabled when fields invalid ---

  describe('submit disabled when fields invalid', () => {
    it('should disable submit when name is empty', () => {
      render(
        <ReminderForm
          initialValues={{ name: '', icon: '☀️', backgroundColor: '#EF4444' }}
          {...defaultProps}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: 'Save' });
      expect(submitBtn).toBeDisabled();
    });

    it('should disable submit when icon is empty', () => {
      render(
        <ReminderForm
          initialValues={{ name: 'Test', icon: '', backgroundColor: '#EF4444' }}
          {...defaultProps}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: 'Save' });
      expect(submitBtn).toBeDisabled();
    });

    it('should disable submit when backgroundColor is empty', () => {
      render(
        <ReminderForm
          initialValues={{ name: 'Test', icon: '☀️', backgroundColor: '' }}
          {...defaultProps}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: 'Save' });
      expect(submitBtn).toBeDisabled();
    });

    it('should not disable submit when all fields have valid values', () => {
      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: 'Save' });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // --- Cancel discards data ---

  describe('cancel discards data', () => {
    it('should navigate to /reminders when cancel is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockNavigate).toHaveBeenCalledWith('/reminders');
    });

    it('should navigate to /reminders without calling create or update', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <ReminderForm
          initialValues={VALID_INITIAL_VALUES}
          reminderId="edit-1"
          {...defaultProps}
        />,
      );

      // Modify the name first
      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Name');

      // Cancel
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockNavigate).toHaveBeenCalledWith('/reminders');
      expect(mockedCreate).not.toHaveBeenCalled();
      expect(mockedUpdate).not.toHaveBeenCalled();
    });
  });

  // --- Property 5: Edit pre-populates all current field values (PBT) ---

  /**
   * Property 5: Edit pre-populates all current field values
   *
   * For any existing reminder record, navigating to the edit ReminderForm SHALL
   * produce a form where every field (name, icon, backgroundColor) matches the
   * current values of that reminder.
   *
   * **Validates: Requirements 1.2, 1.3, 3.1, 3.4, 7.4, 7.5**
   */
  describe('Property 5: Edit pre-populates all current field values', () => {
    it('should pre-populate name, icon, and backgroundColor for any valid reminder values', () => {
      const validNameArb = fc
        .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
        .filter((s) => s.trim().length >= 1 && s.trim().length <= 50)
        .map((s) => s.trim());

      const validIconArb = fc.constantFrom(...SINGLE_EMOJIS);
      const validColorArb = fc.constantFrom(...PREDEFINED_PALETTE);

      fc.assert(
        fc.property(validNameArb, validIconArb, validColorArb, (name, icon, backgroundColor) => {
          const { unmount } = render(
            <ReminderForm
              initialValues={{ name, icon, backgroundColor }}
              reminderId="prop-test-id"
              onSubmitSuccess={defaultProps.onSubmitSuccess}
            />,
          );

          // Name field pre-populated
          const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
          expect(nameInput.value).toBe(name);

          // Icon pre-populated (displayed in the EmojiPicker toggle button)
          expect(screen.getByText(icon)).toBeInTheDocument();

          // Background color pre-populated (the color button shows the selected color)
          const colorButton = screen.getByRole('button', {
            name: new RegExp(`Selected color: ${backgroundColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
          });
          expect(colorButton).toBeInTheDocument();

          unmount();
        }),
        { numRuns: 100 },
      );
    });
  });
});
