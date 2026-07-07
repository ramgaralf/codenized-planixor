package com.codenized.planixor.domain.series

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random

/**
 * Property-based tests for SeriesGenerator pure function.
 * Uses systematic and random inputs to validate universal invariants.
 *
 * Feature: gh38-reminder-series, Property 4: Series Date Generation Correctness
 * Feature: gh38-reminder-series, Property 7: Maximum Occurrence Cap
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.8, 7.2
 */
class SeriesGeneratorPropertyTest {

    private val frequencies = listOf("weekly", "monthly", "yearly")
    private val random = Random(42L) // Fixed seed for reproducibility

    // --- Helper functions ---

    private fun randomDate(random: Random): String {
        val year = random.nextInt(11) + 2020 // 2020–2030
        val month = random.nextInt(12) + 1
        val maxDay = daysInMonth(year, month)
        val day = random.nextInt(maxDay) + 1
        return "%04d-%02d-%02d".format(year, month, day)
    }

    private fun isLeapYear(year: Int): Boolean {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
    }

    private fun daysInMonth(year: Int, month: Int): Int {
        return when (month) {
            1 -> 31; 2 -> if (isLeapYear(year)) 29 else 28; 3 -> 31
            4 -> 30; 5 -> 31; 6 -> 30; 7 -> 31; 8 -> 31
            9 -> 30; 10 -> 31; 11 -> 30; 12 -> 31; else -> 30
        }
    }

    private fun parseDate(date: String): Triple<Int, Int, Int> {
        val parts = date.split("-")
        return Triple(parts[0].toInt(), parts[1].toInt(), parts[2].toInt())
    }

    private fun daysBetween(date1: String, date2: String): Long {
        val (y1, m1, d1) = parseDate(date1)
        val (y2, m2, d2) = parseDate(date2)
        return toEpochDay(y2, m2, d2) - toEpochDay(y1, m1, d1)
    }

    private fun toEpochDay(year: Int, month: Int, day: Int): Long {
        // Simplified Julian day calculation for comparison
        var y = year.toLong()
        var m = month.toLong()
        if (m <= 2) { y -= 1; m += 12 }
        val a = y / 100
        val b = 2 - a + a / 4
        return (365.25 * (y + 4716)).toLong() + (30.6001 * (m + 1)).toLong() + day + b - 1524
    }

    /**
     * Converts a year boundary integer to an end date string (Dec 31 of that year).
     */
    private fun yearBoundaryToEndDate(year: Int): String = "%04d-12-31".format(year)

    // =========================================================================
    // Property 4: Series Date Generation Correctness
    // =========================================================================

    /**
     * Property 4a: All generated dates are strictly after the start date.
     *
     * For any valid start date and non-never frequency, all dates in the
     * result list must be lexicographically (and temporally) after the start date.
     */
    @Test
    fun `property 4a - all dates are strictly after start date (random inputs)`() {
        repeat(150) {
            val startDay = randomDate(random)
            val frequency = frequencies[random.nextInt(frequencies.size)]
            val startYear = parseDate(startDay).first
            val endYear = startYear + random.nextInt(3) // 0-2 years ahead
            val endDate = yearBoundaryToEndDate(endYear)

            val result = SeriesGenerator.generateDates(startDay, frequency, endDate)

            result.forEach { date ->
                assertTrue(
                    "Date $date should be after $startDay (freq=$frequency, endDate=$endDate)",
                    date > startDay
                )
            }
        }
    }

    /**
     * Property 4b: All generated dates are within the end date boundary.
     *
     * For any valid input, every generated date must be <= endDate.
     */
    @Test
    fun `property 4b - all dates within end date (random inputs)`() {
        repeat(150) {
            val startDay = randomDate(random)
            val frequency = frequencies[random.nextInt(frequencies.size)]
            val startYear = parseDate(startDay).first
            val endYear = startYear + random.nextInt(5)
            val endDate = yearBoundaryToEndDate(endYear)

            val result = SeriesGenerator.generateDates(startDay, frequency, endDate)

            result.forEach { date ->
                assertTrue(
                    "Date $date exceeds endDate $endDate (start=$startDay, freq=$frequency)",
                    date <= endDate
                )
            }
        }
    }

