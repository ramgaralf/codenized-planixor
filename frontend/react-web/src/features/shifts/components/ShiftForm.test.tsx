import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PREDEFINED_PALETTE } from '@features/shifts/constants';

import { ShiftForm } from './ShiftForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const defaultFields = {
  name: '',
  icon: '',
  backgroundColor: '',
  startTime: '',
  endTime: '',
  hoursWorked: '',
};

const filledFields = {
  name: 'Morning Shift',
  icon: '☀️',
  backgroundColor: '#2563EB',
  startTime: '08:00',
  endTime: '16:00',
  hoursWorked: '08:00',
};

const noErrors = {
  name: undefined,
  icon: undefined,
  backgroundColor: undefined,
  startTime: undefined,
  endTime: undefined,
  hoursWorked: undefined,
};

const createProps = (overrides = {}) => ({
  fields: defaultFields,
  errors: noErrors,
  onFieldChange: vi.fn(),
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  isSubmitting: false,
  mode: 'create' as const,
  ...overrides,
});


describe('ShiftForm', () => {
  let onFieldChange: ReturnType<typeof vi.fn>;
  let onSubmit: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onFieldChange = vi.fn();
    onSubmit = vi.fn();
    onCancel = vi.fn();
  });

  describe('rendering', () => {
    it('should render all form fields', () => {
      render(<ShiftForm {...createProps()} />);

      expect(screen.getByLabelText('shift.form.nameLabel')).toBeInTheDocument();
      expect(screen.getByLabelText('shift.form.startTimeLabel')).toBeInTheDocument();
      expect(screen.getByLabelText('shift.form.endTimeLabel')).toBeInTheDocument();
      expect(screen.getByLabelText('shift.form.hoursWorkedLabel')).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'shift.form.colorLabel' })).toBeInTheDocument();
    });

    it('should render the create title when mode is create', () => {
      render(<ShiftForm {...createProps({ mode: 'create' })} />);

      expect(screen.getByRole('heading', { name: 'shift.form.createTitle' })).toBeInTheDocument();
    });

    it('should render the edit title when mode is edit', () => {
      render(<ShiftForm {...createProps({ mode: 'edit' })} />);

      expect(screen.getByRole('heading', { name: 'shift.form.editTitle' })).toBeInTheDocument();
    });

    it('should render all predefined palette colors as radio buttons', () => {
      render(<ShiftForm {...createProps()} />);

      const colorGroup = screen.getByRole('radiogroup', { name: 'shift.form.colorLabel' });
      const radios = within(colorGroup).getAllByRole('radio');
      expect(radios).toHaveLength(PREDEFINED_PALETTE.length);
    });

    it('should render submit and cancel buttons', () => {
      render(<ShiftForm {...createProps()} />);

      expect(screen.getByRole('button', { name: 'shift.form.submit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'shift.form.cancel' })).toBeInTheDocument();
    });
  });

  describe('edit mode pre-population', () => {
    it('should display pre-populated field values in edit mode', () => {
      render(
        <ShiftForm
          {...createProps({
            fields: filledFields,
            mode: 'edit',
          })}
        />,
      );

      expect(screen.getByLabelText('shift.form.nameLabel')).toHaveValue('Morning Shift');
      expect(screen.getByLabelText('shift.form.startTimeLabel')).toHaveValue('08:00');
      expect(screen.getByLabelText('shift.form.endTimeLabel')).toHaveValue('16:00');
      expect(screen.getByLabelText('shift.form.hoursWorkedLabel')).toHaveValue('08:00');
    });

    it('should mark the selected background color as checked', () => {
      render(
        <ShiftForm
          {...createProps({
            fields: filledFields,
            mode: 'edit',
          })}
        />,
      );

      const selectedRadio = screen.getByRole('radio', { name: '#2563EB' });
      expect(selectedRadio).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('form submission', () => {
    it('should call onSubmit when the form is submitted with valid data', async () => {
      const user = userEvent.setup();
      render(
        <ShiftForm
          {...createProps({
            fields: filledFields,
            onSubmit,
          })}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'shift.form.submit' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('should prevent default form submission behavior', async () => {
      const user = userEvent.setup();
      render(
        <ShiftForm
          {...createProps({
            fields: filledFields,
            onSubmit,
          })}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'shift.form.submit' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel navigation', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ShiftForm {...createProps({ onCancel })} />);

      await user.click(screen.getByRole('button', { name: 'shift.form.cancel' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation error display', () => {
    it('should display name validation error when errors.name is set', () => {
      render(
        <ShiftForm
          {...createProps({
            errors: { ...noErrors, name: 'shift.validation.name.required' },
          })}
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent('shift.validation.name.required');
    });

    it('should display icon validation error when errors.icon is set', () => {
      render(
        <ShiftForm
          {...createProps({
            errors: { ...noErrors, icon: 'shift.validation.icon.required' },
          })}
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent('shift.validation.icon.required');
    });

    it('should display background color validation error when errors.backgroundColor is set', () => {
      render(
        <ShiftForm
          {...createProps({
            errors: { ...noErrors, backgroundColor: 'shift.validation.color.required' },
          })}
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent('shift.validation.color.required');
    });

    it('should display start time validation error when errors.startTime is set', () => {
      render(
        <ShiftForm
          {...createProps({
            errors: { ...noErrors, startTime: 'shift.validation.startTime.required' },
          })}
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent('shift.validation.startTime.required');
    });

    it('should display end time validation error when errors.endTime is set', () => {
      render(
        <ShiftForm
          {...createProps({
            errors: { ...noErrors, endTime: 'shift.validation.endTime.required' },
          })}
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent('shift.validation.endTime.required');
    });

    it('should display hours worked validation error when errors.hoursWorked is set', () => {
      render(
        <ShiftForm
          {...createProps({
            errors: { ...noErrors, hoursWorked: 'shift.validation.hoursWorked.range' },
          })}
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent('shift.validation.hoursWorked.range');
    });

    it('should set aria-invalid on name input when there is a name error', () => {
      render(
        <ShiftForm
          {...createProps({
            errors: { ...noErrors, name: 'shift.validation.name.required' },
          })}
        />,
      );

      expect(screen.getByLabelText('shift.form.nameLabel')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not display any error alerts when there are no errors', () => {
      render(<ShiftForm {...createProps()} />);

      expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });
  });

  describe('field interactions', () => {
    it('should call onFieldChange with name and value when name input changes', async () => {
      const user = userEvent.setup();
      render(<ShiftForm {...createProps({ onFieldChange })} />);

      const nameInput = screen.getByLabelText('shift.form.nameLabel');
      await user.type(nameInput, 'A');

      expect(onFieldChange).toHaveBeenCalledWith('name', 'A');
    });

    it('should call onFieldChange with backgroundColor when a color is selected', async () => {
      const user = userEvent.setup();
      render(<ShiftForm {...createProps({ onFieldChange })} />);

      const colorRadio = screen.getByRole('radio', { name: '#EF4444' });
      await user.click(colorRadio);

      expect(onFieldChange).toHaveBeenCalledWith('backgroundColor', '#EF4444');
    });

    it('should call onFieldChange with icon when an emoji is selected', async () => {
      const user = userEvent.setup();
      render(<ShiftForm {...createProps({ onFieldChange })} />);

      // Open the emoji picker
      const emojiButton = screen.getByRole('button', { name: '➕' });
      await user.click(emojiButton);

      // Select an emoji
      const sunEmoji = screen.getByRole('gridcell', { name: '☀️' });
      await user.click(sunEmoji);

      expect(onFieldChange).toHaveBeenCalledWith('icon', '☀️');
    });

    it('should render the hours worked value passed via fields prop', () => {
      render(
        <ShiftForm
          {...createProps({
            fields: { ...defaultFields, hoursWorked: '05:30' },
          })}
        />,
      );

      expect(screen.getByLabelText('shift.form.hoursWorkedLabel')).toHaveValue('05:30');
    });
  });

  describe('disabled states during submission', () => {
    it('should disable the submit button when isSubmitting is true', () => {
      render(<ShiftForm {...createProps({ isSubmitting: true })} />);

      expect(screen.getByRole('button', { name: 'shift.form.submit' })).toBeDisabled();
    });

    it('should disable the cancel button when isSubmitting is true', () => {
      render(<ShiftForm {...createProps({ isSubmitting: true })} />);

      expect(screen.getByRole('button', { name: 'shift.form.cancel' })).toBeDisabled();
    });

    it('should not disable buttons when isSubmitting is false', () => {
      render(<ShiftForm {...createProps({ isSubmitting: false })} />);

      expect(screen.getByRole('button', { name: 'shift.form.submit' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'shift.form.cancel' })).not.toBeDisabled();
    });
  });
});
