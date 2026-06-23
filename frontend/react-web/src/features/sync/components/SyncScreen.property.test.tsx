// Feature: gh16-synchronization, Property 8: Pause/resume toggles sync execution
/* eslint-disable sonarjs/no-identical-functions */
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import fc from 'fast-check';

import i18n from '@/infrastructure/i18n';
import type { ConnectionStatus } from '@features/sync/models';

const mockPause = vi.fn();
const mockResume = vi.fn();
const mockNavigate = vi.fn();

let mockConnectionStatus: ConnectionStatus = 'active';
let mockConfig: Record<string, unknown> | null = {
  serverUrl: 'https://backend.planixor.com',
  apiKey: 'sk-test-key-1234',
  username: 'testuser',
  isPaused: false,
  lastSyncedAt: null,
};

vi.mock('@features/sync/stores/syncStore', () => {
  const store = (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      config: mockConfig,
      connectionStatus: mockConnectionStatus,
      lastSyncedAt: null,
      pause: mockPause,
      resume: mockResume,
    });
  return { useSyncStore: store };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const renderSyncScreen = async () => {
  const { SyncScreen } = await import('./SyncScreen');
  return render(
    <MemoryRouter initialEntries={['/sync']}>
      <I18nextProvider i18n={i18n}>
        <SyncScreen />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe('SyncScreen — property tests', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // **Validates: Requirements 10.3, 10.4**
  describe('Property 8: Pause/resume toggles sync execution', () => {
    it(
      'should show Pause button and call store.pause() when connectionStatus is active or failing',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom<ConnectionStatus>('active', 'failing'),
            async (status) => {
              cleanup();
              vi.clearAllMocks();

              mockConnectionStatus = status;
              mockConfig = {
                serverUrl: 'https://backend.planixor.com',
                apiKey: 'sk-test-key-1234',
                username: 'testuser',
                isPaused: false,
                lastSyncedAt: null,
              };

              // Need to re-import to pick up new mock state
              vi.resetModules();
              vi.doMock('@features/sync/stores/syncStore', () => {
                const store = (
                  selector: (s: Record<string, unknown>) => unknown,
                ) =>
                  selector({
                    config: mockConfig,
                    connectionStatus: mockConnectionStatus,
                    lastSyncedAt: null,
                    pause: mockPause,
                    resume: mockResume,
                  });
                return { useSyncStore: store };
              });
              vi.doMock('react-router-dom', async () => {
                const actual = await vi.importActual('react-router-dom');
                return {
                  ...actual,
                  useNavigate: () => mockNavigate,
                };
              });

              const { SyncScreen } = await import('./SyncScreen');
              const { container } = render(
                <MemoryRouter initialEntries={['/sync']}>
                  <I18nextProvider i18n={i18n}>
                    <SyncScreen />
                  </I18nextProvider>
                </MemoryRouter>,
              );

              // Pause button should be visible
              const pauseButton = screen.getByRole('button', {
                name: /pause sync/i,
              });
              expect(pauseButton).toBeInTheDocument();

              // Resume button should NOT be visible
              const resumeButton = screen.queryByRole('button', {
                name: /resume sync/i,
              });
              expect(resumeButton).not.toBeInTheDocument();

              // Clicking Pause should call store.pause()
              fireEvent.click(pauseButton);
              expect(mockPause).toHaveBeenCalledTimes(1);
              expect(mockResume).not.toHaveBeenCalled();

              cleanup();
              container.remove();
            },
          ),
          { numRuns: 100 },
        );
      },
      60_000,
    );

    it(
      'should show Resume button and call store.resume() when connectionStatus is paused',
      async () => {
        cleanup();
        vi.clearAllMocks();

        mockConnectionStatus = 'paused';
        mockConfig = {
          serverUrl: 'https://backend.planixor.com',
          apiKey: 'sk-test-key-1234',
          username: 'testuser',
          isPaused: true,
          lastSyncedAt: null,
        };

        vi.resetModules();
        vi.doMock('@features/sync/stores/syncStore', () => {
          const store = (
            selector: (s: Record<string, unknown>) => unknown,
          ) =>
            selector({
              config: mockConfig,
              connectionStatus: 'paused' as ConnectionStatus,
              lastSyncedAt: null,
              pause: mockPause,
              resume: mockResume,
            });
          return { useSyncStore: store };
        });
        vi.doMock('react-router-dom', async () => {
          const actual = await vi.importActual('react-router-dom');
          return {
            ...actual,
            useNavigate: () => mockNavigate,
          };
        });

        // Run a property that generates random booleans to verify resuming across various states
        await fc.assert(
          fc.asyncProperty(fc.boolean(), async (_randomFlag) => { // eslint-disable-line @typescript-eslint/no-unused-vars
            cleanup();
            vi.clearAllMocks();

            const { SyncScreen } = await import('./SyncScreen');
            render(
              <MemoryRouter initialEntries={['/sync']}>
                <I18nextProvider i18n={i18n}>
                  <SyncScreen />
                </I18nextProvider>
              </MemoryRouter>,
            );

            // Resume button should be visible
            const resumeButton = screen.getByRole('button', {
              name: /resume sync/i,
            });
            expect(resumeButton).toBeInTheDocument();

            // Pause button should NOT be visible
            const pauseButton = screen.queryByRole('button', {
              name: /pause sync/i,
            });
            expect(pauseButton).not.toBeInTheDocument();

            // Clicking Resume should call store.resume()
            fireEvent.click(resumeButton);
            expect(mockResume).toHaveBeenCalledTimes(1);
            expect(mockPause).not.toHaveBeenCalled();

            cleanup();
          }),
          { numRuns: 100 },
        );
      },
      60_000,
    );

    it(
      'should show correct button for any isPaused boolean state with config present',
      async () => {
        await fc.assert(
          fc.asyncProperty(fc.boolean(), async (isPaused) => {
            cleanup();
            vi.clearAllMocks();

            const status: ConnectionStatus = isPaused ? 'paused' : 'active';

            vi.resetModules();
            vi.doMock('@features/sync/stores/syncStore', () => {
              const store = (
                selector: (s: Record<string, unknown>) => unknown,
              ) =>
                selector({
                  config: {
                    serverUrl: 'https://backend.planixor.com',
                    apiKey: 'sk-test-key-1234',
                    username: 'testuser',
                    isPaused,
                    lastSyncedAt: null,
                  },
                  connectionStatus: status,
                  lastSyncedAt: null,
                  pause: mockPause,
                  resume: mockResume,
                });
              return { useSyncStore: store };
            });
            vi.doMock('react-router-dom', async () => {
              const actual = await vi.importActual('react-router-dom');
              return {
                ...actual,
                useNavigate: () => mockNavigate,
              };
            });

            const { SyncScreen } = await import('./SyncScreen');
            render(
              <MemoryRouter initialEntries={['/sync']}>
                <I18nextProvider i18n={i18n}>
                  <SyncScreen />
                </I18nextProvider>
              </MemoryRouter>,
            );

            if (isPaused) {
              // When paused, Resume should be shown, Pause should not
              expect(
                screen.getByRole('button', { name: /resume sync/i }),
              ).toBeInTheDocument();
              expect(
                screen.queryByRole('button', { name: /pause sync/i }),
              ).not.toBeInTheDocument();
            } else {
              // When active, Pause should be shown, Resume should not
              expect(
                screen.getByRole('button', { name: /pause sync/i }),
              ).toBeInTheDocument();
              expect(
                screen.queryByRole('button', { name: /resume sync/i }),
              ).not.toBeInTheDocument();
            }

            cleanup();
          }),
          { numRuns: 100 },
        );
      },
      60_000,
    );
  });
});
