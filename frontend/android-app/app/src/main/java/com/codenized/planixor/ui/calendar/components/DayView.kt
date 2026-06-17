package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.ui.theme.PlanixorTheme
import kotlinx.coroutines.delay
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Day view composable with vertical 24-hour timeline.
 * Displays events positioned by their start time.
 * Shows a current time indicator (blue line + circle) when viewing today.
 * Auto-scrolls to center current hour on open.
 *
 * @param currentDate The date being displayed.
 * @param events Events for this day (already filtered).
 * @param onEventClick Callback when an event card is tapped.
 * @param modifier Optional modifier.
 */
@Composable
fun DayView(
    currentDate: LocalDate,
    events: List<CalendarEventDisplay>,
    onEventClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val hours = (0..23).toList()
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm", Locale.getDefault())
    val isToday = currentDate == LocalDate.now()
    val listState = rememberLazyListState()

    // Track current minute for the indicator (updates every 60 seconds)
    var currentMinute by remember { mutableIntStateOf(LocalTime.now().minute) }
    var currentHour by remember { mutableIntStateOf(LocalTime.now().hour) }

    if (isToday) {
        LaunchedEffect(Unit) {
            listState.animateScrollToItem(
                index = currentHour,
                scrollOffset = -200,
            )
        }

        LaunchedEffect(Unit) {
            while (true) {
                delay(60_000L)
                currentMinute = LocalTime.now().minute
                currentHour = LocalTime.now().hour
            }
        }
    }

    // Range intersection: show events where startDay <= currentDay <= endDay
    val currentDayStr = currentDate.toString()
    val dayEvents = events.filter { it.startDay <= currentDayStr && it.endDay >= currentDayStr }

    /**
     * Returns the effective start hour for an event on the current day.
     * On the start day, uses the event's startTime. On intermediate/end days, uses hour 0.
     */
    fun getEffectiveStartHour(event: CalendarEventDisplay): Int {
        val isMultiDay = event.startDay != event.endDay
        if (!isMultiDay) return event.startTime / 60
        val isStartDay = event.startDay == currentDayStr
        return if (isStartDay) event.startTime / 60 else 0
    }

    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
        ) {
            items(hours) { hour ->
                Box {
                    HourSlot(
                        hour = hour,
                        timeFormatter = timeFormatter,
                        events = dayEvents.filter { getEffectiveStartHour(it) == hour },
                        onEventClick = onEventClick,
                    )

                    if (isToday && hour == currentHour) {
                        CurrentTimeIndicator(minuteFraction = currentMinute / 60f)
                    }
                }
            }
        }
    }
}

@Composable
private fun CurrentTimeIndicator(
    minuteFraction: Float,
    modifier: Modifier = Modifier,
) {
    val indicatorColor = MaterialTheme.colorScheme.primary

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(60.dp)
            .padding(start = 56.dp),
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
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

@Composable
private fun HourSlot(
    hour: Int,
    timeFormatter: DateTimeFormatter,
    events: List<CalendarEventDisplay>,
    onEventClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val timeLabel = LocalTime.of(hour, 0).format(timeFormatter)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .let { if (events.isEmpty()) it.height(60.dp) else it },
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

        Column(
            modifier = Modifier
                .weight(1f)
                .let { if (events.isEmpty()) it.height(60.dp) else it },
        ) {
            HorizontalDivider(
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
            )

            events.forEach { event ->
                EventCard(
                    event = event,
                    onClick = { onEventClick(event.id) },
                    showNotes = true,
                    modifier = Modifier.padding(vertical = 2.dp, horizontal = 4.dp),
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun DayViewPreview() {
    PlanixorTheme {
        DayView(
            currentDate = LocalDate.of(2024, 6, 15),
            events = emptyList(),
            onEventClick = {},
        )
    }
}
