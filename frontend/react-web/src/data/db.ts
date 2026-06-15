import Dexie from 'dexie';

import type { CalendarEvent } from './models';
import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';

/**
 * PlanixorDatabase — Dexie (IndexedDB) database definition.
 *
 * This is the local persistent store for the PWA.
 * All CRUD operations happen against this store first (offline-first).
 * Sync with the backend API is handled separately for subscribed users.
 */
export class PlanixorDatabase extends Dexie {
  calendarEvents!: Dexie.Table<CalendarEvent, string>;
  shifts!: Dexie.Table<Shift, string>;
  reminders!: Dexie.Table<Reminder, string>;

  constructor() {
    super('planixor');

    this.version(1).stores({
      // Primary key: id (UUID)
      // Indexed fields: startAt, endAt, eventType, isDeleted
      // Note: isDeleted is included as an index for use in compound queries.
      // In practice, boolean indexes work in Chrome/Edge but not all IndexedDB
      // implementations — use .filter() as a fallback for isDeleted queries.
      calendarEvents: 'id, startAt, endAt, eventType, isDeleted',
    });

    this.version(2).stores({
      calendarEvents: 'id, startAt, endAt, eventType, isDeleted',
      shifts: 'id, createdAt, isDeleted, isActive',
    });

    this.version(3).stores({
      calendarEvents: 'id, startAt, endAt, eventType, isDeleted',
      shifts: 'id, createdAt, isDeleted, isActive',
      reminders: 'id, createdAt, isDeleted, isActive',
    });
  }
}

/** Singleton database instance for the application */
export const db = new PlanixorDatabase();
