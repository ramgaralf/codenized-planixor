/**
 * Sync Validation Service
 *
 * Validates server connectivity by calling the backend security endpoint.
 * Returns a ValidationResult indicating success (with username) or failure (with error type).
 *
 * Requirements: 5.1, 5.2, 6.1, 12.1, 12.2
 */

export interface ValidationResult {
  success: boolean;
  username?: string;
  error?: string;
}

const TIMEOUT_MS = 10_000;

/**
 * Validates a connection to the synchronization server.
 *
 * Sends a GET request to `{url}{apiBasePath}/security/validate` with the provided API key
 * as a Bearer token. Maps the response to a ValidationResult.
 *
 * Input validation: rejects empty or whitespace-only url/apiKey without making a network request.
 */
export const validateConnection = async (
  url: string,
  apiKey: string,
  apiBasePath: string = '/api',
): Promise<ValidationResult> => {
  if (!url || url.trim().length === 0) {
    return { success: false, error: 'url_required' };
  }

  if (!apiKey || apiKey.trim().length === 0) {
    return { success: false, error: 'api_key_required' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${url.trim()}${apiBasePath}/security/validate`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const body: unknown = await response.json();
      const username = (body as { username?: string }).username ?? '';
      return { success: true, username };
    }

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'invalid_credentials' };
    }

    if (response.status === 404) {
      return { success: false, error: 'not_found' };
    }

    if (response.status >= 500) {
      return { success: false, error: 'server_error' };
    }

    return { success: false, error: 'server_error' };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, error: 'network_error' };
    }

    if (err instanceof TypeError) {
      // TypeError is thrown by fetch for network-level failures (DNS, connection refused, etc.)
      return { success: false, error: 'network_error' };
    }

    console.error('Unexpected error during validation:', err);
    return { success: false, error: 'network_error' };
  }
};
