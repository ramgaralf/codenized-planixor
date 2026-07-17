package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLocale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.ui.theme.PlanixorTheme
import kotlinx.coroutines.delay
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

private val HOUR_HEIGHT = 60.dp
private val TIME_LABEL_WIDTH = 56.dp
private const val TOTAL_HOURS = 24

/**
 * Day view composable with vertical 24-hour timeline.
 * Events are positioned absolutely over the timeline based on their start/end times,
 * spanning the full duration visually (like the React Web version).
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
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm", LocalLocale.current.platformLocale)
    val isToday = currentDate == LocalDate.now()
    val scrollState = rememberScrollState()

    var currentMinute by remember { mutableIntStateOf(LocalTime.now().minute) }
    var currentHour by remember { mutableIntStateOf(LocalTime.now().hour) }

    if (isToday) {
        LaunchedEffect(Unit) {
            while (true) {
                delay(60_000L)
                currentMinute = LocalTime.now().minute
                currentHour = LocalTime.now().hour
            }
        }
    }

    // Auto-scroll to current hour on open
    val density = LocalDensity.current
    LaunchedEffect(isToday) {
        if (isToday) {
            val targetPx = with(density) { (currentHour * HOUR_HEIGHT.toPx() - 200.dp.toPx()).coerceAtLeast(0f) }
            scrollState.animateScrollTo(targetPx.toInt())
        }
    }

    // Range intersection: show events where startDay <= currentDay <= endDay
    val currentDayStr = currentDate.toString()
    val dayEvents = events.filter { it.startDay <= currentDayStr && it.endDay >= currentDayStr }

    val totalHeight = HOUR_HEIGHT * TOTAL_HOURS

    Box(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState),
    ) {
        // Full timeline container
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(totalHeight),
        ) {
            // Hour grid lines and labels
            repeat(TOTAL_HOURS) { hour ->
                val topOffset = HOUR_HEIGHT * hour
                val timeLabel = LocalTime.of(hour, 0).format(timeFormatter)

                // Time label
                Text(
                    text = timeLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.End,
                    modifier = Modifier
                        .offset(y = topOffset)
                        .padding(end = 8.dp, top = 2.dp)
                        .height(HOUR_HEIGHT)
                        .fillMaxWidth(0f) // don't take space
                        .padding(end = 8.dp),
                )

                // Hour line
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                    modifier = Modifier
                        .offset(x = TIME_LABEL_WIDTH, y = topOffset)
                        .fillMaxWidth(),
                )
            }

            // Time labels column (drawn as overlay)
            repeat(TOTAL_HOURS) { hour ->
                val topOffset = HOUR_HEIGHT * hour
                val timeLabel = LocalTime.of(hour, 0).format(timeFormatter)

                Text(
                    text = timeLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.End,
                    modifier = Modifier
                        .offset(y = topOffset + 2.dp)
                        .padding(start = 4.dp, end = 8.dp)
                )
            }

            // Events positioned absolutely with column layout for overlaps
            BoxWithConstraints(
                modifier = Modifier
                    .offset(x = TIME_LABEL_WIDTH)
                    .fillMaxWidth()
                    .height(totalHeight),
            ) {
                val eventsAreaWidth = maxWidth - TIME_LABEL_WIDTH
                val positioned = computeEventColumns(dayEvents, currentDayStr)

                positioned.forEach { pos ->
                    val topOffset: Dp = HOUR_HEIGHT * pos.effectiveStart / 60
                    val eventHeight: Dp = HOUR_HEIGHT * pos.durationMinutes / 60
                    val columnWidth = eventsAreaWidth / pos.totalColumns
                    val leftOffset = columnWidth * pos.column

                    Box(
                        modifier = Modifier
                            .offset(x = leftOffset, y = topOffset)
                            .width(columnWidth - 2.dp)
                            .height(eventHeight)
                            .padding(1.dp),
                    ) {
                        EventCard(
                            event = pos.event,
                            onClick = { onEventClick(pos.event.id) },
                            showNotes = true,
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                }
            }

            // Current time indicator
            if (isToday) {
                val minuteOfDay = currentHour * 60 + currentMinute
                val indicatorY: Dp = HOUR_HEIGHT * minuteOfDay / 60
                val indicatorColor = MaterialTheme.colorScheme.primary

                Canvas(
                    modifier = Modifier
                        .offset(x = TIME_LABEL_WIDTH, y = indicatorY)
                        .fillMaxWidth()
                        .height(2.dp),
                ) {
                    val circleRadius = 4.dp.toPx()
                    drawCircle(
                        color = indicatorColor,
                        radius = circleRadius,
                        center = Offset(circleRadius, size.height / 2),
                    )
                    drawLine(
                        color = indicatorColor,
                        start = Offset(0f, size.height / 2),
                        end = Offset(size.width, size.height / 2),
                        strokeWidth = 2.dp.toPx(),
                    )
                }
            }
        }
    }
}

/**
 * Positioned event with its column assignment for side-by-side rendering.
 */
