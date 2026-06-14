package com.codenized.planixor.ui.reports

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.PrimaryBlue
import com.codenized.planixor.ui.theme.TextSecondary

/**
 * Bar chart for the Reports screen.
 * Displays hours worked per subdivision of the active time range.
 * Currently renders in empty state with brand colors (all bars at minimal height
 * to indicate bar positions).
 *
 * Uses Canvas-based drawing for reliable rendering without Vico API version concerns.
 * Will be replaced with Vico CartesianChartHost when real data is available.
 */
@Composable
fun ReportsBarChart(
    modifier: Modifier = Modifier,
) {
    val barColor = PrimaryBlue
    val axisColor = TextSecondary

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(200.dp)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        val barCount = 7
        val chartWidth = size.width
        val chartHeight = size.height
        val barSpacing = chartWidth / (barCount + 1)
        val maxBarWidth = barSpacing * 0.6f
        val minBarHeight = 4.dp.toPx()

        // Draw horizontal axis line
        drawLine(
            color = axisColor,
            start = Offset(0f, chartHeight - 24.dp.toPx()),
            end = Offset(chartWidth, chartHeight - 24.dp.toPx()),
            strokeWidth = 1.dp.toPx(),
        )

        // Draw empty bars (minimal height to show positions)
        for (i in 0 until barCount) {
            val x = barSpacing * (i + 0.5f)
            val barTop = chartHeight - 24.dp.toPx() - minBarHeight

            drawRect(
                color = barColor.copy(alpha = 0.3f),
                topLeft = Offset(x, barTop),
                size = Size(maxBarWidth, minBarHeight),
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportsBarChartPreview() {
    PlanixorTheme {
        ReportsBarChart()
    }
}
