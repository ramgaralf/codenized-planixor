// Feature: gh16-synchronization, Property 4: Validation request construction
// Feature: gh16-synchronization, Property 9: Empty fields rejected by input validation
import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';

import { validateConnection } from './syncValidationService';

describe('syncValidationService — property tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // **Validates: Requirements 5.1**
  describe('Property 4: Validation request construction', () => {
    it('should construct GET request to {url}/api/security/validate with Bearer token for any valid URL and API key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl().map((u) => u.replace(/\/$/, '')),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim().length > 0),
          async (url, apiKey) => {
            const fetchMock = vi
              .spyOn(globalThis, 'fetch')
              .mockResolvedValue(
                new Response(JSON.stringify({ username: 'user' }), {
                  status: 200,
                }),
              );

            await validateConnection(url, apiKey);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith(
              `${url.trim()}/api/security/validate`,
              expect.objectContaining({
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey.trim()}` },
              }),
            );

            fetchMock.mockRestore();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // **Validates: Requirements 12.1, 12.2**
  describe('Property 9: Empty fields rejected by input validation', () => {
    const whitespaceArb = fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 10 })
      .map((chars) => chars.join(''));

    it('should reject empty/whitespace-only URL without network request', async () => {
      await fc.assert(
        fc.asyncProperty(whitespaceArb, async (emptyUrl) => {
          const fetchSpy = vi.spyOn(globalThis, 'fetch');

          const result = await validateConnection(emptyUrl, 'valid-api-key');

          expect(fetchSpy).not.toHaveBeenCalled();
          expect(result.success).toBe(false);
          expect(result.error).toBe('url_required');

          fetchSpy.mockRestore();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject empty/whitespace-only API key without network request', async () => {
      await fc.assert(
        fc.asyncProperty(whitespaceArb, async (emptyApiKey) => {
          const fetchSpy = vi.spyOn(globalThis, 'fetch');

          const result = await validateConnection(
            'https://valid-url.example.com',
            emptyApiKey,
          );

          expect(fetchSpy).not.toHaveBeenCalled();
          expect(result.success).toBe(false);
          expect(result.error).toBe('api_key_required');

          fetchSpy.mockRestore();
        }),
        { numRuns: 100 },
      );
    });
  });
});
