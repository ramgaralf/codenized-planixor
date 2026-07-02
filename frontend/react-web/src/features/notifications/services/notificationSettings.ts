import { db } from '@/data/db';

import type { NotificationChannel } from '../types';

/** Key used to store the channel preference in the notificationSettings table */
const CHANNEL_KEY = 'channel';

/** Default channel when no persisted value exists */
const DEFAULT_CHANNEL: NotificationChannel = 'app';

/** Valid notification channel values */
const VALID_CHANNELS: readonly NotificationChannel[] = ['app', 'system', 'both'];

/**
 * Retrieves the persisted notification delivery channel preference.
 * Returns 'app' when no value has been stored yet.
 *
 * This function reads from IndexedDB (Dexie) and is usable from
 * both the main thread and Web Worker contexts.
 */
export const getChannel = async (): Promise<NotificationChannel> => {
  const record = await db.notificationSettings.get(CHANNEL_KEY);

  if (!record) {
    return DEFAULT_CHANNEL;
  }

  const value = record.value as NotificationChannel;

  if (!VALID_CHANNELS.includes(value)) {
    return DEFAULT_CHANNEL;
  }

  return value;
};

/**
 * Persists the notification delivery channel preference.
 *
 * Uses Dexie `put` to upsert — creates the record if it doesn't exist,
 * or updates the existing record. Accessible from both main thread
 * and Web Worker contexts via IndexedDB.
 */
export const setChannel = async (channel: NotificationChannel): Promise<void> => {
  await db.notificationSettings.put({ key: CHANNEL_KEY, value: channel });
};
