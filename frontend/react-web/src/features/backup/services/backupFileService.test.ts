import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { isMobileDevice, openBackupFile } from './backupFileService';

// ---------------------------------------------------------------------------
// isMobileDevice
// ---------------------------------------------------------------------------

describe('isMobileDevice', () => {
  const originalUserAgent = navigator.userAgent;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
    });
  });

  const setUserAgent = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  };

  const setMaxTouchPoints = (points: number) => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: points,
      configurable: true,
    });
  };

  it('should return true for Chrome on Android', () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    );
    setMaxTouchPoints(5);
    expect(isMobileDevice()).toBe(true);
  });

  it('should return true for Safari on iPhone', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );
    setMaxTouchPoints(5);
    expect(isMobileDevice()).toBe(true);
  });

  it('should return true for iPadOS 13+ (reports as Macintosh)', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    );
    setMaxTouchPoints(5);
    expect(isMobileDevice()).toBe(true);
  });

  it('should return false for Chrome on Windows desktop', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    setMaxTouchPoints(0);
    expect(isMobileDevice()).toBe(false);
  });

  it('should return false for Chrome on macOS desktop', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    setMaxTouchPoints(0);
    expect(isMobileDevice()).toBe(false);
  });

  it('should return false for Firefox on Linux desktop', () => {
    setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    );
    setMaxTouchPoints(0);
    expect(isMobileDevice()).toBe(false);
  });

  it('should return true for iPod', () => {
    setUserAgent(
      'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    );
    setMaxTouchPoints(5);
    expect(isMobileDevice()).toBe(true);
  });

  it('should return false for macOS with maxTouchPoints = 0 (not iPadOS)', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    );
    setMaxTouchPoints(0);
    expect(isMobileDevice()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// openBackupFile — input fallback accept attribute
// ---------------------------------------------------------------------------

describe('openBackupFile input fallback', () => {
  const originalUserAgent = navigator.userAgent;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  let createdInput: HTMLInputElement | null = null;

  beforeEach(() => {
    // Ensure File System Access API is not available (forces input fallback)
    Object.defineProperty(window, 'showOpenFilePicker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    // Spy on document.createElement to capture the input element
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'input') {
        createdInput = el as HTMLInputElement;
        // Prevent actual click from opening a file dialog
        vi.spyOn(el, 'click').mockImplementation(() => {
          // Do nothing
        });
      }
      return el;
    });

    // Mock appendChild and removeChild to avoid DOM issues
    vi.spyOn(document.body, 'appendChild').mockImplementation(
      (node) => node as HTMLElement,
    );
    vi.spyOn(document.body, 'removeChild').mockImplementation(
      (node) => node as HTMLElement,
    );
  });

  afterEach(() => {
    createdInput = null;
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('should set accept to "*/*" on mobile device', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    });

    // Call openBackupFile — it will create the input but won't resolve (no file selected)
    openBackupFile();

    expect(createdInput).not.toBeNull();
    expect(createdInput!.accept).toBe('*/*');
  });

  it('should set accept to ".bak" on desktop device', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });

    openBackupFile();

    expect(createdInput).not.toBeNull();
    expect(createdInput!.accept).toBe('.bak');
  });

  it('should set accept to "*/*" on iPadOS (Macintosh UA with touch)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    });

    openBackupFile();

    expect(createdInput).not.toBeNull();
    expect(createdInput!.accept).toBe('*/*');
  });
});

// ---------------------------------------------------------------------------
// openBackupFile — File System Access API options
// ---------------------------------------------------------------------------

describe('openBackupFile File System Access API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call showOpenFilePicker with excludeAcceptAllOption: false', async () => {
    const mockHandle = {
      getFile: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue('{"metadata":{}}'),
        size: 100,
      }),
    };

    const mockShowOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);
    Object.defineProperty(window, 'showOpenFilePicker', {
      value: mockShowOpenFilePicker,
      configurable: true,
      writable: true,
    });

    await openBackupFile();

    expect(mockShowOpenFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeAcceptAllOption: false,
        multiple: false,
      }),
    );
  });
});
