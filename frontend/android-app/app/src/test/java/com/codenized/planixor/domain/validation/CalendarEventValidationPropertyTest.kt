package com.codenized.planixor.domain.validation

import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.filter
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Property-based tests for CalendarEventValidation time validation logic.
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh18-calendar-shift-reminder-improvements, Property 2: Reminder same-day time validation allows equality
 *
 * **Validates: Requirements 3.1, 3.2, 4.1, 8.2**
 */
@OptIn(ExperimentalKotest::class)
class CalendarEventValidationPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    // --- Generators ---

    /** Generates a valid time value in minutes (0-1439). */
    private val validTimeArb: Arb<Int> = Arb.int(0, 1439)

    // --- Property 2: Reminder same-day time validation allows equality ---

    /**
     * **Validates: Requirements 3.1, 3.2, 4.1, 8.2**
     *
     * Property 2: Reminder same-day time validation allows equality
     *
     * For any reminder event where endDay == startDay:
     *   - If endTime >= startTime -> validateTimeForReminder returns true
     *   - If endTime < startTime -> returns false
     * For any reminder event where endDay > startDay:
     *   - Any startTime/endTime (0-1439) returns true
     */
    @Test
    fun `Property 2 - same day with endTime equal to startTime returns true`() = runTest {
        checkAll(config, validTimeArb) { time ->
            val result = CalendarEventValidation.validateTimeForReminder(
                startDay = "2025-06-15",
                endDay = "2025-06-15",
                startTime = time,
                endTime = time,
            )
            assertTrue(
                "Expected true when same day and endTime ($time) == startTime ($time)",
                result,
            )
        }
    }

    @Test
    fun `Property 2 - same day with endTime greater than startTime returns true`() = runTest {
        val startTimeArb = Arb.int(0, 1438) // Allow room for endTime > startTime

        checkAll(config, startTimeArb) { startTime ->
            val endTime = startTime + 1 // Guarantee endTime > startTime
            val result = CalendarEventValidation.validateTimeForReminder(
                startDay = "2025-06-15",
                endDay = "2025-06-15",
                startTime = startTime,
                endTime = endTime,
            )
            assertTrue(
                "Expected true when same day and endTime ($endTime) > startTime ($startTime)",
                result,
            )
        }
    }

    @Test
    fun `Property 2 - same day with endTime greater than or equal to startTime returns true (full range)`() = runTest {
        checkAll(config, validTimeArb, validTimeArb) { startTime, endTime ->
            if (endTime >= startTime) {
                val result = CalendarEventValidation.validateTimeForReminder(
                    startDay = "2025-06-15",
                    endDay = "2025-06-15",
                    startTime = startTime,
                    endTime = endTime,
                )
                assertTrue(
                    "Expected true when same day and endTime ($endTime) >= startTime ($startTime)",
                    result,
                )
            }
        }
    }

    @Test
    fun `Property 2 - same day with endTime less than startTime returns false`() = runTest {
        val startTimeArb = Arb.int(1, 1439) // At least 1 so endTime can be less

        checkAll(config, startTimeArb) { startTime ->
            val endTime = startTime - 1 // Guarantee endTime < startTime
            val result = CalendarEventValidation.validateTimeForReminder(
                startDay = "2025-06-15",
                endDay = "2025-06-15",
                startTime = startTime,
                endTime = endTime,
            )
            assertFalse(
                "Expected false when same day and endTime ($endTime) < startTime ($startTime)",
                result,
            )
        }
    }

    @Test
    fun `Property 2 - same day with endTime strictly less than startTime returns false (full range)`() = runTest {
        val pairArb = Arb.int(0, 1439)

        checkAll(config, pairArb, pairArb) { startTime, endTime ->
            if (endTime < startTime) {
                val result = CalendarEventValidation.validateTimeForReminder(
                    startDay = "2025-06-15",
                    endDay = "2025-06-15",
                    startTime = startTime,
                    endTime = endTime,
                )
                assertFalse(
                    "Expected false when same day and endTime ($endTime) < startTime ($startTime)",
                    result,
                )
            }
        }
    }

    @Test
    fun `Property 2 - multi-day with any startTime and endTime returns true`() = runTest {
        checkAll(config, validTimeArb, validTimeArb) { startTime, endTime ->
            val result = CalendarEventValidation.validateTimeForReminder(
                startDay = "2025-06-15",
                endDay = "2025-06-16",
                startTime = startTime,
                endTime = endTime,
            )
            assertTrue(
                "Expected true for multi-day event regardless of times (startTime=$startTime, endTime=$endTime)",
                result,
            )
        }
    }

    @Test
    fun `Property 2 - multi-day with endTime less than startTime still returns true`() = runTest {
        val startTimeArb = Arb.int(1, 1439) // At least 1 so endTime can be less

        checkAll(config, startTimeArb) { startTime ->
            val endTime = startTime - 1
            val result = CalendarEventValidation.validateTimeForReminder(
                startDay = "2025-01-10",
                endDay = "2025-01-12",
                startTime = startTime,
                endTime = endTime,
            )
            assertTrue(
                "Expected true for multi-day event even when endTime ($endTime) < startTime ($startTime)",
                result,
            )
        }
    }
}
