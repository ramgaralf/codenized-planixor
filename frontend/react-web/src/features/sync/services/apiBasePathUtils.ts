/**
 * API Base Path Normalization, Validation, and URL Parsing Utilities
 *
 * Pure functions for normalizing, validating, parsing, and reconstructing
 * the configurable API base path and server URL.
 * The base path is the URL segment appended after the server URL (e.g., "/api", "/custom/v2").
 *
 * Requirements: 4.6, 4.7, 4.10
 */

/**
 * Maximum allowed length for the API base path.
 */
const MAX_API_BASE_PATH_LENGTH = 128;

/**
 * Allowed characters in the API base path: alphanumeric, hyphens, underscores, dots, forward slashes.
 */
const VALID_API_BASE_PATH_PATTERN = /^[a-zA-Z0-9\-_./]+$/;

/**
 * Default API base path used when input is empty.
 */
const DEFAULT_API_BASE_PATH = '/api';

/**
 * Normalizes an API base path input string.
 *
 * Rules:
 * - Empty or whitespace-only input → returns "/api"
 * - Trims leading/trailing whitespace
 * - Prepends "/" if not already present
 * - Removes trailing "/" (unless the result would be empty, i.e., input is just "/")
 *
 * @param input - The raw API base path string from user input
 * @returns The normalized API base path
 */
export const normalizeApiBasePath = (input: string): string => {
  if (!input || input.trim().length === 0) {
    return DEFAULT_API_BASE_PATH;
  }

  let result = input.trim();

  if (!result.startsWith('/')) {
    result = '/' + result;
  }

  while (result.endsWith('/') && result.length > 1) {
    result = result.slice(0, -1);
  }

  return result;
};

/**
 * Validates an API base path input string.
 *
 * Rules:
 * - Must contain only characters from [a-zA-Z0-9\-\_\.\/]
 * - Must be 128 characters or fewer
 * - Returns null if valid, an error message key string if invalid
 *
 * Note: Empty input is considered valid (it will be normalized to "/api" on save).
 *
 * @param input - The API base path string to validate
 * @returns null if valid, or an error message key if invalid
 */
export const validateApiBasePath = (input: string): string | null => {
  if (!input || input.trim().length === 0) {
    return null;
  }

  const trimmed = input.trim();

  if (trimmed.length > MAX_API_BASE_PATH_LENGTH) {
    return 'sync.config.apiBasePathError.tooLong';
  }

  if (!VALID_API_BASE_PATH_PATTERN.test(trimmed)) {
    return 'sync.config.apiBasePathError.invalidChars';
  }

  return null;
};


/**
 * Parses a full server URL into its base origin (scheme + host + port) and path components.
 *
 * Examples:
 * - "https://backend.planixor.com/api" → { origin: "https://backend.planixor.com", path: "/api" }
 * - "https://backend.planixor.com/custom/v2" → { origin: "https://backend.planixor.com", path: "/custom/v2" }
 * - "http://192.168.1.100:8080/api" → { origin: "http://192.168.1.100:8080", path: "/api" }
 * - "https://backend.planixor.com" → { origin: "https://backend.planixor.com", path: "/api" }
 * - "https://backend.planixor.com/" → { origin: "https://backend.planixor.com", path: "/api" }
 *
 * If no path is provided (just the origin), defaults path to "/api".
 * Strips trailing slash from path (unless it's just "/").
 *
 * @param input - The full server URL string from user input
 * @returns An object with origin (scheme + host + port) and path
 */
export const parseServerUrl = (input: string): { origin: string; path: string } => {
  const trimmed = input.trim();

  if (!trimmed) {
    return { origin: '', path: DEFAULT_API_BASE_PATH };
  }

  try {
    const url = new URL(trimmed);
    const origin = url.origin;

    let path = url.pathname;

    // Remove all trailing slashes unless it's just "/"
    while (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1);
    }

    // If no meaningful path, default to "/api"
    if (!path || path === '/') {
      path = DEFAULT_API_BASE_PATH;
    }

    return { origin, path };
  } catch {
    // If URL parsing fails, return the input as-is for the origin
    return { origin: trimmed, path: DEFAULT_API_BASE_PATH };
  }
};

/**
 * Reconstructs the full URL from serverUrl and apiBasePath for display in the form field.
 *
 * @param serverUrl - The server origin (e.g., "https://backend.planixor.com")
 * @param apiBasePath - The API base path (e.g., "/api")
 * @returns The combined full URL string
 */
export const buildFullServerUrl = (serverUrl: string, apiBasePath: string): string => {
  if (!serverUrl) {
    return '';
  }

  if (!apiBasePath || apiBasePath === '/') {
    return serverUrl;
  }

  return `${serverUrl}${apiBasePath}`;
};