    /**
     * Property 4c: Weekly frequency produces dates exactly 7 days apart.
     *
     * For weekly frequency, each consecutive pair of dates (and the first date
     * relative to startDay) must be exactly 7 days apart.
     */
    @Test
    fun `property 4c - weekly dates are exactly 7 days apart (random inputs)`() {
        repeat(150) {
            val startDay = randomDate(random)
            val startYear = parseDate(startDay).first
            val endYear = startYear + random.nextInt(2)
            val endDate = yearBoundaryToEndDate(endYear)

            val result = SeriesGenerator.generateDates(startDay, "weekly", endDate)

            if (result.isNotEmpty()) {
                // First date should be 7 days after start
                val firstGap = daysBetween(startDay, result[0])
                assertEquals(
                    "First weekly date should be 7 days after $startDay, got ${result[0]}",
                    7L, firstGap
                )

                // Each consecutive pair should be 7 days apart
                for (i in 1 until result.size) {
                    val gap = daysBetween(result[i - 1], result[i])
                    assertEquals(
                        "Weekly gap between ${result[i-1]} and ${result[i]} should be 7 days",
                        7L, gap
                    )
                }
            }
        }
    }

    /**
     * Property 4d: Monthly frequency produces dates with same day-of-month
     * (or clamped to last day of month).
     *
     * For monthly frequency, each generated date has day-of-month equal to
     * the source day, or the last day of that month if the source day exceeds it.
     */
    @Test
    fun `property 4d - monthly dates have correct day-of-month (random inputs)`() {
        repeat(150) {
            val startDay = randomDate(random)
            val (startYear, _, startDayOfMonth) = parseDate(startDay)
            val endYear = startYear + random.nextInt(3)
            val endDate = yearBoundaryToEndDate(endYear)

            val result = SeriesGenerator.generateDates(startDay, "monthly", endDate)

            result.forEach { date ->
                val (dateYear, dateMonth, dateDayOfMonth) = parseDate(date)
                val maxDayInMonth = daysInMonth(dateYear, dateMonth)
                val expectedDay = minOf(startDayOfMonth, maxDayInMonth)

                assertEquals(
                    "Monthly date $date should have day=$expectedDay (source day=$startDayOfMonth, " +
                        "max in month=$maxDayInMonth)",
                    expectedDay, dateDayOfMonth
                )
            }
        }
    }

    /**
     * Property 4e: Yearly frequency produces dates with same month and day
     * (or Feb 29 clamped to Feb 28 in non-leap years).
     */
    @Test
    fun `property 4e - yearly dates have correct month and day (random inputs)`() {
        repeat(150) {
            val startDay = randomDate(random)
            val (startYear, startMonth, startDayOfMonth) = parseDate(startDay)
            val endYear = startYear + random.nextInt(6) + 1 // At least 1 year ahead
            val endDate = yearBoundaryToEndDate(endYear)

            val result = SeriesGenerator.generateDates(startDay, "yearly", endDate)

            result.forEach { date ->
                val (dateYear, dateMonth, dateDayOfMonth) = parseDate(date)

                assertEquals(
                    "Yearly date $date should have month=$startMonth (start=$startDay)",
                    startMonth, dateMonth
                )

                if (startMonth == 2 && startDayOfMonth == 29 && !isLeapYear(dateYear)) {
                    assertEquals(
                        "Yearly date $date should clamp Feb 29 to 28 in non-leap year",
                        28, dateDayOfMonth
                    )
                } else {
                    assertEquals(
                        "Yearly date $date should have day=$startDayOfMonth (start=$startDay)",
                        startDayOfMonth, dateDayOfMonth
                    )
                }
            }
        }
    }

    /**
     * Property 4f: The function is deterministic — same inputs always produce
     * same outputs.
     */
    @Test
    fun `property 4f - function is deterministic (random inputs)`() {
        val deterministicRandom = Random(99L)
        repeat(100) {
            val startDay = randomDate(deterministicRandom)
            val frequency = frequencies[deterministicRandom.nextInt(frequencies.size)]
            val startYear = parseDate(startDay).first
            val endYear = startYear + deterministicRandom.nextInt(3)
            val endDate = yearBoundaryToEndDate(endYear)

            val result1 = SeriesGenerator.generateDates(startDay, frequency, endDate)
            val result2 = SeriesGenerator.generateDates(startDay, frequency, endDate)

            assertEquals(
                "Determinism failed for start=$startDay, freq=$frequency, endDate=$endDate",
                result1, result2
            )
        }
    }

    // =========================================================================
    // Property 4 — Systematic edge cases
    // =========================================================================

