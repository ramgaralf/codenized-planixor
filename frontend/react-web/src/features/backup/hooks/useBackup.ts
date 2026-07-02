import { useCallback, useRef, useState } from 'react';

import { MAX_BACKUP_SIZE_BYTES } from '../models';
import type { BackupFile, ValidationError } from '../models';
import { serializeBackup } from '../services/backupSerializer';
import { deserializeBackup } from '../services/backupDeserializer';
import { validateBackupFile } from '../services/backupValidator';
import {
  saveBackupFile,
  openBackupFile,
  generateBackupFilename,
} from '../services/backupFileService';
import { restoreBackup, checkExistingData } from '../services/backupRestoreService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackupNotification {
  type: 'success' | 'error' | 'info';
  messageKey: string;
  params?: Record<string, string | number>;
}

export interface UseBackupReturn {
  isCreating: boolean;
  isRestoring: boolean;
  showConfirmDialog: boolean;
  notification: BackupNotification | null;
  handleCreate: () => Promise<void>;
  handleRestore: () => Promise<void>;
  handleConfirmRestore: () => Promise<void>;
  handleCancelRestore: () => void;
  dismissNotification: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getValidationMessageKey = (error: ValidationError): string => {
  switch (error.type) {
    case 'FILE_TOO_LARGE':
      return 'backup.fileTooLarge';
    case 'INVALID_JSON':
      return 'backup.invalidJson';
    case 'INVALID_SCHEMA':
      return 'backup.invalidSchema';
    case 'INCOMPATIBLE_VERSION':
      return 'backup.incompatibleVersion';
  }
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useBackup = (): UseBackupReturn => {
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [notification, setNotification] = useState<BackupNotification | null>(null);

  // Store the pending backup file for restore after confirmation
  const pendingBackupRef = useRef<BackupFile | null>(null);
  const pendingHasExistingDataRef = useRef<boolean>(false);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // -------------------------------------------------------------------------
  // Create flow
  // -------------------------------------------------------------------------

  const handleCreate = useCallback(async () => {
    if (isCreating || isRestoring) return;

    setIsCreating(true);
    setNotification(null);

    try {
      // 1. Generate filename
      const filename = generateBackupFilename();

      // 2. Serialize all data
      let content: string;
      try {
        content = await serializeBackup();
      } catch (err) {
        console.error('Backup serialization failed:', err);
        setNotification({ type: 'error', messageKey: 'backup.createFailed' });
        return;
      }

      // 3. Check size
      const sizeInBytes = new Blob([content]).size;
      if (sizeInBytes > MAX_BACKUP_SIZE_BYTES) {
        setNotification({ type: 'error', messageKey: 'backup.fileTooLarge' });
        return;
      }

      // 4. Save file via picker
      try {
        const result = await saveBackupFile(content, filename);
        if (result === null) {
          setNotification({ type: 'info', messageKey: 'backup.createCancelled' });
          return;
        }
      } catch (err) {
        console.error('Backup save failed:', err);
        if (err instanceof Error && err.message === 'PERMISSION_DENIED') {
          setNotification({ type: 'error', messageKey: 'backup.permissionRequired' });
        } else if (err instanceof Error && err.message === 'NOT_SUPPORTED') {
          setNotification({ type: 'error', messageKey: 'backup.notSupported' });
        } else {
          setNotification({ type: 'error', messageKey: 'backup.saveFailed' });
        }
        return;
      }

      // 5. Success
      setNotification({ type: 'success', messageKey: 'backup.createSuccess' });
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, isRestoring]);

  // -------------------------------------------------------------------------
  // Restore flow
  // -------------------------------------------------------------------------

  const performRestore = useCallback(async (backup: BackupFile, hasExistingData: boolean) => {
    const result = await restoreBackup(backup, hasExistingData);

    if (result.success) {
      setNotification({
        type: 'success',
        messageKey: 'backup.restoreSuccess',
        params: { count: result.restoredCount },
      });
    } else if (result.succeededEntities.length > 0) {
      // Partial success
      setNotification({
        type: 'error',
        messageKey: 'backup.restorePartial',
        params: {
          succeeded: result.succeededEntities.join(', '),
          failed: result.failedEntities.join(', '),
          count: result.restoredCount,
        },
      });
    } else {
      // All failed
      setNotification({ type: 'error', messageKey: 'backup.restoreFailed' });
    }
  }, []);

  const handleRestore = useCallback(async () => {
    if (isCreating || isRestoring) return;

    setIsRestoring(true);
    setNotification(null);

    let waitingForConfirmation = false;

    try {
      // 1. Open file picker
      const fileResult = await openBackupFile();
      if (fileResult === null) {
        setNotification({ type: 'info', messageKey: 'backup.restoreCancelled' });
        return;
      }

      // 2. Validate
      const validation = validateBackupFile(fileResult.content, fileResult.size);
      if (!validation.isValid && validation.error) {
        const messageKey = getValidationMessageKey(validation.error);
        setNotification({ type: 'error', messageKey });
        return;
      }

      // 3. Deserialize
      const backup = deserializeBackup(fileResult.content);

      // 4. Check existing data
      let hasExisting: boolean;
      try {
        hasExisting = await checkExistingData();
      } catch (err) {
        console.error('Existing data check failed:', err);
        setNotification({ type: 'error', messageKey: 'backup.verificationFailed' });
        return;
      }

      // 5. If existing data found, show confirmation dialog and pause
      if (hasExisting) {
        pendingBackupRef.current = backup;
        pendingHasExistingDataRef.current = true;
        setShowConfirmDialog(true);
        waitingForConfirmation = true;
        return;
      }

      // 6. No existing data — restore directly
      await performRestore(backup, false);
    } catch (err) {
      console.error('Restore operation failed:', err);
      setNotification({ type: 'error', messageKey: 'backup.restoreFailed' });
    } finally {
      if (!waitingForConfirmation) {
        setIsRestoring(false);
      }
    }
  }, [isCreating, isRestoring, performRestore]);

  // -------------------------------------------------------------------------
  // Confirmation dialog handlers
  // -------------------------------------------------------------------------

  const handleConfirmRestore = useCallback(async () => {
    setShowConfirmDialog(false);

    const backup = pendingBackupRef.current;
    const hasExistingData = pendingHasExistingDataRef.current;

    if (!backup) {
      setIsRestoring(false);
      return;
    }

    try {
      await performRestore(backup, hasExistingData);
    } catch (err) {
      console.error('Restore after confirm failed:', err);
      setNotification({ type: 'error', messageKey: 'backup.restoreFailed' });
    } finally {
      pendingBackupRef.current = null;
      pendingHasExistingDataRef.current = false;
      setIsRestoring(false);
    }
  }, [performRestore]);

  const handleCancelRestore = useCallback(() => {
    setShowConfirmDialog(false);
    pendingBackupRef.current = null;
    pendingHasExistingDataRef.current = false;
    setIsRestoring(false);
    setNotification(null);
  }, []);

  return {
    isCreating,
    isRestoring,
    showConfirmDialog,
    notification,
    handleCreate,
    handleRestore,
    handleConfirmRestore,
    handleCancelRestore,
    dismissNotification,
  };
};
