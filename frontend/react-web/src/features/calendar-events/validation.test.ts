import { describe, it, expect } from 'vitest';
import {
  validateTimeRange,
  validateRequiredFields,
  validateNotes,
  checkOneShiftPerDay,
} from './validation';
import { CALENDAR_EVENT_I18N_KEYS } from './constants';
import type { CalendarEvent } from './models';

describe('validateTimeRange', () => {
  it('should return true when endTime is greater than startTime', () => {
    expect(validateTimeRange(480, 960)).toBe(true);
  });

  it('should return false when endTime equals startTime', () => {
    expect(validateTimeRange(480, 480)).toBe(false);
  });

  it('should return false when endTime is less than startTime', () => {
    expect(validateTimeRange(960, 480)).toBe(false);
  });

  it('should return true for minimum valid range (1 minute difference)', () => {
    expect(validateTimeRange(0, 1)).toBe(true);
  });

  it('should return true for full day range', () => {
    expect(validateTimeRange(0, 1439)).toBe(true);
  });
});

describe('validateRequiredFields', () => {
  it('should return valid when all required fields are present', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      day: '2024-01-15',
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
      day: '2024-01-15',
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
      day: '2024-01-15',
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.eventTypeId).toBe(
      CALENDAR_EVENT_I18N_KEYS.VALIDATION_EVENT_TYPE_ID_REQUIRED,
    );
  });

  it('should return error when day is missing', () => {
    const event = {
      eventType: 'reminder' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      startTime: 480,
      endTime: 960,
    };

    const result = validateRequiredFields(event);

    expect(result.isValid).toBe(false);
    expect(result.errors.day).toBe(CALENDAR_EVENT_I18N_KEYS.VALIDATION_DAY_REQUIRED);
  });

  it('should return error when startTime is undefined', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      day: '2024-01-15',
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
      day: '2024-01-15',
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
      day: '2024-01-15',
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
      day: '2024-01-15',
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
    expect(Object.keys(result.errors)).toHaveLength(5);
  });

  it('should accept startTime of 0 as valid', () => {
    const event = {
      eventType: 'shift' as const,
      eventTypeId: '123e4567-e89b-12d3-a456-426614174000',
      day: '2024-01-15',
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
      day: '2024-01-15',
      startTime: 0,
      endTime: 1439,
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

  it('should return true when notes is exactly 200 characters', () => {
    const notes = 'a'.repeat(200);
    expect(validateNotes(notes)).toBe(true);
  });

  it('should return false when notes exceeds 200 characters', () => {
    const notes = 'a'.repeat(201);
    expect(validateNotes(notes)).toBe(false);
  });
});

describe('checkOneShiftPerDay', () => {
  const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: 'event-1',
    eventType: 'shift',
    eventTypeId: 'shift-type-1',
    day: '2024-01-15',
    startTime: 480,
    endTime: 960,
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

  it('should return false when a non-deleted shift exists for the day', () => {
    const existingEvents = [createEvent({ day: '2024-01-15' })];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(false);
  });

  it('should return true when existing shift for the day is deleted', () => {
    const existingEvents = [createEvent({ day: '2024-01-15', isDeleted: true })];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(true);
  });

  it('should return true when existing shift is on a different day', () => {
    const existingEvents = [createEvent({ day: '2024-01-16' })];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(true);
  });

  it('should return true when existing event for the day is a reminder', () => {
    const existingEvents = [createEvent({ day: '2024-01-15', eventType: 'reminder' })];

    const result = checkOneShiftPerDay('2024-01-15', 'shift', existingEvents);

    expect(result).toBe(true);
  });

  it('should return true when the conflicting shift is excluded by id', () => {
    const existingEvents = [createEvent({ id: 'event-to-exclude', day: '2024-01-15' })];

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
      createEvent({ id: 'event-to-exclude', day: '2024-01-15' }),
      createEvent({ id: 'another-shift', day: '2024-01-15' }),
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
