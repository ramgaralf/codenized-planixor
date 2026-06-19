import Dexie from 'dexie';

import type { CalendarEvent } from '@features/calendar-events/models';
import type { AnnualHoursConfig } from '@features/reports/models';
import type { Shift } from '@features/shifts/models';
import type { Reminder } from '@features/reminders/models';

/**
 * PlanixorDatabase — Dexie (IndexedDB) database definition.
 *
 * This is the local persistent store for the PWA.
 * All CRUD operations happen against this store first (offline-first).
 * Sync with the backend API is handled separately for subscribed users.
 *
 * Data Isolation (Req 13.1, 13.5, 13.7):
 * - Ownership is implicit: all records in this database belong to the current device session.
 * - No userId is stored per record — the authenticated session determines ownership.
 * - Sign-out/sign-in: when a user signs out and another signs in, the auth module is
 *   responsible for clearing or scoping the local database so the previous user's data
 *   is inaccessible to the new user. Data is retained for restoration when the original
 *   account signs back in.
 * - Free (anonymous) users: sync is inactive; all data remains local-only on this device.
 */
export class PlanixorDatabase extends Dexie {
  calendarEvents!: Dexie.Table<CalendarEvent, string>;
  shifts!: Dexie.Table<Shift, string>;
  reminders!: Dexie.Table<Reminder, string>;
  annualHoursConfig!: Dexie.Table<AnnualHoursConfig, string>;

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

    this.version(4).stores({
      calendarEvents: 'id, day, [day+eventType+isDeleted], eventType, isDeleted, modifiedAt',
      shifts: 'id, createdAt, isDeleted, isActive',
      reminders: 'id, createdAt, isDeleted, isActive',
    }).upgrade(tx => {
      // v1–v3 calendarEvents schema is incompatible (startAt/endAt/title → day/startTime/endTime).
      // No user data exists in any deployed environment. Clear and start fresh.
      return tx.table('calendarEvents').clear();
    });

    this.version(5).stores({
      calendarEvents: 'id, startDay, endDay, [startDay+eventType+isDeleted], eventType, isDeleted, modifiedAt',
      shifts: 'id, createdAt, isDeleted, isActive',
      reminders: 'id, createdAt, isDeleted, isActive',
    }).upgrade(tx => {
      // v4 calendarEvents schema used `day` field (single day). v5 introduces `startDay`, `endDay`, `totalHours`.
      // No user data exists in any deployed environment. Clear and start fresh.
      return tx.table('calendarEvents').clear();
    });

    this.version(6).stores({
      calendarEvents: 'id, startDay, endDay, [startDay+eventType+isDeleted], eventType, isDeleted, modifiedAt',
      shifts: 'id, createdAt, isDeleted, isActive',
      reminders: 'id, createdAt, isDeleted, isActive',
      annualHoursConfig: 'id, year, isDeleted, modifiedAt',
    });
  }
}

/** Singleton database instance for the application */
export const db = new PlanixorDatabase();
