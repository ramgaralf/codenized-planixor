package com.codenized.planixor.data.sync

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for ApiBasePathUtils.parseServerUrl, validateAndParseServerUrl, and buildFullServerUrl.
 */
class ApiBasePathUtilsTest {

    // --- parseServerUrl (legacy Pair-returning version) ---

    @Test
    fun `parseServerUrl should extract origin and path from standard URL`() {
        val (origin, path) = ApiBasePathUtils.parseServerUrl("https://backend.planixor.com/api")
        assertEquals("https://backend.planixor.com", origin)
        assertEquals("/api", path)
    }

    @Test
    fun `parseServerUrl should extract multi-segment path`() {
        val (origin, path) = ApiBasePathUtils.parseServerUrl("https://backend.planixor.com/custom/v2")
        assertEquals("https://backend.planixor.com", origin)
        assertEquals("/custom/v2", path)
    }

    @Test
    fun `parseServerUrl should include port in origin`() {
        val (origin, path) = ApiBasePathUtils.parseServerUrl("http://192.168.1.100:8080/api")
        assertEquals("http://192.168.1.100:8080", origin)
        assertEquals("/api", path)
    }

    @Test
    fun `parseServerUrl should default path to api when no path provided`() {
        val (origin, path) = ApiBasePathUtils.parseServerUrl("https://backend.planixor.com")
        assertEquals("https://backend.planixor.com", origin)
        assertEquals("/api", path)
    }

    @Test
    fun `parseServerUrl should default path to api when only slash provided`() {
        val (origin, path) = ApiBasePathUtils.parseServerUrl("https://backend.planixor.com/")
        assertEquals("https://backend.planixor.com", origin)
        assertEquals("/api", path)
    }

    @Test
    fun `parseServerUrl should strip trailing slash from path`() {
        val (origin, path) = ApiBasePathUtils.parseServerUrl("https://backend.planixor.com/custom/")
        assertEquals("https://backend.planixor.com", origin)
        assertEquals("/custom", path)
    }

    @Test
    fun `parseServerUrl should handle URL with port and no path`() {
        val (origin, path) = ApiBasePathUtils.parseServerUrl("http://localhost:3000")
        assertEquals("http://localhost:3000", origin)
        assertEquals("/api", path)
    }

    @Test
    fun `parseServerUrl should trim whitespace`() {
        val (origin, path) = ApiBasePathUtils.parseServerUrl("  https://backend.planixor.com/api  ")
        assertEquals("https://backend.planixor.com", origin)
        assertEquals("/api", path)
    }

    // --- validateAndParseServerUrl (Result-returning version with validation) ---

    @Test
    fun `validateAndParseServerUrl should succeed for standard https URL with path`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("https://backend.planixor.com/api")
        assertTrue(result.isSuccess)
        val parsed = result.getOrThrow()
        assertEquals("https://backend.planixor.com", parsed.serverUrl)
        assertEquals("/api", parsed.apiBasePath)
    }

    @Test
    fun `validateAndParseServerUrl should succeed for http URL with port`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("http://192.168.1.100:8080/api")
        assertTrue(result.isSuccess)
        val parsed = result.getOrThrow()
        assertEquals("http://192.168.1.100:8080", parsed.serverUrl)
        assertEquals("/api", parsed.apiBasePath)
    }

    @Test
    fun `validateAndParseServerUrl should default apiBasePath to api when no path`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("https://backend.planixor.com")
        assertTrue(result.isSuccess)
        val parsed = result.getOrThrow()
        assertEquals("https://backend.planixor.com", parsed.serverUrl)
        assertEquals("/api", parsed.apiBasePath)
    }

    @Test
    fun `validateAndParseServerUrl should default apiBasePath to api when only slash`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("https://backend.planixor.com/")
        assertTrue(result.isSuccess)
        val parsed = result.getOrThrow()
        assertEquals("https://backend.planixor.com", parsed.serverUrl)
        assertEquals("/api", parsed.apiBasePath)
    }

    @Test
    fun `validateAndParseServerUrl should extract multi-segment path`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("https://backend.planixor.com/custom/v2")
        assertTrue(result.isSuccess)
        val parsed = result.getOrThrow()
        assertEquals("https://backend.planixor.com", parsed.serverUrl)
        assertEquals("/custom/v2", parsed.apiBasePath)
    }

    @Test
    fun `validateAndParseServerUrl should trim whitespace before parsing`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("  https://backend.planixor.com/api  ")
        assertTrue(result.isSuccess)
        val parsed = result.getOrThrow()
        assertEquals("https://backend.planixor.com", parsed.serverUrl)
        assertEquals("/api", parsed.apiBasePath)
    }

    @Test
    fun `validateAndParseServerUrl should strip trailing slash from path`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("https://backend.planixor.com/custom/")
        assertTrue(result.isSuccess)
        val parsed = result.getOrThrow()
        assertEquals("/custom", parsed.apiBasePath)
    }

    @Test
    fun `validateAndParseServerUrl should reject URL without scheme`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("backend.planixor.com/api")
        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as UrlValidationException).error
        assertEquals(UrlValidationError.MISSING_SCHEME, error)
    }

    @Test
    fun `validateAndParseServerUrl should reject URL with whitespace in middle`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("https://backend .planixor.com/api")
        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as UrlValidationException).error
        assertEquals(UrlValidationError.CONTAINS_WHITESPACE, error)
    }

    @Test
    fun `validateAndParseServerUrl should reject URL with only scheme and no host`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("https://")
        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as UrlValidationException).error
        assertEquals(UrlValidationError.INVALID_HOST, error)
    }

    @Test
    fun `validateAndParseServerUrl should handle localhost with port`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("http://localhost:3000")
        assertTrue(result.isSuccess)
        val parsed = result.getOrThrow()
        assertEquals("http://localhost:3000", parsed.serverUrl)
        assertEquals("/api", parsed.apiBasePath)
    }

    @Test
    fun `validateAndParseServerUrl should reject ftp scheme`() {
        val result = ApiBasePathUtils.validateAndParseServerUrl("ftp://backend.planixor.com/api")
        assertTrue(result.isFailure)
        val error = (result.exceptionOrNull() as UrlValidationException).error
        assertEquals(UrlValidationError.MISSING_SCHEME, error)
    }

    // --- buildFullServerUrl ---

    @Test
    fun `buildFullServerUrl should combine origin and path`() {
        val result = ApiBasePathUtils.buildFullServerUrl("https://backend.planixor.com", "/api")
        assertEquals("https://backend.planixor.com/api", result)
    }

    @Test
    fun `buildFullServerUrl should handle trailing slash on origin`() {
        val result = ApiBasePathUtils.buildFullServerUrl("https://backend.planixor.com/", "/api")
        assertEquals("https://backend.planixor.com/api", result)
    }

    @Test
    fun `buildFullServerUrl should handle path without leading slash`() {
        val result = ApiBasePathUtils.buildFullServerUrl("https://backend.planixor.com", "api")
        assertEquals("https://backend.planixor.com/api", result)
    }

    @Test
    fun `buildFullServerUrl should return empty string for blank serverUrl`() {
        val result = ApiBasePathUtils.buildFullServerUrl("", "/api")
        assertEquals("", result)
    }

    @Test
    fun `buildFullServerUrl should combine with custom path`() {
        val result = ApiBasePathUtils.buildFullServerUrl("http://192.168.1.100:8080", "/custom/v2")
        assertEquals("http://192.168.1.100:8080/custom/v2", result)
    }
}
