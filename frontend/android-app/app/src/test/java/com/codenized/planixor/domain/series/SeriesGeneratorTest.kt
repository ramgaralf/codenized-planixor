package com.codenized.planixor.domain.series

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for SeriesGenerator pure function.
 * Validates the algorithm produces correct results for known inputs.
 *
 * Feature: gh38-reminder-series
 */
class SeriesGeneratorTest {

    // --- Monthly generation tests ---

    @Test
    fun `monthly from Jan 31 should clamp to last day of shorter months`() {
        val result = SeriesGenerator.generateDates("2025-01-31", "monthly", "2025-12-31")

        assertEquals(11, result.size)
        assertEquals("2025-02-28", result[0])
        assertEquals("2025-03-31", result[1])
        assertEquals("2025-04-30", result[2])
        assertEquals("2025-05-31", result[3])
        assertEquals("2025-06-30", result[4])
        assertEquals("2025-07-31", result[5])
        assertEquals("2025-08-31", result[6])
        assertEquals("2025-09-30", result[7])
        assertEquals("2025-10-31", result[8])
        assertEquals("2025-11-30", result[9])
        assertEquals("2025-12-31", result[10])
    }

    @Test
    fun `monthly from mid-month should keep same day`() {
        val result = SeriesGenerator.generateDates("2025-01-15", "monthly", "2025-12-31")

        assertEquals(11, result.size)
        assertEquals("2025-02-15", result[0])
        assertEquals("2025-03-15", result[1])
        assertEquals("2025-12-15", result[10])
    }

    // --- Yearly generation tests ---

    @Test
    fun `yearly from leap day should clamp to Feb 28 in non-leap year`() {
        val result = SeriesGenerator.generateDates("2024-02-29", "yearly", "2025-12-31")

        assertEquals(1, result.size)
        assertEquals("2025-02-28", result[0])
    }

    @Test
    fun `yearly from Feb 28 within same year should produce empty list`() {
        val result = SeriesGenerator.generateDates("2025-02-28", "yearly", "2025-12-31")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `yearly from leap day to next leap year should preserve Feb 29`() {
        val result = SeriesGenerator.generateDates("2024-02-29", "yearly", "2028-12-31")

        assertEquals(4, result.size)
        assertEquals("2025-02-28", result[0])
        assertEquals("2026-02-28", result[1])
        assertEquals("2027-02-28", result[2])
        assertEquals("2028-02-29", result[3])
    }

    // --- Weekly generation tests ---

    @Test
    fun `weekly from March 15 should produce dates every 7 days`() {
        val result = SeriesGenerator.generateDates("2025-03-15", "weekly", "2025-12-31")

        assertTrue(result.isNotEmpty())
        assertEquals("2025-03-22", result[0])
        assertEquals("2025-03-29", result[1])
        assertEquals("2025-04-05", result[2])
    }

    @Test
    fun `weekly should stop at end date`() {
        val result = SeriesGenerator.generateDates("2025-12-20", "weekly", "2025-12-31")

        assertEquals(1, result.size)
        assertEquals("2025-12-27", result[0])
    }

    @Test
    fun `weekly from Jan 1 should produce approximately 52 dates within same year`() {
        val result = SeriesGenerator.generateDates("2025-01-01", "weekly", "2025-12-31")

        // 365 days / 7 = 52.14, so 52 occurrences
        assertEquals(52, result.size)
        assertEquals("2025-01-08", result[0])
        assertEquals("2025-12-31", result[51])
    }

    // --- Safety cap test ---

    @Test
    fun `weekly should not exceed 366 occurrences`() {
        // A very large end date to test the cap
        val result = SeriesGenerator.generateDates("2020-01-01", "weekly", "2030-12-31")

        assertTrue(result.size <= 366)
    }

    // --- Edge cases ---

    @Test
    fun `invalid frequency should return empty list`() {
        val result = SeriesGenerator.generateDates("2025-01-01", "never", "2025-12-31")
        assertTrue(result.isEmpty())

        val result2 = SeriesGenerator.generateDates("2025-01-01", "invalid", "2025-12-31")
        assertTrue(result2.isEmpty())
    }

    @Test
    fun `source date is excluded from results`() {
        val result = SeriesGenerator.generateDates("2025-06-15", "weekly", "2025-12-31")
        assertTrue(result.none { it == "2025-06-15" })
    }

    @Test
    fun `all generated dates should be after start date`() {
        val result = SeriesGenerator.generateDates("2025-03-15", "weekly", "2025-12-31")
        assertTrue(result.all { it > "2025-03-15" })
    }

    @Test
    fun `all generated dates should be within end date`() {
        val result = SeriesGenerator.generateDates("2025-06-15", "monthly", "2025-12-31")
        assertTrue(result.all { it <= "2025-12-31" })
    }

    @Test
    fun `monthly crossing end date should stop`() {
        val result = SeriesGenerator.generateDates("2025-11-15", "monthly", "2025-12-31")

        assertEquals(1, result.size)
        assertEquals("2025-12-15", result[0])
    }
}
