package com.codenized.planixor.ui.reports

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenized.planixor.domain.model.TypeAggregate
import com.codenized.planixor.domain.util.formatDuration
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Horizontal bar chart for the Reports screen.
 * Displays one horizontal bar per event type, ordered descending by total hours (highest first).
 * Each row shows: emoji icon | colored bar (proportional width) | duration label.
 *
 * @param data List of TypeAggregate, already sorted descending by totalMinutes.
 * @param modifier Optional modifier.
 */
@Composable
fun HorizontalBarChart(
    data: List<TypeAggregate>,
    modifier: Modifier = Modifier,
) {
    if (data.isEmpty()) return

    val maxMinutes = data.maxOf { it.totalMinutes }.coerceAtLeast(1)
    val labelColor = MaterialTheme.colorScheme.onSurface
    val barHeight = 28.dp
    val rowSpacing = 12.dp

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
    ) {
        data.forEach { aggregate ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(barHeight),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Emoji icon as y-axis label
                Text(
                    text = aggregate.icon,
                    fontSize = 20.sp,
                    modifier = Modifier.width(32.dp),
                )

                Spacer(modifier = Modifier.width(8.dp))

                // Horizontal bar with proportional width
                val barFraction = if (maxMinutes > 0) {
                    aggregate.totalMinutes.toFloat() / maxMinutes.toFloat()
                } else {
                    0f
                }

                val barColor = parseHexColor(aggregate.backgroundColor)

                Canvas(
                    modifier = Modifier
                        .weight(1f)
                        .height(barHeight),
                ) {
                    val barWidth = size.width * barFraction.coerceIn(0f, 1f)
                    val barHeightPx = size.height * 0.6f
                    val yOffset = (size.height - barHeightPx) / 2f

                    drawRoundRect(
                        color = barColor,
                        topLeft = Offset(0f, yOffset),
                        size = Size(barWidth.coerceAtLeast(4.dp.toPx()), barHeightPx),
                        cornerRadius = CornerRadius(4.dp.toPx()),
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Duration label beside bar
                Text(
                    text = formatDuration(aggregate.totalMinutes),
                    style = MaterialTheme.typography.bodySmall,
                    color = labelColor,
                    fontSize = 12.sp,
                )
            }

            Spacer(modifier = Modifier.height(rowSpacing))
        }
    }
}

/**
 * Parses a hex color string (e.g., "#2563EB") to a Compose Color.
 * Falls back to gray if parsing fails.
 */
internal fun parseHexColor(hex: String): Color {
    return try {
        val colorStr = hex.removePrefix("#")
        val colorLong = colorStr.toLong(16)
        when (colorStr.length) {
            6 -> Color(0xFF000000 or colorLong)
            8 -> Color(colorLong)
            else -> Color(0xFF6B7280)
        }
    } catch (_: Exception) {
        Color(0xFF6B7280)
    }
}

@Preview(showBackground = true)
@Composable
private fun HorizontalBarChartPreview() {
    PlanixorTheme {
        HorizontalBarChart(
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
        )
    }
}
