import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  normalizeApiBasePath,
  validateApiBasePath,
  parseServerUrl,
  buildFullServerUrl,
} from './apiBasePathUtils';

/**
 * Property 8: API base path normalization
 * Property 9: API base path validation rejects invalid characters
 * Validates: Requirements 4.6, 4.7, 4.10
 */

describe('normalizeApiBasePath', () => {
  describe('unit tests', () => {
    it('should return "/api" when input is empty string', () => {
      expect(normalizeApiBasePath('')).toBe('/api');
    });

    it('should return "/api" when input is whitespace only', () => {
      expect(normalizeApiBasePath('   ')).toBe('/api');
    });

    it('should prepend "/" when input has no leading slash', () => {
      expect(normalizeApiBasePath('api')).toBe('/api');
    });

    it('should strip trailing "/" from input', () => {
      expect(normalizeApiBasePath('/api/')).toBe('/api');
    });

    it('should return input unchanged when already valid', () => {
      expect(normalizeApiBasePath('/custom/v2')).toBe('/custom/v2');
    });

    it('should prepend "/" to custom path without leading slash', () => {
      expect(normalizeApiBasePath('custom')).toBe('/custom');
    });

    it('should keep "/" as-is when input is just a slash', () => {
      expect(normalizeApiBasePath('/')).toBe('/');
    });

    it('should trim whitespace from input before normalizing', () => {
      expect(normalizeApiBasePath('  /api  ')).toBe('/api');
    });
  });

  describe('property tests', () => {
    /**
     * **Validates: Requirements 4.6, 4.7**
     *
     * Property 8: For any input string, the normalization function SHALL produce
     * a result that starts with "/" and does not end with "/" (unless the result
     * is exactly "/"). Empty input SHALL produce "/api".
     */
    it('should always produce a result starting with "/"', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = normalizeApiBasePath(input);
          expect(result.startsWith('/')).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should never produce a result ending with "/" unless result is exactly "/"', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = normalizeApiBasePath(input);
          if (result.length > 1) {
            expect(result.endsWith('/')).toBe(false);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should return "/api" for any empty or whitespace-only input', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^\s*$/),
          (whitespace) => {
            expect(normalizeApiBasePath(whitespace)).toBe('/api');
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

describe('validateApiBasePath', () => {
  describe('unit tests', () => {
    it('should return null for empty string (valid)', () => {
      expect(validateApiBasePath('')).toBeNull();
    });

    it('should return null for whitespace-only string (valid)', () => {
      expect(validateApiBasePath('   ')).toBeNull();
    });

    it('should return null for "/api" (valid)', () => {
      expect(validateApiBasePath('/api')).toBeNull();
    });

    it('should return null for "/custom/v2" (valid)', () => {
      expect(validateApiBasePath('/custom/v2')).toBeNull();
    });

    it('should return null for path with hyphens, underscores, and dots (valid)', () => {
      expect(validateApiBasePath('/path-with_dots.and-dashes')).toBeNull();
    });

    it('should return error for path containing spaces', () => {
      const result = validateApiBasePath('/path with spaces');
      expect(result).not.toBeNull();
    });

    it('should return error for path containing query string characters', () => {
      const result = validateApiBasePath('/path?query=1');
      expect(result).not.toBeNull();
    });

    it('should return error for path containing hash characters', () => {
      const result = validateApiBasePath('/path#hash');
      expect(result).not.toBeNull();
    });

    it('should return error for string exceeding 128 characters', () => {
      const longPath = '/' + 'a'.repeat(128);
      expect(longPath.length).toBe(129);
      const result = validateApiBasePath(longPath);
      expect(result).not.toBeNull();
    });

    it('should return null for string of exactly 128 valid characters', () => {
      const maxPath = '/' + 'a'.repeat(127);
      expect(maxPath.length).toBe(128);
      const result = validateApiBasePath(maxPath);
      expect(result).toBeNull();
    });
  });

  describe('property tests', () => {
    /**
     * **Validates: Requirements 4.10**
     *
     * Property 9: For any string containing characters outside the set
     * [a-zA-Z0-9\-\_\.\/], the validation function SHALL reject the input.
     * For any string composed only of characters within that set (and length <= 128),
     * validation SHALL accept the input.
     */
    it('should accept any non-empty string composed of valid characters within length limit', () => {
      const validCharArb = fc.stringMatching(/^[a-zA-Z0-9\-_./]{1,128}$/);

      fc.assert(
        fc.property(validCharArb, (input) => {
          expect(validateApiBasePath(input)).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject any string containing at least one invalid character', () => {
      const validChars = /^[a-zA-Z0-9\-_./]+$/;

      const inputWithInvalidChar = fc
        .string({ minLength: 1, maxLength: 128 })
        .filter((s) => s.trim().length > 0 && !validChars.test(s.trim()));

      fc.assert(
        fc.property(inputWithInvalidChar, (input) => {
          expect(validateApiBasePath(input)).not.toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject any string longer than 128 characters', () => {
      const longStringArb = fc.stringMatching(/^[a-z/]{129,200}$/);

      fc.assert(
        fc.property(longStringArb, (input) => {
          expect(validateApiBasePath(input)).not.toBeNull();
        }),
        { numRuns: 100 },
      );
    });
  });
});


describe('parseServerUrl', () => {
  describe('unit tests', () => {
    it('should parse a URL with path into origin and path', () => {
      const result = parseServerUrl('https://backend.planixor.com/api');
      expect(result).toEqual({
        origin: 'https://backend.planixor.com',
        path: '/api',
      });
    });

    it('should parse a URL with multi-segment path', () => {
      const result = parseServerUrl('https://backend.planixor.com/custom/v2');
      expect(result).toEqual({
        origin: 'https://backend.planixor.com',
        path: '/custom/v2',
      });
    });

    it('should parse a URL with port and path', () => {
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      const result = parseServerUrl('http://192.168.1.100:8080/api');
      expect(result).toEqual({
        // eslint-disable-next-line sonarjs/no-clear-text-protocols
        origin: 'http://192.168.1.100:8080',
        path: '/api',
      });
    });

    it('should default path to "/api" when URL has no path', () => {
      const result = parseServerUrl('https://backend.planixor.com');
      expect(result).toEqual({
        origin: 'https://backend.planixor.com',
        path: '/api',
      });
    });

    it('should default path to "/api" when URL has only trailing slash', () => {
      const result = parseServerUrl('https://backend.planixor.com/');
      expect(result).toEqual({
        origin: 'https://backend.planixor.com',
        path: '/api',
      });
    });

    it('should strip trailing slash from path', () => {
      const result = parseServerUrl('https://backend.planixor.com/api/');
      expect(result).toEqual({
        origin: 'https://backend.planixor.com',
        path: '/api',
      });
    });

    it('should handle whitespace around input', () => {
      const result = parseServerUrl('  https://backend.planixor.com/api  ');
      expect(result).toEqual({
        origin: 'https://backend.planixor.com',
        path: '/api',
      });
    });

    it('should return empty origin and default path for empty input', () => {
      const result = parseServerUrl('');
      expect(result).toEqual({
        origin: '',
        path: '/api',
      });
    });

    it('should return empty origin and default path for whitespace-only input', () => {
      const result = parseServerUrl('   ');
      expect(result).toEqual({
        origin: '',
        path: '/api',
      });
    });

    it('should handle HTTP URLs correctly', () => {
      const result = parseServerUrl('http://localhost:3000/api');
      expect(result).toEqual({
        origin: 'http://localhost:3000',
        path: '/api',
      });
    });
  });

  describe('property tests', () => {
    it('should always return a path starting with "/"', () => {
      const urlArb = fc.webUrl().map((url) => url + '/somepath');

      fc.assert(
        fc.property(urlArb, (input) => {
          const { path } = parseServerUrl(input);
          expect(path.startsWith('/')).toBe(true);
        }),
        { numRuns: 50 },
      );
    });

    it('should never return a path ending with "/" unless path is "/"', () => {
      const urlArb = fc.webUrl();

      fc.assert(
        fc.property(urlArb, (input) => {
          const { path } = parseServerUrl(input);
          if (path.length > 1) {
            expect(path.endsWith('/')).toBe(false);
          }
        }),
        { numRuns: 50 },
      );
    });
  });
});

describe('buildFullServerUrl', () => {
  describe('unit tests', () => {
    it('should combine serverUrl and apiBasePath', () => {
      const result = buildFullServerUrl(
        'https://backend.planixor.com',
        '/api',
      );
      expect(result).toBe('https://backend.planixor.com/api');
    });

    it('should combine serverUrl with multi-segment path', () => {
      const result = buildFullServerUrl(
        'https://backend.planixor.com',
        '/custom/v2',
      );
      expect(result).toBe('https://backend.planixor.com/custom/v2');
    });

    it('should return empty string when serverUrl is empty', () => {
      const result = buildFullServerUrl('', '/api');
      expect(result).toBe('');
    });

    it('should return serverUrl alone when apiBasePath is "/"', () => {
      const result = buildFullServerUrl('https://backend.planixor.com', '/');
      expect(result).toBe('https://backend.planixor.com');
    });

    it('should return serverUrl alone when apiBasePath is empty', () => {
      const result = buildFullServerUrl('https://backend.planixor.com', '');
      expect(result).toBe('https://backend.planixor.com');
    });

    it('should handle URL with port', () => {
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      const result = buildFullServerUrl('http://192.168.1.100:8080', '/api');
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      expect(result).toBe('http://192.168.1.100:8080/api');
    });
  });

  describe('property tests', () => {
    it('should be the inverse of parseServerUrl for well-formed URLs', () => {
      const origins = [
        'https://backend.planixor.com',
        'https://localhost:3000',
        'https://api.example.org',
      ];
      const paths = ['/api', '/custom/v2', '/v1/sync'];

      fc.assert(
        fc.property(
          fc.constantFrom(...origins),
          fc.constantFrom(...paths),
          (origin, path) => {
            const fullUrl = buildFullServerUrl(origin, path);
            const parsed = parseServerUrl(fullUrl);
            expect(parsed.origin).toBe(origin);
            expect(parsed.path).toBe(path);
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