    /**
     * Property 4g: Monthly generation from day 29/30/31 correctly clamps across
     * all months in a year (systematic coverage).
     */
    @Test
    fun `property 4g - monthly clamping for edge days (systematic)`() {
        val edgeDays = listOf(28, 29, 30, 31)
        val years = listOf(2024, 2025, 2026) // 2024 is a leap year

        for (year in years) {
            for (month in 1..12) {
                for (day in edgeDays) {
                    if (day > daysInMonth(year, month)) continue

                    val startDay = "%04d-%02d-%02d".format(year, month, day)
                    val endDate = yearBoundaryToEndDate(year + 1)
                    val result = SeriesGenerator.generateDates(startDay, "monthly", endDate)

                    result.forEach { date ->
                        val (dYear, dMonth, dDay) = parseDate(date)
                        val maxDay = daysInMonth(dYear, dMonth)
                        assertTrue(
                            "Date $date day $dDay exceeds max $maxDay for month $dMonth/$dYear " +
                                "(start=$startDay)",
                            dDay <= maxDay
                        )
                        val expectedDay = minOf(day, maxDay)
                        assertEquals(
                            "Date $date should have day=$expectedDay",
                            expectedDay, dDay
                        )
                    }
                }
            }
        }
    }

    /**
     * Property 4h: Weekly generation crossing year boundaries stops correctly.
     */
    @Test
    fun `property 4h - weekly stops at end date (systematic)`() {
        // Start from various December dates
        for (day in 1..31) {
            if (day > 31) continue
            val startDay = "2025-12-%02d".format(day)
            val endDate = "2025-12-31"
            val result = SeriesGenerator.generateDates(startDay, "weekly", endDate)

            result.forEach { date ->
                assertTrue("Weekly date $date exceeds $endDate (start=$startDay)", date <= endDate)
            }
        }
    }

    // =========================================================================
    // Property 7: Maximum Occurrence Cap
    // =========================================================================

    /**
     * Property 7a: For any start date and frequency, the generator produces
     * at most 366 occurrence records.
     */
    @Test
    fun `property 7a - at most 366 occurrences (random inputs)`() {
        repeat(150) {
            val startDay = randomDate(random)
            val frequency = frequencies[random.nextInt(frequencies.size)]
            val startYear = parseDate(startDay).first
            // Large end date to stress the cap
            val endYear = startYear + random.nextInt(20) + 5
            val endDate = yearBoundaryToEndDate(endYear)

            val result = SeriesGenerator.generateDates(startDay, frequency, endDate)

            assertTrue(
                "Result size ${result.size} exceeds 366 cap " +
                    "(start=$startDay, freq=$frequency, endDate=$endDate)",
                result.size <= 366
            )
        }
    }

    /**
     * Property 7b: Weekly frequency with large year range hits the 366 cap.
     * (Validates the cap is actually enforced, not just avoided by end date.)
     */
    @Test
    fun `property 7b - weekly with large range hits cap (systematic)`() {
        // Weekly from Jan 1 2020 with endDate 2030-12-31 = ~520 weeks possible
        // Should be capped at 366
        val result = SeriesGenerator.generateDates("2020-01-01", "weekly", "2030-12-31")
        assertEquals("Weekly should hit 366 cap with 10-year range", 366, result.size)
    }

    /**
     * Property 7c: Monthly frequency with large range hits cap eventually.
     * 30+ years × 12 months > 366
     */
    @Test
    fun `property 7c - monthly with very large range hits cap (systematic)`() {
        val result = SeriesGenerator.generateDates("2020-01-15", "monthly", "2060-12-31")
        assertEquals("Monthly should hit 366 cap with 40-year range", 366, result.size)
    }

    /**
     * Property 7d: Yearly frequency with large range hits cap eventually.
     * 366+ years needed.
     */
    @Test
    fun `property 7d - yearly with very large range hits cap (systematic)`() {
        val result = SeriesGenerator.generateDates("2020-06-15", "yearly", "2500-12-31")
        assertEquals("Yearly should hit 366 cap with 480-year range", 366, result.size)
    }

    /**
     * Property 7e: Cap applies regardless of start date or frequency (random stress).
     */
    @Test
    fun `property 7e - cap holds under all random stress inputs`() {
        val stressRandom = Random(777L)
        repeat(200) {
            val startDay = randomDate(stressRandom)
            val frequency = frequencies[stressRandom.nextInt(frequencies.size)]
            // Very large end date to stress-test the cap
            val endDate = "2500-12-31"

            val result = SeriesGenerator.generateDates(startDay, frequency, endDate)

            assertTrue(
                "Stress test: size ${result.size} exceeds 366 " +
                    "(start=$startDay, freq=$frequency)",
                result.size <= 366
            )
        }
    }
}
