package com.codenized.planixor.data.sync

import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest
import okhttp3.Call
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

/**
 * Unit tests for SyncValidationServiceImpl.
 * Uses mockk to mock OkHttpClient and verify request construction and response mapping.
 *
 * Validates: Requirements 5.1, 6.1, 7.1
 */
class SyncValidationServiceImplTest {

    private val mockClient = mockk<OkHttpClient>()
    private val service = SyncValidationServiceImpl(client = mockClient)

    private fun mockResponse(
        code: Int,
        body: String = "",
        request: Request = Request.Builder().url("http://localhost").build(),
    ): Response {
        return Response.Builder()
            .code(code)
            .protocol(Protocol.HTTP_1_1)
            .message("OK")
            .request(request)
            .body(body.toResponseBody("application/json".toMediaType()))
            .build()
    }

    private fun setupMockCall(response: Response) {
        val mockCall = mockk<Call>(relaxed = true)
        every { mockCall.execute() } returns response
        every { mockClient.newCall(any()) } returns mockCall
    }

    private fun setupMockCallThrows(exception: Exception) {
        val mockCall = mockk<Call>()
        every { mockCall.execute() } throws exception
        every { mockClient.newCall(any()) } returns mockCall
    }

    @Test
    fun `validate should return success with username when API responds 200`() = runTest {
        val responseBody = """{"username": "pepito"}"""
        setupMockCall(mockResponse(code = 200, body = responseBody))

        val result = service.validate("https://backend.planixor.com", "sk-test-key")

        assertTrue(result.success)
        assertEquals("pepito", result.username)
        assertNull(result.error)
    }

    @Test
    fun `validate should return invalid_credentials when API responds 401`() = runTest {
        setupMockCall(mockResponse(code = 401))

        val result = service.validate("https://backend.planixor.com", "bad-key")

        assertFalse(result.success)
        assertEquals("invalid_credentials", result.error)
        assertNull(result.username)
    }

    @Test
    fun `validate should return invalid_credentials when API responds 403`() = runTest {
        setupMockCall(mockResponse(code = 403))

        val result = service.validate("https://backend.planixor.com", "forbidden-key")

        assertFalse(result.success)
        assertEquals("invalid_credentials", result.error)
        assertNull(result.username)
    }

    @Test
    fun `validate should return not_found when API responds 404`() = runTest {
        setupMockCall(mockResponse(code = 404))

        val result = service.validate("https://backend.planixor.com", "sk-test-key")

        assertFalse(result.success)
        assertEquals("not_found", result.error)
        assertNull(result.username)
    }

    @Test
    fun `validate should return server_error when API responds 500`() = runTest {
        setupMockCall(mockResponse(code = 500))

        val result = service.validate("https://backend.planixor.com", "sk-test-key")

        assertFalse(result.success)
        assertEquals("server_error", result.error)
        assertNull(result.username)
    }

    @Test
    fun `validate should return invalid_input when URL is blank`() = runTest {
        val result = service.validate("   ", "sk-test-key")

        assertFalse(result.success)
        assertEquals("invalid_input", result.error)
        assertNull(result.username)
    }

    @Test
    fun `validate should return invalid_input when API key is blank`() = runTest {
        val result = service.validate("https://backend.planixor.com", "")

        assertFalse(result.success)
        assertEquals("invalid_input", result.error)
        assertNull(result.username)
    }

    @Test
    fun `validate should return network_error on IOException`() = runTest {
        setupMockCallThrows(IOException("Connection refused"))

        val result = service.validate("https://backend.planixor.com", "sk-test-key")

        assertFalse(result.success)
        assertEquals("network_error", result.error)
        assertNull(result.username)
    }

    @Test
    fun `validate should construct GET request to correct URL with Bearer header`() = runTest {
        val requestSlot = slot<Request>()
        val mockCall = mockk<Call>()
        val responseBody = """{"username": "testuser"}"""
        every { mockCall.execute() } returns mockResponse(code = 200, body = responseBody)
        every { mockClient.newCall(capture(requestSlot)) } returns mockCall

        service.validate("https://backend.planixor.com", "sk-my-api-key")

        val capturedRequest = requestSlot.captured
        assertEquals("GET", capturedRequest.method)
        assertEquals(
            "https://backend.planixor.com/api/security/validate",
            capturedRequest.url.toString(),
        )
        assertEquals("Bearer sk-my-api-key", capturedRequest.header("Authorization"))
    }
}
