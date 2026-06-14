import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeProvider } from '@context/ThemeContext';
import { useTheme } from '@context/useTheme';

const STORAGE_KEY = 'planixor_theme';

const TestConsumer = () => {
  const { mode, resolvedTheme, setMode } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setMode('light')}>Light</button>
      <button onClick={() => setMode('dark')}>Dark</button>
      <button onClick={() => setMode('system')}>System</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  let matchMediaListeners: Array<(event: MediaQueryListEvent) => void>;
  let matchMediaMatches: boolean;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    matchMediaListeners = [];
    matchMediaMatches = false;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' && matchMediaMatches,
        media: query,
        addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
          matchMediaListeners.push(handler);
        },
        removeEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
          matchMediaListeners = matchMediaListeners.filter((h) => h !== handler);
        },
      })),
    });
  });

  it('should default to system mode when no stored preference exists', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
  });

  it('should apply theme-light class to html when resolved theme is light', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
  });

  it('should read stored preference from LocalStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
  });

  it('should fall back to system when stored value is invalid', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-value');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('system');
  });

  it('should persist theme selection to LocalStorage on change', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Dark' }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('should apply theme-dark class when dark mode is selected', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Dark' }));

    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);
  });

  it('should register matchMedia listener when mode is system', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(matchMediaListeners.length).toBeGreaterThan(0);
  });

  it('should respond to OS theme change when in system mode', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      matchMediaListeners.forEach((listener) =>
        listener({ matches: true } as MediaQueryListEvent),
      );
    });

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
  });

  it('should not register matchMedia listener when mode is light', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    matchMediaListeners = [];

    await user.click(screen.getByRole('button', { name: 'Light' }));

    expect(matchMediaListeners.length).toBe(0);
  });

  it('should resolve system theme as dark when OS prefers dark', () => {
    matchMediaMatches = true;

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('should fall back to system when setMode is called with an invalid value', async () => {
    const user = userEvent.setup();

    const TestInvalidConsumer = () => {
      const { mode, setMode } = useTheme();
      return (
        <div>
          <span data-testid="mode">{mode}</span>
          <button onClick={() => setMode('invalid' as 'light')}>Invalid</button>
        </div>
      );
    };

    render(
      <ThemeProvider>
        <TestInvalidConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Invalid' }));

    expect(screen.getByTestId('mode')).toHaveTextContent('system');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
  });
});

describe('useTheme', () => {
  it('should throw when used outside ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const BadConsumer = () => {
      useTheme();
      return null;
    };

    expect(() => render(<BadConsumer />)).toThrow(
      'useTheme must be used within a ThemeProvider',
    );

    consoleError.mockRestore();
  });
});
