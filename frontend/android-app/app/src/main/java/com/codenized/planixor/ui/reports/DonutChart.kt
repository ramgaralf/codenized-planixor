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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.TextSecondary

/**
 * Donut chart for the Reports screen.
 * Displays hour distribution by shift type (Morning, Afternoon, Night).
 * Currently renders in empty state with a gray ring and "0h" center label.
 *
 * Uses Canvas-based drawing as Vico does not directly support donut/pie charts.
 */
@Composable
fun ReportsDonutChart(
    totalHours: String = "0h",
    modifier: Modifier = Modifier,
) {
    val ringColor = TextSecondary.copy(alpha = 0.2f)

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

            // Draw empty ring (no data state)
            drawArc(
                color = ringColor,
                startAngle = 0f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = androidx.compose.ui.geometry.Offset(
                    (size.width - diameter) / 2f,
                    (size.height - diameter) / 2f,
                ),
                size = androidx.compose.ui.geometry.Size(diameter, diameter),
                style = Stroke(
                    width = strokeWidth,
                    cap = StrokeCap.Round,
                ),
            )
        }

        // Center label showing total hours
        Text(
            text = totalHours,
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 28.sp,
            ),
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportsDonutChartPreview() {
    PlanixorTheme {
        ReportsDonutChart(totalHours = "0h")
    }
}
