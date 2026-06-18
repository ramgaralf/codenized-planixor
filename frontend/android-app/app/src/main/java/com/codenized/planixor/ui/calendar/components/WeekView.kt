package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

/**
 * Week view composable displaying 7 day sections (Monday–Sunday).
 * Each day shows a header, a vertical timeline with hour marks,
 * and event cards positioned next to their start time.
 *
 * @param currentDate The anchor date for the week being displayed.
 * @param events Events for this week (already filtered by date range).
 * @param onEventClick Callback when an event card is tapped.
 * @param modifier Optional modifier.
 */
@Composable
fun WeekView(
    currentDate: LocalDate,
    events: List<CalendarEventDisplay>,
    onEventClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val weekStart = currentDate.with(DayOfWeek.MONDAY)
    val weekDays = (0L..6L).map { weekStart.plusDays(it) }
    val today = LocalDate.now()
    val locale = Locale.getDefault()

    LazyColumn(
        modifier = modifier.fillMaxSize(),
    ) {
        items(weekDays) { day ->
            val dayStr = day.toString()
            val dayEvents = events
                .filter { event ->
                    if (event.eventType == "shift") {
                        event.startDay == dayStr
                    } else {
                        event.startDay <= dayStr && event.endDay >= dayStr
                    }
                }
                .sortedBy { it.startTime }
            val isToday = day == today

            WeekDaySection(
                date = day,
                isToday = isToday,
                events = dayEvents,
                onEventClick = onEventClick,
                locale = locale,
            )

            HorizontalDivider(
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                thickness = 1.dp,
            )
        }
    }
}

@Composable
private fun WeekDaySection(
    date: LocalDate,
    isToday: Boolean,
    events: List<CalendarEventDisplay>,
    onEventClick: (String) -> Unit,
    locale: Locale,
    modifier: Modifier = Modifier,
) {
    val dayName = date.dayOfWeek.getDisplayName(TextStyle.FULL, locale)
        .replaceFirstChar { it.titlecase(locale) }
    val dayNumber = date.dayOfMonth.toString()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
    ) {
        // Day header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(horizontal = 12.dp),
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .then(
                        if (isToday) Modifier.background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                        else Modifier,
                    )
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            ) {
                Text(
                    text = "$dayName $dayNumber",
                    style = MaterialTheme.typography.titleSmall,
                    color = if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Events with vertical timeline
        if (events.isEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
        } else {
            events.forEach { event ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 12.dp, end = 12.dp, top = 2.dp, bottom = 2.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    // Time label on the left
                    Text(
                        text = formatMinutesToTime(event.startTime),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp,
                        modifier = Modifier
                            .width(40.dp)
                            .padding(top = 6.dp),
                    )

                    // Vertical timeline line
                    VerticalDivider(
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                        thickness = 2.dp,
                        modifier = Modifier
                            .height(56.dp)
                            .padding(horizontal = 4.dp),
                    )

                    // Event card
                    EventCard(
                        event = event,
                        onClick = { onEventClick(event.id) },
                        showNotes = true,
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 4.dp),
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun WeekViewPreview() {
    PlanixorTheme {
        WeekView(
            currentDate = LocalDate.of(2024, 6, 15),
            events = emptyList(),
            onEventClick = {},
        )
    }
}
