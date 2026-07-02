package com.codenized.planixor.data.sync

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Unit tests for ApiBasePathUtils.parseServerUrl and buildFullServerUrl.
 */
class ApiBasePathUtilsTest {

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
