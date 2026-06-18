import { describe, it, expect } from 'vitest';
import {
  validateDayRange,
  validateTimeForReminder,
  computeTotalHours,
  computeEndDayForShift,
  validateRequiredFields,
  validateNotes,
  checkOneShiftPerDay,
} from './validation';
import { CALENDAR_EVENT_I18N_KEYS } from './constants';
import type { CalendarEvent } from './models';

describe('validateDayRange', () => {
  it('should return true when endDay equals startDay', () => {
    expect(validateDayRange('2024-01-15', '2024-01-15')).toBe(true);
  });

  it('should return true when endDay is after startDay', () => {
    expect(validateDayRange('2024-01-15', '2024-01-20')).toBe(true);
  });

  it('should return false when endDay is before startDay', () => {
    expect(validateDayRange('2024-01-20', '2024-01-15')).toBe(false);
  });

  it('should return true for consecutive days', () => {
    expect(validateDayRange('2024-01-15', '2024-01-16')).toBe(true);
  });

  it('should return true across month boundaries', () => {
    expect(validateDayRange('2024-01-31', '2024-02-01')).toBe(true);
  });
});

describe('validateTimeForReminder', () => {
  it('should return true when endDay is greater than startDay (any times)', () => {
    expect(validateTimeForReminder('2024-01-15', '2024-01-16', 960, 480)).toBe(true);
  });

  it('should return true when same day and endTime > startTime', () => {
    expect(validateTimeForReminder('2024-01-15', '2024-01-15', 480, 960)).toBe(true);
  });

  it('should return false when same day and endTime equals startTime', () => {
    expect(validateTimeForReminder('2024-01-15', '2024-01-15', 480, 480)).toBe(false);
  });

  it('should return false when same day and endTime < startTime', () => {
    expect(validateTimeForReminder('2024-01-15', '2024-01-15', 960, 480)).toBe(false);
  });

  it('should return true for multi-day with equal times', () => {
    expect(validateTimeForReminder('2024-01-15', '2024-01-16', 480, 480)).toBe(true);
  });

  it('should return true for minimum valid same-day range (1 minute difference)', () => {
    expect(validateTimeForReminder('2024-01-15', '2024-01-15', 0, 1)).toBe(true);
  });
});

describe('computeTotalHours', () => {
  it('should return shiftHoursWorked for shift events', () => {
    expect(computeTotalHours('shift', '2024-01-15', '2024-01-15', 480, 960, 480)).toBe(480);
  });

  it('should return 0 for shift events when shiftHoursWorked is undefined', () => {
    expect(computeTotalHours('shift', '2024-01-15', '2024-01-15', 480, 960)).toBe(0);
  });

  it('should calculate minutes from time difference for same-day reminder', () => {
    // 960 - 480 = 480 minutes (8 hours)
    expect(computeTotalHours('reminder', '2024-01-15', '2024-01-15', 480, 960)).toBe(480);
  });

  it('should calculate minutes including day difference for multi-day reminder', () => {
    // 1 day × 1440 + (960 - 480) = 1440 + 480 = 1920
    expect(computeTotalHours('reminder', '2024-01-15', '2024-01-16', 480, 960)).toBe(1920);
  });

  it('should handle multi-day reminder where endTime < startTime', () => {
    // 1 day × 1440 + (480 - 960) = 1440 - 480 = 960
    expect(computeTotalHours('reminder', '2024-01-15', '2024-01-16', 960, 480)).toBe(960);
  });

  it('should handle zero-minute same-day reminder', () => {
    expect(computeTotalHours('reminder', '2024-01-15', '2024-01-15', 480, 480)).toBe(0);
  });
});

describe('computeEndDayForShift', () => {
  it('should return startDay when endTime >= startTime (no crossing midnight)', () => {
    expect(computeEndDayForShift('2024-01-15', 480, 960)).toBe('2024-01-15');
  });

  it('should return startDay + 1 when endTime < startTime (crossing midnight)', () => {
    expect(computeEndDayForShift('2024-01-15', 960, 480)).toBe('2024-01-16');
  });

  it('should return startDay when endTime equals startTime', () => {
    expect(computeEndDayForShift('2024-01-15', 480, 480)).toBe('2024-01-15');
  });

  it('should handle month boundary crossing', () => {
    expect(computeEndDayForShift('2024-01-31', 960, 480)).toBe('2024-02-01');
  });

  it('should handle year boundary crossing', () => {
    expect(computeEndDayForShift('2024-12-31', 960, 480)).toBe('2025-01-01');
  });

  it('should handle shift starting at end of day crossing midnight', () => {
    expect(computeEndDayForShift('2024-01-15', 1439, 0)).toBe('2024-01-16');
  });
});

