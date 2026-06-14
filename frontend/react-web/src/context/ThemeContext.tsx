import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ThemeContext } from '@context/ThemeContextValue';
import type { ThemeMode } from '@context/ThemeContextValue';

const STORAGE_KEY = 'planixor_theme';
const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system'];

const getStoredMode = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_MODES.includes(stored as ThemeMode)) {
      return stored as ThemeMode;
    }
  } catch {
    // LocalStorage unavailable — fall back to system
  }
  return 'system';
};

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') return getSystemTheme();
  return mode;
};

const applyThemeClass = (resolved: 'light' | 'dark'): void => {
  const html = document.documentElement;
  html.classList.remove('theme-light', 'theme-dark');
  html.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light');
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(mode),
  );
  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  const setMode = useCallback((newMode: ThemeMode) => {
    const validMode = VALID_MODES.includes(newMode) ? newMode : 'system';
    setModeState(validMode);

    try {
      localStorage.setItem(STORAGE_KEY, validMode);
    } catch {
      // LocalStorage unavailable — theme still applies for this session
    }

    const resolved = resolveTheme(validMode);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  // Apply theme class on mount and handle system mode listener
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (mode !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryRef.current = mediaQuery;

    const handleChange = (event: MediaQueryListEvent) => {
      const newResolved = event.matches ? 'dark' : 'light';
      setResolvedTheme(newResolved);
      applyThemeClass(newResolved);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [mode]);

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
