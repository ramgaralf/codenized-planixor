package com.codenized.planixor.domain.util

import com.codenized.planixor.domain.model.CalendarEvent
import com.codenized.planixor.domain.model.DonutSegment
import com.codenized.planixor.domain.model.TypeAggregate

/**
 * Pure utility functions for report aggregation logic.
 * These functions have no Android dependencies and mirror the web aggregation engine.
 */

/**
 * Converts total minutes to a display string in the format "{X}h {Y}m".
 *
 * @param totalMinutes non-negative integer representing total minutes
 * @return formatted string, e.g. "2h 30m", "0h 45m", "1h 0m"
 */
fun formatDuration(totalMinutes: Int): String {
    val clamped = normalizeTotalMinutes(totalMinutes)
    val hours = clamped / 60
    val minutes = clamped % 60
    return "${hours}h ${minutes}m"
}

/**
 * Produces a comparison string showing actual hours vs configured hours.
 * Used in donut chart center text when Year mode + Annual_Hours_Config exists (shifts only).
 *
 * @param actualMinutes total actual minutes worked
 * @param configuredHours the configured annual working hours (whole hours)
 * @return formatted string, e.g. "150h / 1800h"
 */
fun formatHoursComparison(actualMinutes: Int, configuredHours: Int): String {
    val actualHours = actualMinutes / 60
    return "${actualHours}h / ${configuredHours}h"
}

/**
 * Clamps a value to 0 if it is less than or equal to 0.
 * Used to normalize negative or zero totalMinutes before formatting/aggregation.
 *
 * @param value the raw minutes value
 * @return 0 if value <= 0, otherwise the original value
 */
fun normalizeTotalMinutes(value: Int): Int {
    return if (value <= 0) 0 else value
}

/**
 * Filters calendar events to include only those within a date range that are not deleted.
 *
 * Inclusion criteria:
 * - event.isDeleted == false
 * - event.startDay >= startDate
 * - event.startDay <= endDate
 *
 * Note: event.endDay does NOT affect inclusion.
 *
 * @param events the full list of calendar events
 * @param startDate the inclusive start date (ISO format, e.g. "2025-01-01")
 * @param endDate the inclusive end date (ISO format, e.g. "2025-01-31")
 * @return filtered list of events within the period
 */
fun filterEventsForPeriod(
    events: List<CalendarEvent>,
    startDate: String,
    endDate: String,
): List<CalendarEvent> {
    return events.filter { event ->
        !event.isDeleted &&
            event.startDay >= startDate &&
            event.startDay <= endDate
    }
}

/**
 * Groups events by eventTypeId and sums their totalHours (in minutes).
 *
 * @param events the filtered list of calendar events
 * @return map of eventTypeId to total minutes for that type
 */
fun aggregateByType(events: List<CalendarEvent>): Map<String, Int> {
    return events.groupBy { it.eventTypeId }
        .mapValues { (_, typeEvents) -> typeEvents.sumOf { it.totalHours } }
}

/**
 * Computes percentage distribution for each event type.
 *
 * Without configuredHours: each type's percentage = (typeMinutes / grandTotal) * 100
 * With configuredHours: each type's percentage = (typeMinutes / (configuredHours * 60)) * 100
 *
 * @param totalsMap map of typeId to total minutes
 * @param configuredHours optional annual configured hours (null means relative to grand total)
 * @return map of typeId to percentage value
 */
fun computePercentages(
    totalsMap: Map<String, Int>,
    configuredHours: Int? = null,
): Map<String, Double> {
    if (totalsMap.isEmpty()) return emptyMap()

    val denominator = if (configuredHours != null) {
        configuredHours.toDouble() * 60.0
    } else {
        totalsMap.values.sum().toDouble()
    }

    if (denominator == 0.0) return totalsMap.mapValues { 0.0 }

    return totalsMap.mapValues { (_, minutes) ->
        (minutes.toDouble() / denominator) * 100.0
    }
}

/**
 * Computes donut chart segments from percentage values, applying:
 * - 1% minimum arc: if a percentage is > 0 but < 1, it is set to 1.0
 * - Single type rule: if only one type exists, it is set to exactly 100.0
 *
 * @param percentages map of typeId to percentage
 * @return list of DonutSegment with adjusted percentages
 */
fun computeDonutSegments(percentages: Map<String, Double>): List<DonutSegment> {
    if (percentages.isEmpty()) return emptyList()

    if (percentages.size == 1) {
        val entry = percentages.entries.first()
        return listOf(DonutSegment(typeId = entry.key, percentage = 100.0))
    }

    return percentages.map { (typeId, pct) ->
        val adjustedPct = if (pct > 0.0 && pct < 1.0) 1.0 else pct
        DonutSegment(typeId = typeId, percentage = adjustedPct)
    }
}

/**
 * Sorts a list of TypeAggregate in descending order by totalMinutes.
 *
 * @param aggregates the list of type aggregates to sort
 * @return sorted list (highest totalMinutes first)
 */
fun sortByTotalDescending(aggregates: List<TypeAggregate>): List<TypeAggregate> {
    return aggregates.sortedByDescending { it.totalMinutes }
}
