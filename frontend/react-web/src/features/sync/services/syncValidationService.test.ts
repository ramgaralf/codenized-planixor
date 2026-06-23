import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { validateConnection } from './syncValidationService';

describe('syncValidationService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('input validation', () => {
    it('should return url_required error when url is empty', async () => {
      const result = await validateConnection('', 'valid-key');
      expect(result).toEqual({ success: false, error: 'url_required' });
    });

    it('should return url_required error when url is whitespace only', async () => {
      const result = await validateConnection('   ', 'valid-key');
      expect(result).toEqual({ success: false, error: 'url_required' });
    });

    it('should return api_key_required error when apiKey is empty', async () => {
      const result = await validateConnection('https://example.com', '');
      expect(result).toEqual({ success: false, error: 'api_key_required' });
    });

    it('should return api_key_required error when apiKey is whitespace only', async () => {
      const result = await validateConnection('https://example.com', '   ');
      expect(result).toEqual({ success: false, error: 'api_key_required' });
    });

    it('should not make a network request when url is empty', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      await validateConnection('', 'valid-key');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should not make a network request when apiKey is empty', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      await validateConnection('https://example.com', '');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('request construction', () => {
    it('should send GET request to {url}/api/security/validate', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ username: 'testuser' }), { status: 200 }),
      );

      await validateConnection('https://backend.planixor.com', 'my-api-key');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://backend.planixor.com/api/security/validate',
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer my-api-key' },
        }),
      );
    });

    it('should trim url before constructing request', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ username: 'user' }), { status: 200 }),
      );

      await validateConnection('  https://backend.planixor.com  ', 'key');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://backend.planixor.com/api/security/validate',
        expect.anything(),
      );
    });

    it('should trim apiKey before constructing Authorization header', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ username: 'user' }), { status: 200 }),
      );

      await validateConnection('https://example.com', '  my-key  ');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: { Authorization: 'Bearer my-key' },
        }),
      );
    });
  });

  describe('success response', () => {
    it('should return success with username when response is 200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ username: 'pepito' }), { status: 200 }),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: true, username: 'pepito' });
    });

    it('should return empty username when response body lacks username field', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 }),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: true, username: '' });
    });
  });

  describe('error response mapping', () => {
    it('should return invalid_credentials for HTTP 401', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: false, error: 'invalid_credentials' });
    });

    it('should return invalid_credentials for HTTP 403', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Forbidden', { status: 403 }),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: false, error: 'invalid_credentials' });
    });

    it('should return not_found for HTTP 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: false, error: 'not_found' });
    });

    it('should return server_error for HTTP 500', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Internal Server Error', { status: 500 }),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: false, error: 'server_error' });
    });

    it('should return server_error for HTTP 502', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Bad Gateway', { status: 502 }),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: false, error: 'server_error' });
    });

    it('should return server_error for HTTP 503', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Service Unavailable', { status: 503 }),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: false, error: 'server_error' });
    });
  });

  describe('network errors', () => {
    it('should return network_error when fetch throws TypeError (network failure)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new TypeError('Failed to fetch'),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: false, error: 'network_error' });
    });

    it('should return network_error when request is aborted (timeout)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new DOMException('The operation was aborted.', 'AbortError'),
      );

      const result = await validateConnection('https://example.com', 'key');

      expect(result).toEqual({ success: false, error: 'network_error' });
    });
  });

  describe('timeout', () => {
    it('should abort the request after 10 seconds', async () => {
      let abortSignal: AbortSignal | undefined;

      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_url, init) => {
          abortSignal = (init as RequestInit).signal ?? undefined;
          return new Promise((_, reject) => {
            abortSignal?.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          });
        },
      );

      const resultPromise = validateConnection('https://example.com', 'key');

      vi.advanceTimersByTime(10_000);

      const result = await resultPromise;

      expect(result).toEqual({ success: false, error: 'network_error' });
    });
  });
});