describe('validateRequiredFields', () => {
  it('should return valid when all required fields are present', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return error when eventType is missing', () => {
    const event = {
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.eventType).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_EVENT_TYPE_REQUIRED,
    );
  });

  it('should return error when eventTypeId is missing', () => {
    const event = {
      eventType: 'shift' as const,
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.eventTypeId).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_EVENT_TYPE_ID_REQUIRED,
    );
  });

  it('should return error when startDay is missing', () => {
    const event = {
      eventType: 'reminder' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.startDay).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_START_DAY_REQUIRED,
    );
  });

  it('should return error when endDay is missing', () => {
    const event = {
      eventType: 'reminder' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      totalHours: 480,
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.endDay).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_DAY_REQUIRED,
    );
  });

  it('should return error when totalHours is undefined', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.totalHours).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_TOTAL_HOURS_REQUIRED,
    );
  });

  it('should return error when startTime is undefined', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.startTime).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED,
    );
  });

  it('should return error when endTime is undefined', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: 480,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.endTime).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED,
    );
  });

  it('should return error when startTime is below minimum (negative)', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: -1,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.startTime).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_START_TIME_REQUIRED,
    );
  });

  it('should return error when endTime exceeds maximum', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: 480,
      endTime: 1440,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.endTime).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_END_TIME_REQUIRED,
    );
  });

  it('should return multiple errors when multiple fields are missing', () => {
    const event = {};

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors)).toHaveLength(7);
  });

  it('should accept startTime of 0 as valid', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: 0,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(true);
  });

  it('should accept endTime of 1439 as valid', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 480,
      startTime: 0,
      endTime: 1439,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(true);
  });

  it('should accept totalHours of 0 as valid', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startDay: '2024-01-15',
      endDay: '2024-01-15',
      totalHours: 0,
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(true);
  });
});

describe('validateNotes', () => {
  it('should return true when notes is null', () => {
    expect(validateNotes(null)).toBe(true);
  });

  it('should return true when notes is empty string', () => {
    expect(validateNotes('')).toBe(true);
  });

  it('should return true when notes is within limit', () => {
    expect(validateNotes('Meeting with team')).toBe(true);
  });

  it('should return true when notes is exactly 250 characters', () => {
    const notes = 'a'.repeat(250);
    expect(validateNotes(notes)).toBe(true);
  });

  it('should return false when notes exceeds 250 characters', () => {
    const notes = 'a'.repeat(251);
    expect(validateNotes(notes)).toBe(false);
  });
});

describe('checkOneShiftPerDay', () => {
  const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: 'event-1',
    eventType: 'shift',
    eventTypeId: 'shift-type-1',
    startDay: '2024-01-15',
    endDay: '2024-01-15',
    startTime: 480,
    endTime: 960,
    totalHours: 480,
    notes: null,
    modifiedAt: new Date(),
    syncedAt: null,
    isDeleted: false,
    ...overrides,
  });

  it('should return true when eventType is reminder', () => {
    const existingEvents = [createEvent()];

    const result = checkOneShiftPerDay('2024-01-15', 'reminder', existingEvents);

    expect(result).toBe(true);
  });

  it('should return true when no existing shift events for the day', () => {
    const existingEvents: CalendarEvent[] = [];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(true);
  });

  it('should return false when a non-deleted shift exists for the startDay', () => {
    const existingEvents = [createEvent({ startDay: '2024-01-15' })];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(false);
  });

  it('should return true when existing shift for the day is deleted', () => {
    const existingEvents = [createEvent({ startDay: '2024-01-15', isDeleted: true })];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(true);
  });

  it('should return true when existing shift is on a different day', () => {
    const existingEvents = [createEvent({ startDay: '2024-01-16' })];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(true);
  });

  it('should return true when existing event for the day is a reminder', () => {
    const existingEvents = [createEvent({ startDay: '2024-01-15', eventType: 'reminder' })];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(true);
  });

  it('should return true when the conflicting shift is excluded by id', () => {
    const existingEvents = [createEvent({ id: 'event-to-exclude', startDay: '2024-01-15' })];

    const result = checkOneShiftPerDay(
      '2024-01-15',
      'shift',
      existingEvents,
      'event-to-exclude',
    );

    expect(result).toBe(true);
  });

  it('should return false when a different shift exists even with excludeEventId', () => {
    const existingEvents = [
      createEvent({ id: 'event-to-exclude', startDay: '2024-01-15' }),
      createEvent({ id: 'another-shift', startDay: '2024-01-15' }),
    ];

    const result = checkOneShiftPerDay(
      '2024-01-15',
      'shift',
      existingEvents,
      'event-to-exclude',
    );

    expect(result).toBe(false);
  });
});
