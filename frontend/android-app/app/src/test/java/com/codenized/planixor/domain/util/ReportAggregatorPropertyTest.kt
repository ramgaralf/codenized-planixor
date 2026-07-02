package com.codenized.planixor.domain.util

import com.codenized.planixor.domain.model.CalendarEvent
import com.codenized.planixor.domain.model.TypeAggregate
import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.bind
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.of
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Property-based tests for report aggregation engine (Properties 1–6).
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh10-reports
 */
@OptIn(ExperimentalKotest::class)
class ReportAggregatorPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    // --- Generators ---

    /** Generates a valid ISO date string (YYYY-MM-DD) within a reasonable range. */
    private val dateArb: Arb<String> = Arb.bind(
        Arb.int(2015, 2030),
        Arb.int(1, 12),
        Arb.int(1, 28),
    ) { year, month, day ->
        "%04d-%02d-%02d".format(year, month, day)
    }

    /** Generates a UUID-like string for IDs. */
    private val idArb: Arb<String> = Arb.int(1, 999999).map { "id-$it" }

    /** Generates an event type (shift or reminder). */
    private val eventTypeArb: Arb<String> = Arb.of("shift", "reminder")

    /** Generates a typeId from a small set to allow grouping. */
    private val typeIdArb: Arb<String> = Arb.of("type-1", "type-2", "type-3", "type-4", "type-5")

    /** Generates a calendar event with arbitrary data. */
    private fun calendarEventArb(
        startDayArb: Arb<String> = dateArb,
        isDeletedArb: Arb<Boolean> = Arb.boolean(),
        eventTypeOverride: Arb<String> = eventTypeArb,
    ): Arb<CalendarEvent> = Arb.bind(
        idArb,
        eventTypeOverride,
        typeIdArb,
        startDayArb,
        dateArb,
        Arb.int(0, 1439),
        Arb.int(0, 1439),
        Arb.int(0, 600),
        isDeletedArb,
    ) { id, evType, typeId, startDay, endDay, startTime, endTime, totalHours, deleted ->
        CalendarEvent(
            id = id,
            eventType = evType,
            eventTypeId = typeId,
            startDay = startDay,
            endDay = if (endDay >= startDay) endDay else startDay,
            startTime = startTime,
            endTime = endTime,
            totalHours = totalHours,
            modifiedAt = System.currentTimeMillis(),
            isDeleted = deleted,
        )
    }

    // --- Property 1: Duration formatter decomposition is correct ---

    /**
     * **Validates: Requirements 2.11, 3.11, 5.10, 6.9, 13.1**
     *
     * Property 1: Duration formatter decomposition is correct
     *
     * For any non-negative Int totalMinutes, formatDuration(totalMinutes) produces
     * "{X}h {Y}m" where X*60+Y == totalMinutes.
     */
    @Test
    fun `Property 1 - formatDuration decomposition is correct`() = runTest {
        checkAll(config, Arb.int(0, 10000)) { totalMinutes ->
            val result = formatDuration(totalMinutes)
            val hours = totalMinutes / 60
            val minutes = totalMinutes % 60
            assertEquals(
                "formatDuration($totalMinutes) should produce '${hours}h ${minutes}m'",
                "${hours}h ${minutes}m",
                result,
            )
            // Verify decomposition: X*60 + Y == totalMinutes
            assertEquals(
                "hours*60 + minutes should equal totalMinutes",
                totalMinutes,
                hours * 60 + minutes,
            )
        }
    }

    // --- Property 2: Non-positive minutes normalize to 0 ---

    /**
     * **Validates: Requirements 13.2, 13.5**
     *
     * Property 2: Non-positive minutes normalize to 0
     *
     * For any Int <= 0, normalizeTotalMinutes returns 0.
     */
    @Test
    fun `Property 2 - non-positive minutes normalize to 0`() = runTest {
        checkAll(config, Arb.int(-10000, 0)) { value ->
            val result = normalizeTotalMinutes(value)
            assertEquals(
                "normalizeTotalMinutes($value) should return 0",
                0,
                result,
            )
        }
    }

    // --- Property 3: Aggregation includes only non-deleted events of correct type within period ---

    /**
     * **Validates: Requirements 2.9, 2.10, 3.8, 3.9, 5.8, 5.9, 6.7, 6.8**
     *
     * Property 3: filterEventsForPeriod includes event iff isDeleted==false
     * AND startDay >= startDate AND startDay <= endDate.
     */
    @Test
    fun `Property 3 - aggregation includes only non-deleted events within period`() = runTest {
        val startDate = "2025-03-01"
        val endDate = "2025-03-31"

        // Generate events with startDay that can be inside or outside the period
        val mixedDateArb = Arb.of(
            "2025-02-15", "2025-02-28", "2025-03-01", "2025-03-15",
            "2025-03-31", "2025-04-01", "2025-04-15",
        )

        val eventsArb = Arb.list(calendarEventArb(startDayArb = mixedDateArb), 1..20)

        checkAll(config, eventsArb) { events ->
            val result = filterEventsForPeriod(events, startDate, endDate)

            // Every included event must satisfy the three conditions
            result.forEach { event ->
                assertTrue(
                    "Included event ${event.id} must not be deleted",
                    !event.isDeleted,
                )
                assertTrue(
                    "Included event ${event.id} startDay (${event.startDay}) must be >= $startDate",
                    event.startDay >= startDate,
                )
                assertTrue(
                    "Included event ${event.id} startDay (${event.startDay}) must be <= $endDate",
                    event.startDay <= endDate,
                )
            }

            // Every event satisfying all conditions must be included
            val expectedIds = events.filter { event ->
                !event.isDeleted && event.startDay >= startDate && event.startDay <= endDate
            }.map { it.id }.toSet()

            val resultIds = result.map { it.id }.toSet()

            assertEquals(
                "filterEventsForPeriod should include exactly the qualifying events",
                expectedIds,
                resultIds,
            )
        }
    }

    // --- Property 4: Grand total equals sum of per-type totals ---

    /**
     * **Validates: Requirements 2.5, 2.7, 3.5, 3.7, 5.4, 5.6, 6.4, 6.6**
     *
     * Property 4: Sum of all values in aggregateByType result equals sum of
     * all input events' totalHours.
     */
    @Test
    fun `Property 4 - grand total equals sum of per-type totals`() = runTest {
        val nonDeletedEventsArb = Arb.list(
            calendarEventArb(isDeletedArb = Arb.of(false)),
            0..30,
        )

        checkAll(config, nonDeletedEventsArb) { events ->
            val aggregated = aggregateByType(events)
            val grandTotal = aggregated.values.sumOf { it.totalMinutes }
            val inputTotal = events.sumOf { it.totalHours }

            assertEquals(
                "Sum of per-type totals ($grandTotal) should equal sum of all events' totalHours ($inputTotal)",
                inputTotal,
                grandTotal,
            )
        }
    }

    // --- Property 5: Relative percentages sum to 100% when no annual config ---

    /**
     * **Validates: Requirements 2.5, 3.5, 5.4, 6.4**
     *
     * Property 5: computePercentages without configuredHours returns percentages
     * that sum to approximately 100.0.
     */
    @Test
    fun `Property 5 - relative percentages sum to 100 percent when no annual config`() = runTest {
        // Generate maps with at least one positive value to avoid empty/zero-total edge case
        val totalsMapArb = Arb.bind(
            Arb.int(1, 5),
            Arb.int(1, 5000),
        ) { count, _ -> count }.map { count ->
            (1..count).associate { i -> "type-$i" to TypeTotals(totalMinutes = i * 30 + 10, eventCount = 1) }
        }

        checkAll(config, totalsMapArb) { totalsMap ->
            val percentages = computePercentages(totalsMap, configuredHours = null)

            // Non-empty map with positive values should produce percentages summing to ~100
            if (percentages.isNotEmpty()) {
                val sum = percentages.values.sum()
                assertTrue(
                    "Percentages should sum to approximately 100.0, but got $sum",
                    sum in 99.99..100.01,
                )
            }
        }
    }

    // --- Property 6: Bar chart ordering is descending by total hours ---

    /**
     * **Validates: Requirements 2.4, 3.4, 5.3, 6.3**
     *
     * Property 6: sortByTotalDescending result is in non-increasing order of totalMinutes.
     */
    @Test
    fun `Property 6 - bar chart ordering is descending by total hours`() = runTest {
        val aggregatesArb = Arb.list(
            Arb.bind(typeIdArb, Arb.int(0, 10000)) { typeId, minutes ->
                TypeAggregate(
                    typeId = typeId,
                    name = "Type $typeId",
                    icon = "📊",
                    backgroundColor = "#2563EB",
                    totalMinutes = minutes,
                    eventCount = 1,
                    percentage = 0.0,
                )
            },
            0..15,
        )

        checkAll(config, aggregatesArb) { aggregates ->
            val sorted = sortByTotalDescending(aggregates)

            // Verify non-increasing order
            for (i in 0 until sorted.size - 1) {
                assertTrue(
                    "Element at index $i (${sorted[i].totalMinutes}) should be >= element at index ${i + 1} (${sorted[i + 1].totalMinutes})",
                    sorted[i].totalMinutes >= sorted[i + 1].totalMinutes,
                )
            }

            // Verify same elements (no elements lost or added)
            assertEquals(
                "Sorted list should have same size as input",
                aggregates.size,
                sorted.size,
            )
        }
    }
}
