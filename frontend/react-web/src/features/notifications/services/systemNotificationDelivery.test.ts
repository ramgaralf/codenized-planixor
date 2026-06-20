import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deliverSystemNotification,
  detectLocale,
  formatDateTime,
  formatTimeRemaining,
  truncateTitle,
} from './systemNotificationDelivery';

describe('systemNotificationDelivery', () => {
  describe('truncateTitle', () => {
    it('should return the event name unchanged when 65 chars or fewer', () => {
      const name = 'A'.repeat(65);

      expect(truncateTitle(name)).toBe(name);
      expect(truncateTitle(name)).toHaveLength(65);
    });

    it('should truncate to 65 chars when event name exceeds the limit', () => {
      const name = 'B'.repeat(100);

      const result = truncateTitle(name);

      expect(result).toHaveLength(65);
      expect(result).toBe('B'.repeat(65));
    });

    it('should handle empty string', () => {
      expect(truncateTitle('')).toBe('');
    });

    it('should handle exactly 65 characters without truncation', () => {
      const name = 'Meeting with the engineering team to discuss project milestones!';
      const padded = name.padEnd(65, '.');

      expect(truncateTitle(padded)).toBe(padded);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time with Spanish locale', () => {
      const result = formatDateTime('2025-06-20', 600, 'es');

      expect(result).toContain('10:00');
      expect(result).toContain('2025');
      expect(result).toContain('·');
    });

    it('should format date and time with English locale', () => {
      const result = formatDateTime('2025-06-20', 600, 'en');

      expect(result).toContain('10:00');
      expect(result).toContain('2025');
      expect(result).toContain('·');
    });

    it('should zero-pad hours and minutes', () => {
      const result = formatDateTime('2025-01-05', 65, 'en');

      expect(result).toContain('01:05');
    });

    it('should handle midnight (0 minutes)', () => {
      const result = formatDateTime('2025-03-15', 0, 'en');

      expect(result).toContain('00:00');
    });

    it('should handle end of day (1439 minutes = 23:59)', () => {
      const result = formatDateTime('2025-12-31', 1439, 'es');

      expect(result).toContain('23:59');
    });
  });

  describe('formatTimeRemaining', () => {
    it('should return "Now" for offset 0 with English locale', () => {
      expect(formatTimeRemaining(0, 'en')).toBe('Now');
    });

    it('should return "Ahora" for offset 0 with Spanish locale', () => {
      expect(formatTimeRemaining(0, 'es')).toBe('Ahora');
    });

    it('should return "In 10 minutes" for offset 10 with English locale', () => {
      expect(formatTimeRemaining(10, 'en')).toBe('In 10 minutes');
    });

    it('should return "En 10 minutos" for offset 10 with Spanish locale', () => {
      expect(formatTimeRemaining(10, 'es')).toBe('En 10 minutos');
    });

    it('should return "In 1 hour" for offset 60 with English locale', () => {
      expect(formatTimeRemaining(60, 'en')).toBe('In 1 hour');
    });

    it('should return "En 1 hora" for offset 60 with Spanish locale', () => {
      expect(formatTimeRemaining(60, 'es')).toBe('En 1 hora');
    });

    it('should return "In 1 day" for offset 1440 with English locale', () => {
      expect(formatTimeRemaining(1440, 'en')).toBe('In 1 day');
    });

    it('should return "En 1 día" for offset 1440 with Spanish locale', () => {
      expect(formatTimeRemaining(1440, 'es')).toBe('En 1 día');
    });

    it('should handle unknown offsets with English locale', () => {
      expect(formatTimeRemaining(30, 'en')).toBe('In 30 minutes');
    });

    it('should handle unknown offsets with Spanish locale', () => {
      expect(formatTimeRemaining(30, 'es')).toBe('En 30 minutos');
    });

    it('should handle locale with region code (es-MX)', () => {
      expect(formatTimeRemaining(60, 'es-MX')).toBe('En 1 hora');
    });

    it('should fall back to English for unrecognized locale', () => {
      expect(formatTimeRemaining(60, 'fr')).toBe('In 1 hour');
    });
  });

  describe('detectLocale', () => {
    const originalLang = document.documentElement.lang;

    afterEach(() => {
      document.documentElement.lang = originalLang;
    });

    it('should return document lang attribute when available', () => {
      document.documentElement.lang = 'es';

      expect(detectLocale()).toBe('es');
    });

    it('should return "en" when document lang is empty', () => {
      document.documentElement.lang = '';

      expect(detectLocale()).toBe('en');
    });
  });

  describe('deliverSystemNotification', () => {
    let mockNotificationConstructor: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockNotificationConstructor = vi.fn();

      Object.defineProperty(globalThis, 'Notification', {
        value: mockNotificationConstructor,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis.Notification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      (globalThis as Record<string, unknown>)['Notification'] = undefined;
    });

    it('should return false when Notification API is not available', () => {
      (globalThis as Record<string, unknown>)['Notification'] = undefined;

      const result = deliverSystemNotification(
        '☀️',
        'My Event',
        '2025-06-20',
        600,
        10,
        'en',
      );

      expect(result).toBe(false);
    });

    it('should return false when permission is not granted', () => {
      Object.defineProperty(globalThis.Notification, 'permission', {
        value: 'denied',
        writable: true,
        configurable: true,
      });

      const result = deliverSystemNotification(
        '☀️',
        'My Event',
        '2025-06-20',
        600,
        10,
        'en',
      );

      expect(result).toBe(false);
    });

    it('should return false when permission is "default"', () => {
      Object.defineProperty(globalThis.Notification, 'permission', {
        value: 'default',
        writable: true,
        configurable: true,
      });

      const result = deliverSystemNotification(
        '☀️',
        'My Event',
        '2025-06-20',
        600,
        10,
        'en',
      );

      expect(result).toBe(false);
    });

    it('should create a Notification with emoji title and multiline body', () => {
      const result = deliverSystemNotification(
        '☀️',
        'Turno Mañana',
        '2025-06-20',
        600,
        60,
        'es',
      );

      expect(result).toBe(true);
      expect(mockNotificationConstructor).toHaveBeenCalledTimes(1);

      const [title, options] = mockNotificationConstructor.mock.calls[0];
      expect(title).toBe('☀️ Turno Mañana');
      expect(options.body).toContain('En 1 hora');
      expect(options.body).toContain('10:00');
      expect(options.icon).toBe('/icons/icon-192x192.png');
    });

    it('should truncate event name to 65 chars in the title', () => {
      const longName = 'X'.repeat(100);

      deliverSystemNotification('📅', longName, '2025-01-01', 0, 0, 'en');

      const [title] = mockNotificationConstructor.mock.calls[0];
      expect(title).toBe(`📅 ${'X'.repeat(65)}`);
    });

    it('should use the 192x192 Planixor icon', () => {
      deliverSystemNotification('💊', 'Take Medicine', '2025-06-20', 600, 0, 'en');

      const [, options] = mockNotificationConstructor.mock.calls[0];
      expect(options.icon).toBe('/icons/icon-192x192.png');
    });

    it('should auto-detect locale when not provided', () => {
      document.documentElement.lang = 'es';

      deliverSystemNotification('☀️', 'Evento', '2025-06-20', 600, 10);

      const [, options] = mockNotificationConstructor.mock.calls[0];
      expect(options.body).toContain('En 10 minutos');

      document.documentElement.lang = '';
    });

    it('should return true on successful notification creation', () => {
      const result = deliverSystemNotification(
        '📅',
        'Event',
        '2025-06-20',
        600,
        0,
        'en',
      );

      expect(result).toBe(true);
    });

    it('should include date and remaining time in the body', () => {
      deliverSystemNotification('💊', 'Medicine', '2025-03-15', 900, 1440, 'en');

      const [, options] = mockNotificationConstructor.mock.calls[0];
      expect(options.body).toContain('15:00');
      expect(options.body).toContain('In 1 day');
    });
  });
});
