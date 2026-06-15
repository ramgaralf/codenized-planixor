import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ShiftForm } from '@features/shifts/components/ShiftForm';
import { useShiftForm } from '@features/shifts/hooks/useShiftForm';

const minutesToTimeString = (minutes: number | null): string => {
  if (minutes === null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const timeStringToMinutes = (value: string): number | null => {
  if (!value) return null;
  const parts = value.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
};

export const ShiftNewPage = () => {
  const navigate = useNavigate();
  const { fields, errors, setField, submit, isSubmitting } = useShiftForm();

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      if (field === 'startTime' || field === 'endTime') {
        setField(field, timeStringToMinutes(value));
      } else if (field === 'hoursWorked') {
        setField(field, timeStringToMinutes(value));
      } else {
        setField(field as 'name' | 'icon' | 'backgroundColor', value);
      }
    },
    [setField],
  );

  const handleSubmit = useCallback(async () => {
    const success = await submit();
    if (success) {
      navigate('/shifts');
    }
  }, [submit, navigate]);

  const handleCancel = useCallback(() => {
    navigate('/shifts');
  }, [navigate]);

  const formFields = {
    name: fields.name,
    icon: fields.icon,
    backgroundColor: fields.backgroundColor,
    startTime: minutesToTimeString(fields.startTime),
    endTime: minutesToTimeString(fields.endTime),
    hoursWorked: minutesToTimeString(fields.hoursWorked),
  };

  return (
    <div className="flex h-full items-start justify-center overflow-auto p-6">
      <ShiftForm
        fields={formFields}
        errors={errors}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        mode="create"
      />
    </div>
  );
};