private data class PositionedEvent(
    val event: CalendarEventDisplay,
    val effectiveStart: Int,
    val durationMinutes: Int,
    val column: Int,
    val totalColumns: Int,
)

/**
 * Computes column layout for overlapping events (greedy algorithm).
 * Overlapping events are placed side-by-side in parallel columns.
 */
private fun computeEventColumns(
    events: List<CalendarEventDisplay>,
    currentDayStr: String,
): List<PositionedEvent> {
    if (events.isEmpty()) return emptyList()

    data class EventWithTimes(
        val event: CalendarEventDisplay,
        val start: Int,
        val end: Int,
    )

    val withTimes = events.map { event ->
        EventWithTimes(
            event = event,
            start = getEffectiveStartMinutes(event, currentDayStr),
            end = getEffectiveEndMinutes(event, currentDayStr),
        )
    }.filter { it.end > it.start }
        .sortedWith(compareBy({ it.start }, { it.end }))

    if (withTimes.isEmpty()) return emptyList()

    // Greedy column assignment
    val columns = mutableListOf<MutableList<EventWithTimes>>()
    val columnAssignment = mutableMapOf<String, Int>()

    for (item in withTimes) {
        var placed = false
        for ((colIdx, col) in columns.withIndex()) {
            val lastInCol = col.last()
            if (lastInCol.end <= item.start) {
                col.add(item)
                columnAssignment[item.event.id] = colIdx
                placed = true
                break
            }
        }
        if (!placed) {
            columns.add(mutableListOf(item))
            columnAssignment[item.event.id] = columns.size - 1
        }
    }

    // Determine totalColumns for each event's overlap group
    return withTimes.map { item ->
        val overlapping = withTimes.filter { other ->
            other.start < item.end && other.end > item.start
        }
        val maxCol = overlapping.maxOf { columnAssignment[it.event.id] ?: 0 }

        PositionedEvent(
            event = item.event,
            effectiveStart = item.start,
            durationMinutes = (item.end - item.start).coerceAtLeast(30),
            column = columnAssignment[item.event.id] ?: 0,
            totalColumns = maxCol + 1,
        )
    }
}

/**
 * Returns the effective start time in minutes for an event on the given day.
 */
private fun getEffectiveStartMinutes(event: CalendarEventDisplay, currentDayStr: String): Int {
    if (event.startDay == event.endDay) return event.startTime
    return if (event.startDay == currentDayStr) event.startTime else 0
}

/**
 * Returns the effective end time in minutes for an event on the given day.
 */
private fun getEffectiveEndMinutes(event: CalendarEventDisplay, currentDayStr: String): Int {
    if (event.startDay == event.endDay) return event.endTime
    // If the event ends at 00:00 on this day, it doesn't occupy any time here
    if (event.endDay == currentDayStr && event.endTime == 0) return 0
    return if (event.endDay == currentDayStr) event.endTime else 1439
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
