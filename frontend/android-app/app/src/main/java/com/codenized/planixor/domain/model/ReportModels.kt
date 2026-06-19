package com.codenized.planixor.domain.model

/**
 * Represents a single segment in a donut chart for reports.
 *
 * @param typeId the event type identifier (shift or reminder ID)
 * @param percentage the percentage value for this segment (0.0–100.0+)
 */
data class DonutSegment(
    val typeId: String,
    val percentage: Double,
)

/**
 * Represents the aggregated data for a single event type in reports.
 *
 * @param typeId the event type identifier (shift or reminder ID)
 * @param name the display name of the event type
 * @param icon the emoji icon for the event type
 * @param backgroundColor the hex color for rendering
 * @param totalMinutes the total hours (in minutes) for this type
 * @param percentage the computed percentage for chart display
 */
data class TypeAggregate(
    val typeId: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val totalMinutes: Int,
    val percentage: Double,
)
