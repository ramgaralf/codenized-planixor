/**
 * Backup File Service
 *
 * Handles file I/O for backup creation and restoration using the
 * File System Access API with graceful fallbacks for unsupported browsers.
 */

// ---------------------------------------------------------------------------
// Type declarations for File System Access API (not in standard TS DOM typings)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions,
    ) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (
      options?: OpenFilePickerOptions,
    ) => Promise<FileSystemFileHandle[]>;
  }
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

interface OpenFilePickerOptions {
  types?: FilePickerAcceptType[];
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAK_FILE_TYPES: FilePickerAcceptType[] = [
  {
    description: 'Planixor Backup',
    accept: { 'application/octet-stream': ['.bak'] },
  },
];

// ---------------------------------------------------------------------------
// isMobileDevice
// ---------------------------------------------------------------------------

/**
 * Detects whether the current browser is running on a mobile/tablet device.
 * Used to adjust file picker behavior — mobile OS file selectors cannot
 * filter by custom extensions like .bak (no registered MIME type).
 *
 * Covers: Android, iPhone, iPod, and iPadOS 13+ (which reports a Mac UA).
 */
export const isMobileDevice = (): boolean => {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as "Macintosh" — detect via multi-touch support
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
};

// ---------------------------------------------------------------------------
// generateBackupFilename
// ---------------------------------------------------------------------------

/**
 * Generates a backup filename using the current local device time.
 * Format: planixor-yyyyMMdd-HHmmss.bak
 */
export const generateBackupFilename = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `planixor-${year}${month}${day}-${hours}${minutes}${seconds}.bak`;
};

// ---------------------------------------------------------------------------
// saveBackupFile
// ---------------------------------------------------------------------------

/**
 * Saves a backup file using the File System Access API or download fallback.
 * @throws Error with 'PERMISSION_DENIED' message if user denies permission
 * @returns void on success, null on user cancel
 */
export const saveBackupFile = async (
  content: string,
  filename: string,
): Promise<void | null> => {
  if (window.showSaveFilePicker) {
    return saveWithFileSystemAccess(content, filename);
  }

  return saveWithDownloadFallback(content, filename);
};

const saveWithFileSystemAccess = async (
  content: string,
  filename: string,
): Promise<void | null> => {
  try {
    const handle = await window.showSaveFilePicker!({
      suggestedName: filename,
      types: BAK_FILE_TYPES,
    });

    const writable = await handle.createWritable();
    await writable.write(new Blob([content]));
    await writable.close();
  } catch (error: unknown) {
    if (error instanceof DOMException) {
      if (error.name === 'AbortError') {
        return null;
      }
      if (
        error.name === 'SecurityError' ||
        error.name === 'NotAllowedError'
      ) {
        throw new Error('PERMISSION_DENIED');
      }
    }
    throw error;
  }
};

const saveWithDownloadFallback = (
  content: string,
  filename: string,
): Promise<void> => {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return Promise.resolve();
};

// ---------------------------------------------------------------------------
// openBackupFile
// ---------------------------------------------------------------------------

/**
 * Opens a backup file using the File System Access API or input fallback.
 * @returns { content, size } on success, null on user cancel
 */
export const openBackupFile = async (): Promise<{
  content: string;
  size: number;
} | null> => {
  if (window.showOpenFilePicker) {
    return openWithFileSystemAccess();
  }

  return openWithInputFallback();
};

const openWithFileSystemAccess = async (): Promise<{
  content: string;
  size: number;
} | null> => {
  try {
    const handles = await window.showOpenFilePicker!({
      types: BAK_FILE_TYPES,
      multiple: false,
      excludeAcceptAllOption: false,
    });

    const handle = handles[0];
    if (!handle) return null;

    const file = await handle.getFile();
    const content = await file.text();

    return { content, size: file.size };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
};

const openWithInputFallback = (): Promise<{
  content: string;
  size: number;
} | null> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    // Do NOT set accept on mobile — any value (even */*) causes Android file
    // managers to grey out files with unrecognized MIME types like .bak
    if (!isMobileDevice()) {
      input.accept = '.bak';
    }
    input.style.display = 'none';

    const cleanup = () => {
      document.body.removeChild(input);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve({
          content: reader.result as string,
          size: file.size,
        });
      };
      reader.onerror = () => {
        cleanup();
        reject(reader.error);
      };
      reader.readAsText(file);
    });

    input.addEventListener('cancel', () => {
      cleanup();
      resolve(null);
    });

    document.body.appendChild(input);
    input.click();
  });
};
