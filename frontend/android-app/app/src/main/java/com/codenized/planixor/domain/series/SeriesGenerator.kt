package com.codenized.planixor.domain.series

/**
 * Pure function that generates series occurrence dates based on a start date,
 * frequency, and year boundary.
 *
 * This algorithm MUST produce identical results as the React Web `generateSeriesDates`
 * for the same inputs — cross-platform consistency is required.
 *
 * The source date itself is excluded from results.
 */
object SeriesGenerator {

    private const val MAX_OCCURRENCES = 366

    /**
     * Generates a list of occurrence dates from a start date through the end date.
     *
     * @param startDay ISO date string (YYYY-MM-DD) representing the source event date
     * @param frequency one of "weekly", "monthly", "yearly"
     * @param endDate ISO date string (YYYY-MM-DD) representing the maximum date (inclusive boundary)
     * @return list of YYYY-MM-DD date strings, excluding the source date itself
     */
    fun generateDates(
        startDay: String,
        frequency: String,
        endDate: String,
    ): List<String> {
        val parts = startDay.split("-")
        val startYear = parts[0].toInt()
        val startMonth = parts[1].toInt()
        val startDayOfMonth = parts[2].toInt()

        return when (frequency) {
            "weekly" -> generateWeekly(startYear, startMonth, startDayOfMonth, endDate)
            "monthly" -> generateMonthly(startYear, startMonth, startDayOfMonth, endDate)
            "yearly" -> generateYearly(startYear, startMonth, startDayOfMonth, endDate)
            else -> emptyList()
        }
    }

    private fun generateWeekly(
        startYear: Int,
        startMonth: Int,
        startDayOfMonth: Int,
        endDate: String,
    ): List<String> {
        val results = mutableListOf<String>()

        // Convert start date to a running day counter using a simple date arithmetic approach
        var year = startYear
        var month = startMonth
        var day = startDayOfMonth

        while (results.size < MAX_OCCURRENCES) {
            // Add 7 days
            day += 7
            // Normalize the date
            while (day > daysInMonth(year, month)) {
                day -= daysInMonth(year, month)
                month++
                if (month > 12) {
                    month = 1
                    year++
                }
            }

            val computedDate = formatDate(year, month, day)
            if (computedDate > endDate) break

            results.add(computedDate)
        }

        return results
    }

    private fun generateMonthly(
        startYear: Int,
        startMonth: Int,
        startDayOfMonth: Int,
        endDate: String,
    ): List<String> {
        val results = mutableListOf<String>()
        val sourceDay = startDayOfMonth

        var currentYear = startYear
        var currentMonth = startMonth

        while (results.size < MAX_OCCURRENCES) {
            // Move to next month
            currentMonth++
            if (currentMonth > 12) {
                currentMonth = 1
                currentYear++
            }

            val maxDay = daysInMonth(currentYear, currentMonth)
            val clampedDay = minOf(sourceDay, maxDay)

            val computedDate = formatDate(currentYear, currentMonth, clampedDay)
            if (computedDate > endDate) break

            results.add(computedDate)
        }

        return results
    }

    private fun generateYearly(
        startYear: Int,
        startMonth: Int,
        startDayOfMonth: Int,
        endDate: String,
    ): List<String> {
        val results = mutableListOf<String>()

        var currentYear = startYear

        while (results.size < MAX_OCCURRENCES) {
            currentYear++

            val clampedDay = if (startMonth == 2 && startDayOfMonth == 29 && !isLeapYear(currentYear)) {
                28
            } else {
                startDayOfMonth
            }

            val computedDate = formatDate(currentYear, startMonth, clampedDay)
            if (computedDate > endDate) break

            results.add(computedDate)
        }

        return results
    }

    private fun isLeapYear(year: Int): Boolean {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
    }

    private fun daysInMonth(year: Int, month: Int): Int {
        return when (month) {
            1 -> 31
            2 -> if (isLeapYear(year)) 29 else 28
            3 -> 31
            4 -> 30
            5 -> 31
            6 -> 30
            7 -> 31
            8 -> 31
            9 -> 30
            10 -> 31
            11 -> 30
            12 -> 31
            else -> 30
        }
    }

    private fun formatDate(year: Int, month: Int, day: Int): String {
        return "%04d-%02d-%02d".format(year, month, day)
    }
}
