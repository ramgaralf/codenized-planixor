/**
 * System Notification Delivery — Web Notifications API integration.
 *
 * Delivers native OS notifications using the Web Notifications API.
 * Designed to be called from the notification check cycle (Web Worker or main thread).
 *
 * Uses a static label mapping (not React i18n) because the Web Worker
 * cannot access React context. Locale is determined by the document language
 * or a passed locale parameter.
 *
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.8, 5.4, 5.5**
 */

/** Maximum length for notification title (event name) */
const MAX_TITLE_LENGTH = 65;

/** Path to the Planixor 192×192 app icon used in system notifications */
const NOTIFICATION_ICON_PATH = '/icons/icon-192x192.png';

/**
 * Time remaining label translations indexed by alert offset and locale.
 *
 * Covers the four supported offsets:
 * - 0: "Now" / "Ahora"
 * - 10: "In 10 minutes" / "En 10 minutos"
 * - 60: "In 1 hour" / "En 1 hora"
 * - 1440: "In 1 day" / "En 1 día"
 */
const TIME_REMAINING_LABELS: Record<number, Record<string, string>> = {
  0: { en: 'Now', es: 'Ahora' },
  10: { en: 'In 10 minutes', es: 'En 10 minutos' },
  60: { en: 'In 1 hour', es: 'En 1 hora' },
  1440: { en: 'In 1 day', es: 'En 1 día' },
};

/**
 * Truncates an event name to the maximum allowed title length.
 * If the name exceeds 65 characters, it is trimmed and no ellipsis is added
 * (the OS notification system handles overflow display).
 */
export const truncateTitle = (eventName: string): string => {
  if (eventName.length <= MAX_TITLE_LENGTH) {
    return eventName;
  }
  return eventName.slice(0, MAX_TITLE_LENGTH);
};

/**
 * Formats a date and time into a localized display string.
 * Example: "20 jun 2025 · 10:00" (Spanish) or "Jun 20, 2025 · 10:00" (English)
 */
export const formatDateTime = (
  startDay: string,
  startTime: number,
  locale: string,
): string => {
  const parts = startDay.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const hours = Math.floor(startTime / 60);
  const minutes = startTime % 60;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const dateStr = date.toLocaleDateString(
    locale.toLowerCase().startsWith('es') ? 'es-ES' : 'en-US',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );

  return `${dateStr} · ${timeStr}`;
};

/**
 * Formats the time remaining label for a given alert offset and locale.
 * Falls back to a generic "In X minutes" / "En X minutos" format for unknown offsets.
 */
export const formatTimeRemaining = (
  alertOffset: number,
  locale: string,
): string => {
  const labels = TIME_REMAINING_LABELS[alertOffset];
  if (labels) {
    const lang = locale.toLowerCase().startsWith('es') ? 'es' : 'en';
    return labels[lang] ?? labels['en'] ?? '';
  }
  const lang = locale.toLowerCase().startsWith('es') ? 'es' : 'en';
  return lang === 'es'
    ? `En ${alertOffset} minutos`
    : `In ${alertOffset} minutes`;
};

/**
 * Detects the current document locale.
 * Returns the lang attribute of the document, falling back to 'en'.
 *
 * In a Web Worker context where `document` is not available,
 * this function returns 'en' as the default.
 */
export const detectLocale = (): string => {
  if (typeof document !== 'undefined' && document.documentElement?.lang) {
    return document.documentElement.lang;
  }
  return 'en';
};

/**
 * Delivers a system notification via the Web Notifications API.
 *
 * Checks:
 * 1. `Notification` global is available (not in all Web Worker contexts)
 * 2. Permission is "granted"
 *
 * If either check fails, returns false — the notification record should
 * retain `isDelivered=false` and be reattempted on the next check cycle.
 *
 * @param eventIcon - The emoji icon for the event (from shift or reminder)
 * @param eventName - The calendar event name (will be truncated to 65 chars)
 * @param startDay - ISO date string "YYYY-MM-DD" for the event start day
 * @param startTime - Minutes from midnight for the event start time
 * @param alertOffset - The alert offset in minutes (0, 10, 60, or 1440)
 * @param locale - Optional locale override. If not provided, auto-detects from document.
 * @returns true if the notification was successfully created, false otherwise
 */
export const deliverSystemNotification = (
  eventIcon: string,
  eventName: string,
  startDay: string,
  startTime: number,
  alertOffset: number,
  locale?: string,
): boolean => {
  // Check 1: Web Notifications API is available
  if (typeof Notification === 'undefined') {
    return false;
  }

  // Check 2: Permission is granted
  if (Notification.permission !== 'granted') {
    return false;
  }

  const resolvedLocale = locale ?? detectLocale();
  const title = `${eventIcon} ${truncateTitle(eventName)}`;

  const dateTimeLine = formatDateTime(startDay, startTime, resolvedLocale);
  const remainingLine = formatTimeRemaining(alertOffset, resolvedLocale);
  const body = `${dateTimeLine}\n${remainingLine}`;

  new Notification(title, {
    body,
    icon: NOTIFICATION_ICON_PATH,
  });

  return true;
};
