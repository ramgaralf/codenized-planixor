package com.codenized.planixor.ui.reports

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenized.planixor.domain.model.TypeAggregate
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Minimum sweep angle in degrees for a visible segment (1% of 360°).
 */
private const val MIN_ANGLE_DEGREES = 3.6f

/**
 * Donut chart for the Reports screen.
 * Renders per-segment arcs colored by each TypeAggregate's backgroundColor.
 * Displays center text (total hours or comparison format).
 *
 * Guards:
 * - Does not render if totalMinutes == 0 (avoids division by zero).
 * - Single type renders as a full 360° donut with no artifacts.
 * - Sub-1% segments get a minimum arc of 3.6° (1% of the circle).
 *
 * @param data List of TypeAggregate with percentage values.
 * @param totalMinutes The total minutes across all types. Chart does not render if 0.
 * @param centerText Text to display in the center (e.g., "8h 30m" or "150h / 1800h").
 * @param modifier Optional modifier.
 */
@Composable
fun ReportDonutChart(
    data: List<TypeAggregate>,
    totalMinutes: Int,
    centerText: String,
    modifier: Modifier = Modifier,
) {
    // Guard: do not render when totalMinutes is 0 (avoids division by zero)
    if (totalMinutes == 0 || data.isEmpty()) return

    val textColor = MaterialTheme.colorScheme.onSurface
    val borderColor = MaterialTheme.colorScheme.surface

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 48.dp, vertical = 16.dp)
            .aspectRatio(1f),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(
            modifier = Modifier.matchParentSize(),
        ) {
            val strokeWidth = 24.dp.toPx()
            val diameter = size.minDimension - strokeWidth
            val topLeft = Offset(
                (size.width - diameter) / 2f,
                (size.height - diameter) / 2f,
            )
            val arcSize = Size(diameter, diameter)

            // Single type: render as full donut (no artifacts)
            if (data.size == 1) {
                val segmentColor = parseHexColor(data.first().backgroundColor)
                drawArc(
                    color = segmentColor,
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Butt),
                )
                return@Canvas
            }

            // Multiple types: compute sweep angles with minimum arc enforcement
            val rawAngles = data.map { aggregate ->
                val pct = aggregate.totalMinutes.toDouble() / totalMinutes.toDouble()
                (pct * 360.0).toFloat()
            }

            // Apply minimum angle: sub-minimum segments get MIN_ANGLE_DEGREES
            val adjustedAngles = rawAngles.map { angle ->
                if (angle > 0f && angle < MIN_ANGLE_DEGREES) MIN_ANGLE_DEGREES else angle
            }

            // Normalize so total sums to 360°
            val totalAngle = adjustedAngles.sum()
            val normalizedAngles = if (totalAngle > 0f) {
                adjustedAngles.map { it * 360f / totalAngle }
            } else {
                adjustedAngles
            }

            // Draw segments starting from top (-90°)
            var startAngle = -90f
            val segmentGap = 1.dp.toPx()

            normalizedAngles.forEachIndexed { index, sweepAngle ->
                if (sweepAngle > 0f) {
                    val segmentColor = parseHexColor(data[index].backgroundColor)

                    drawArc(
                        color = segmentColor,
                        startAngle = startAngle,
                        sweepAngle = sweepAngle,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Butt),
                    )

                    // Draw thin border between segments for separation
                    if (data.size > 1) {
                        drawArc(
                            color = borderColor,
                            startAngle = startAngle + sweepAngle - 0.5f,
                            sweepAngle = 1f,
                            useCenter = false,
                            topLeft = topLeft,
                            size = arcSize,
                            style = Stroke(width = strokeWidth + segmentGap, cap = StrokeCap.Butt),
                        )
                    }
                }
                startAngle += sweepAngle
            }

            // Redraw segments on top to clean up border overlaps at start
            startAngle = -90f
            normalizedAngles.forEachIndexed { index, sweepAngle ->
                if (sweepAngle > 0f) {
                    val segmentColor = parseHexColor(data[index].backgroundColor)
                    drawArc(
                        color = segmentColor,
                        startAngle = startAngle + 0.5f,
                        sweepAngle = (sweepAngle - 1f).coerceAtLeast(0.5f),
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Butt),
                    )
                }
                startAngle += sweepAngle
            }
        }

        // Center text showing total hours or comparison
        Text(
            text = centerText,
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 24.sp,
            ),
            color = textColor,
            textAlign = TextAlign.Center,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportDonutChartMultiSegmentPreview() {
    PlanixorTheme {
        ReportDonutChart(
            data = listOf(
                TypeAggregate(
                    typeId = "1",
                    name = "Morning",
                    icon = "☀️",
                    backgroundColor = "#10B981",
                    totalMinutes = 480,
                    eventCount = 5,
                    percentage = 60.0,
                ),
                TypeAggregate(
                    typeId = "2",
                    name = "Afternoon",
                    icon = "🌤️",
                    backgroundColor = "#7C3AED",
                    totalMinutes = 240,
                    eventCount = 3,
                    percentage = 30.0,
                ),
                TypeAggregate(
                    typeId = "3",
                    name = "Night",
                    icon = "🌙",
                    backgroundColor = "#2563EB",
                    totalMinutes = 80,
                    eventCount = 1,
                    percentage = 10.0,
                ),
            ),
            totalMinutes = 800,
            centerText = "13h 20m",
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportDonutChartSingleTypePreview() {
    PlanixorTheme {
        ReportDonutChart(
            data = listOf(
                TypeAggregate(
                    typeId = "1",
                    name = "Morning",
                    icon = "☀️",
                    backgroundColor = "#10B981",
                    totalMinutes = 480,
                    eventCount = 5,
                    percentage = 100.0,
                ),
            ),
            totalMinutes = 480,
            centerText = "8h 0m",
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportDonutChartComparisonPreview() {
    PlanixorTheme {
        ReportDonutChart(
            data = listOf(
                TypeAggregate(
                    typeId = "1",
                    name = "Morning",
                    icon = "☀️",
                    backgroundColor = "#10B981",
                    totalMinutes = 54000,
                    eventCount = 90,
                    percentage = 50.0,
                ),
                TypeAggregate(
                    typeId = "2",
                    name = "Night",
                    icon = "🌙",
                    backgroundColor = "#2563EB",
                    totalMinutes = 54000,
                    eventCount = 90,
                    percentage = 50.0,
                ),
            ),
            totalMinutes = 108000,
            centerText = "1800h 0m /\n1800h 0m",
        )
    }
}
