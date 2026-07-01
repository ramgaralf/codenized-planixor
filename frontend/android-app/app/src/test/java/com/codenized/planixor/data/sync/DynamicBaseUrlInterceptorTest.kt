package com.codenized.planixor.data.sync

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import okhttp3.Interceptor
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for DynamicBaseUrlInterceptor with apiBasePath support.
 *
 * Validates: Requirements 4.9
 */
class DynamicBaseUrlInterceptorTest {

    private lateinit var interceptor: DynamicBaseUrlInterceptor
    private val chain = mockk<Interceptor.Chain>()

    @Before
    fun setup() {
        interceptor = DynamicBaseUrlInterceptor()

        // Mock chain.proceed to return a dummy response with the rewritten request
        val requestSlot = slot<Request>()
        every { chain.proceed(any()) } answers {
            val req = firstArg<Request>()
            Response.Builder()
                .code(200)
                .protocol(Protocol.HTTP_1_1)
                .message("OK")
                .request(req)
                .body("".toResponseBody())
                .build()
        }
    }

    private fun buildRequestWithPath(path: String): Request {
        return Request.Builder()
            .url("http://placeholder.local/$path")
            .build()
    }

    private fun interceptAndGetUrl(request: Request): String {
        every { chain.request() } returns request
        val response = interceptor.intercept(chain)
        return response.request.url.toString()
    }

    @Test
    fun `should apply custom apiBasePath to URL correctly`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = "/custom/v2"

        val request = buildRequestWithPath("api/calendar-events/sync/push")
        val resultUrl = interceptAndGetUrl(request)

        assertEquals(
            "https://backend.planixor.com/custom/v2/calendar-events/sync/push",
            resultUrl,
        )
    }

    @Test
    fun `should use default api path when apiBasePath is null`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = null

        val request = buildRequestWithPath("api/calendar-events/sync/push")
        val resultUrl = interceptAndGetUrl(request)

        assertEquals(
            "https://backend.planixor.com/api/calendar-events/sync/push",
            resultUrl,
        )
    }

    @Test
    fun `should use default api path when apiBasePath is blank`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = "   "

        val request = buildRequestWithPath("api/calendar-events/sync/push")
        val resultUrl = interceptAndGetUrl(request)

        assertEquals(
            "https://backend.planixor.com/api/calendar-events/sync/push",
            resultUrl,
        )
    }

    @Test
    fun `should use default api path when apiBasePath is empty string`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = ""

        val request = buildRequestWithPath("api/calendar-events/sync/push")
        val resultUrl = interceptAndGetUrl(request)

        assertEquals(
            "https://backend.planixor.com/api/calendar-events/sync/push",
            resultUrl,
        )
    }

    @Test
    fun `should order path segments correctly with basePath segments then endpoint path`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = "/custom/v2"

        val request = buildRequestWithPath("api/notification-records/sync/pull")
        val resultUrl = interceptAndGetUrl(request)

        assertEquals(
            "https://backend.planixor.com/custom/v2/notification-records/sync/pull",
            resultUrl,
        )
    }

    @Test
    fun `should rewrite sync endpoint with custom apiBasePath`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = "/custom/v2"

        val request = buildRequestWithPath("api/calendar-events/sync/push")
        val resultUrl = interceptAndGetUrl(request)

        // Verifies the full pattern: {baseUrl}/custom/v2/calendar-events/sync/push
        assertEquals(
            "https://backend.planixor.com/custom/v2/calendar-events/sync/push",
            resultUrl,
        )
    }

    @Test
    fun `should handle serverUrl with port and custom apiBasePath`() {
        interceptor.serverUrl = "http://192.168.1.100:8080"
        interceptor.apiBasePath = "/custom/v2"

        val request = buildRequestWithPath("api/shifts/sync/push")
        val resultUrl = interceptAndGetUrl(request)

        assertEquals(
            "http://192.168.1.100:8080/custom/v2/shifts/sync/push",
            resultUrl,
        )
    }

    @Test
    fun `should handle security validate endpoint with custom apiBasePath`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = "/custom/v2"

        val request = buildRequestWithPath("api/security/validate")
        val resultUrl = interceptAndGetUrl(request)

        assertEquals(
            "https://backend.planixor.com/custom/v2/security/validate",
            resultUrl,
        )
    }

    @Test
    fun `should handle single segment apiBasePath`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = "/v3"

        val request = buildRequestWithPath("api/reminders/sync/pull")
        val resultUrl = interceptAndGetUrl(request)

        assertEquals(
            "https://backend.planixor.com/v3/reminders/sync/pull",
            resultUrl,
        )
    }

    @Test
    fun `should handle apiBasePath with trailing slash stripped by interceptor`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiBasePath = "/custom/v2/"

        val request = buildRequestWithPath("api/annual-hours-config/sync/push")
        val resultUrl = interceptAndGetUrl(request)

        // The trim('/') in resolveBasePath handles trailing slashes
        assertEquals(
            "https://backend.planixor.com/custom/v2/annual-hours-config/sync/push",
            resultUrl,
        )
    }

    @Test
    fun `should add Authorization header when apiKey is set`() {
        interceptor.serverUrl = "https://backend.planixor.com"
        interceptor.apiKey = "sk-test-key-123"
        interceptor.apiBasePath = "/custom/v2"

        val request = buildRequestWithPath("api/calendar-events/sync/push")
        every { chain.request() } returns request

        val response = interceptor.intercept(chain)

        assertEquals("Bearer sk-test-key-123", response.request.header("Authorization"))
    }

    @Test
    fun `should not modify URL when serverUrl is null`() {
        interceptor.serverUrl = null
        interceptor.apiBasePath = "/custom/v2"

        val request = buildRequestWithPath("api/calendar-events/sync/push")
        val resultUrl = interceptAndGetUrl(request)

        // URL remains unchanged (placeholder URL)
        assertEquals(
            "http://placeholder.local/api/calendar-events/sync/push",
            resultUrl,
        )
    }
}
