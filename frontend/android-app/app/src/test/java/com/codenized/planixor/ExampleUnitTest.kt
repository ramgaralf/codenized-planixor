package com.codenized.planixor

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Minimal unit test to verify the test infrastructure works.
 */
class ExampleUnitTest {

    @Test
    fun `test infrastructure is working`() {
        val expected = 4
        val result = 2 + 2
        assertEquals(expected, result)
    }

    @Test
    fun `app name constant is correct`() {
        val appName = "Planixor"
        assertTrue(appName.isNotBlank())
    }
}
