import { useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/data/db';

import type { ShiftModeSetting } from '../models';

export interface UseShiftModeReturn {
  enabled: boolean;
  toggle: () => Promise<void>;
  isLoading: boolean;
}

/**
 * Reactively reads the single ShiftModeSetting record from IndexedDB.
 *
 * On first access, if no record exists, creates one with `enabled=false`.
 * Returns the current enabled state, a toggle function, and loading state.
 *
 * Uses `useLiveQuery` from Dexie so the UI reactively updates when the
 * underlying data changes (e.g., from a sync pull on another tab).
 *
 * Write operations are performed outside the liveQuery context to avoid
 * Dexie's "readwrite transaction in liveQuery" error.
 */
export const useShiftMode = (): UseShiftModeReturn => {
  const initRef = useRef(false);

  // Read-only live query — returns null when no record exists, undefined while loading
  const queryResult = useLiveQuery(async () => {
    const existing = await db.shiftModeSettings.toCollection().first();
    return existing ?? null;
  }, []);

  // Create default record outside the liveQuery context
  useEffect(() => {
    if (queryResult === undefined) return; // Still loading
    if (queryResult !== null) return; // Record exists
    if (initRef.current) return; // Already creating
    initRef.current = true;

    const newSetting: ShiftModeSetting = {
      id: crypto.randomUUID(),
      enabled: false,
      modifiedAt: new Date(),
      syncedAt: null,
      isDeleted: false,
    };

    db.shiftModeSettings.put(newSetting).finally(() => {
      initRef.current = false;
    });
  }, [queryResult]);

  const toggle = useCallback(async () => {
    const current = await db.shiftModeSettings.toCollection().first();

    if (!current) {
      return;
    }

    await db.shiftModeSettings.put({
      ...current,
      enabled: !current.enabled,
      modifiedAt: new Date(),
      syncedAt: null,
    });
  }, []);

  return {
    enabled: queryResult?.enabled ?? false,
    toggle,
    isLoading: queryResult === undefined,
  };
};
