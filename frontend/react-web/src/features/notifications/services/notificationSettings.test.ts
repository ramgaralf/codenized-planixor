import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/data/db';

import { getChannel, setChannel } from './notificationSettings';

describe('notificationSettings', () => {
  beforeEach(async () => {
    await db.notificationSettings.clear();
  });

  describe('getChannel', () => {
    it('should return "app" when no persisted value exists', async () => {
      const channel = await getChannel();

      expect(channel).toBe('app');
    });

    it('should return the persisted channel value', async () => {
      await db.notificationSettings.put({ key: 'channel', value: 'app' });

      const channel = await getChannel();

      expect(channel).toBe('app');
    });

    it('should return "app" when persisted value is invalid', async () => {
      await db.notificationSettings.put({ key: 'channel', value: 'invalid' });

      const channel = await getChannel();

      expect(channel).toBe('app');
    });
  });

  describe('setChannel', () => {
    it('should persist the channel preference to the store', async () => {
      await setChannel('system');

      const record = await db.notificationSettings.get('channel');

      expect(record).toEqual({ key: 'channel', value: 'system' });
    });

    it('should overwrite a previously stored channel value', async () => {
      await setChannel('app');
      await setChannel('both');

      const channel = await getChannel();

      expect(channel).toBe('both');
    });
  });
});
