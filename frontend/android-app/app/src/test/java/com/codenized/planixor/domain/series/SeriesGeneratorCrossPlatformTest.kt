package com.codenized.planixor.domain.series

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Cross-Platform Consistency Tests
 *
 * These tests verify that the Android `SeriesGenerator.generateDates` produces identical
 * output to the React Web `generateSeriesDates` for the same inputs.
 *
 * The matching test file is:
 *   frontend/react-web/src/features/reminders/services/seriesGenerator.crossplatform.test.ts
 *
 * Both files use the EXACT same inputs and assert the EXACT same expected outputs.
 * If either test fails, the platforms are out of sync.
 *
 * Validates: Requirements 7.2
 */
class SeriesGeneratorCrossPlatformTest {

    @Test
    fun `Case 1 - monthly from Jan 31 - 11 dates with clamping`() {
        val result = SeriesGenerator.generateDates("2025-01-31", "monthly", "2025-12-31")

        assertEquals(
            listOf(
                "2025-02-28",
                "2025-03-31",
                "2025-04-30",
                "2025-05-31",
                "2025-06-30",
                "2025-07-31",
                "2025-08-31",
                "2025-09-30",
                "2025-10-31",
                "2025-11-30",
                "2025-12-31",
            ),
            result,
        )
    }

    @Test
    fun `Case 2 - yearly from Feb 29 through 2028 - leap year clamping`() {
        val result = SeriesGenerator.generateDates("2024-02-29", "yearly", "2028-12-31")

        assertEquals(
            listOf("2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"),
            result,
        )
    }

    @Test
    fun `Case 3 - weekly from Dec 20 - only one date before year end`() {
        val result = SeriesGenerator.generateDates("2025-12-20", "weekly", "2025-12-31")

        assertEquals(listOf("2025-12-27"), result)
    }

    @Test
    fun `Case 4 - weekly from Mar 15 - first 3 dates`() {
        val result = SeriesGenerator.generateDates("2025-03-15", "weekly", "2025-12-31")

        assertEquals("2025-03-22", result[0])
        assertEquals("2025-03-29", result[1])
        assertEquals("2025-04-05", result[2])
    }

    @Test
    fun `Case 5 - weekly from Jan 1 - exactly 52 dates, last is Dec 31`() {
        val result = SeriesGenerator.generateDates("2025-01-01", "weekly", "2025-12-31")

        assertEquals(52, result.size)
        assertEquals("2025-12-31", result[result.size - 1])
    }

    @Test
    fun `Case 6 - monthly from Jan 29 2024 - Feb 29 valid in leap year`() {
        val result = SeriesGenerator.generateDates("2024-01-29", "monthly", "2024-12-31")

        assertEquals("2024-02-29", result[0])
        assertEquals("2024-03-29", result[1])
    }

    @Test
    fun `Case 7 - yearly from Feb 28 2025 within same year - empty`() {
        val result = SeriesGenerator.generateDates("2025-02-28", "yearly", "2025-12-31")

        assertEquals(emptyList<String>(), result)
    }
}
