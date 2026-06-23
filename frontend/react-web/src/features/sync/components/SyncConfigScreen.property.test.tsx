// Feature: gh16-synchronization, Property 3: Cancel action clears form state
// Feature: gh16-synchronization, Property 6: Non-200 response preserves form state and shows error
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import fc from 'fast-check';

import i18n from '@/infrastructure/i18n';
import { SyncConfigScreen } from './SyncConfigScreen';

vi.mock('@features/sync/stores/syncStore', () => {
  const store = (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      config: null,
      saveConfig: vi.fn(),
    });
  store.getState = () => ({ config: null, saveConfig: vi.fn() });
  return { useSyncStore: Object.assign(store, { getState: store.getState }) };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockValidateConnection = vi.fn();
vi.mock('@features/sync/services/syncValidationService', () => ({
  validateConnection: (...args: unknown[]) => mockValidateConnection(...args),
}));

const ERROR_TYPES = [
  'invalid_credentials',
  'not_found',
  'server_error',
  'network_error',
] as const;

const renderSyncConfigScreen = () => {
  return render(
    <MemoryRouter initialEntries={['/sync/config']}>
      <I18nextProvider i18n={i18n}>
        <SyncConfigScreen />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe('SyncConfigScreen — property tests', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // **Validates: Requirements 4.1**
  describe('Property 3: Cancel action clears form state', () => {
    it(
      'should clear both URL and API key fields when cancel is clicked for any non-empty input',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc
              .string({ minLength: 1, maxLength: 30 })
              .filter((s) => s.trim().length > 0 && !s.includes('{') && !s.includes('}')),
            fc
              .string({ minLength: 1, maxLength: 30 })
              .filter((s) => s.trim().length > 0 && !s.includes('{') && !s.includes('}')),
            async (url, apiKey) => {
              cleanup();

              renderSyncConfigScreen();

              const urlInput = screen.getByLabelText(
                /server url/i,
              ) as HTMLInputElement;
              const apiKeyInput = screen.getByLabelText(
                /api key/i,
              ) as HTMLInputElement;

              // Use fireEvent for performance in property tests
              fireEvent.change(urlInput, { target: { value: url } });
              fireEvent.change(apiKeyInput, { target: { value: apiKey } });

              expect(urlInput.value).toBe(url);
              expect(apiKeyInput.value).toBe(apiKey);

              const cancelButtons = screen.getAllByRole('button', {
                name: /cancel/i,
              });
              // The form Cancel button is the one inside the actions area (not the back arrow)
              const cancelButton = cancelButtons.find(
                (btn) => btn.textContent === 'Cancel',
              )!;
              fireEvent.click(cancelButton);

              expect(urlInput.value).toBe('');
              expect(apiKeyInput.value).toBe('');

              cleanup();
            },
          ),
          { numRuns: 100 },
        );
      },
      60_000,
    );
  });

  // **Validates: Requirements 6.1, 6.3**
  describe('Property 6: Non-200 response preserves form state and shows error', () => {
    it(
      'should retain field values and display error alert for any non-200 error type and any URL/API key',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.webUrl({ size: 'xsmall' }).map((u) => u.replace(/\/$/, '')),
            fc
              .string({ minLength: 1, maxLength: 12 })
              .filter((s) => s.trim().length > 0),
            fc.constantFrom(...ERROR_TYPES),
            async (url, apiKey, errorType) => {
              cleanup();
              vi.clearAllMocks();

              mockValidateConnection.mockResolvedValue({
                success: false,
                error: errorType,
              });

              renderSyncConfigScreen();

              const urlInput = screen.getByLabelText(
                /server url/i,
              ) as HTMLInputElement;
              const apiKeyInput = screen.getByLabelText(
                /api key/i,
              ) as HTMLInputElement;

              // Use fireEvent for performance — setting values directly
              fireEvent.change(urlInput, { target: { value: url } });
              fireEvent.change(apiKeyInput, { target: { value: apiKey } });

              const validateButton = screen.getByRole('button', {
                name: /validate/i,
              });
              fireEvent.click(validateButton);

              await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
              });

              // Verify fields retain their original values
              expect(urlInput.value).toBe(url);
              expect(apiKeyInput.value).toBe(apiKey);

              cleanup();
            },
          ),
          { numRuns: 100 },
        );
      },
      60_000,
    );
  });
});
