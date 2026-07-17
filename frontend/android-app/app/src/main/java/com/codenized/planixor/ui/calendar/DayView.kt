package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Day view composable displaying a vertical 24-hour timeline with hour labels.
 * Shows a current time indicator line when viewing today.
 * Auto-scrolls to the current hour when viewing today.
 *
 * @param currentDate The date being displayed.
 * @param locale The locale used for time formatting.
 * @param modifier Optional modifier.
 */
@Composable
fun DayView(
    currentDate: LocalDate,
    modifier: Modifier = Modifier,
    locale: Locale = Locale.getDefault(),
) {
    val hours = (0..23).toList()
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm", locale)
    val isToday = currentDate == LocalDate.now()
    val currentHour = LocalTime.now().hour
    val listState = rememberLazyListState()

    if (isToday) {
        LaunchedEffect(Unit) {
            listState.animateScrollToItem(
                index = currentHour,
                scrollOffset = -200,
            )
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
        ) {
            items(hours) { hour ->
                Box {
                    HourRow(
                        hour = hour,
                        timeFormatter = timeFormatter,
                    )

                    if (isToday && hour == currentHour) {
                        CurrentTimeIndicator()
                    }
                }
            }
        }
    }
}

/**
 * Current time indicator: a horizontal line with a circle at the left end,
 * positioned proportionally within the current hour slot.
 */
@Composable
private fun CurrentTimeIndicator(
    modifier: Modifier = Modifier,
) {
    val minuteFraction = LocalTime.now().minute / 60f
    val indicatorColor = MaterialTheme.colorScheme.primary

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(60.dp)
            .padding(start = 56.dp),
    ) {
        Canvas(
            modifier = Modifier.fillMaxSize(),
        ) {
            val yPosition = size.height * minuteFraction
            val circleRadius = 3.dp.toPx()

            drawCircle(
                color = indicatorColor,
                radius = circleRadius,
                center = Offset(circleRadius, yPosition),
            )

            drawLine(
                color = indicatorColor,
                start = Offset(0f, yPosition),
                end = Offset(size.width, yPosition),
                strokeWidth = 2.dp.toPx(),
            )
        }
    }
}

/**
 * A single hour row in the day timeline.
 */
@Composable
private fun HourRow(
    hour: Int,
    timeFormatter: DateTimeFormatter,
    modifier: Modifier = Modifier,
) {
    val timeLabel = LocalTime.of(hour, 0).format(timeFormatter)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(60.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            text = timeLabel,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.End,
            modifier = Modifier
                .width(56.dp)
                .padding(end = 8.dp, top = 4.dp),
        )

        Box(
            modifier = Modifier
                .weight(1f)
                .height(60.dp),
        ) {
            HorizontalDivider(
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun DayViewPreview() {
    PlanixorTheme {
        DayView(
            currentDate = LocalDate.of(2024, 6, 15),
        )
    }
}
