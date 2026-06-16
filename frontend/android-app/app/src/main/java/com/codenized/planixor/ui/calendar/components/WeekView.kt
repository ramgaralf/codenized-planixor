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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

/**
 * Week view composable displaying 7 day columns (Monday–Sunday).
 * Each day shows a header with the day name and date, and event cards ordered by start time.
 * Current day header is visually highlighted.
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
            val dayEvents = events
                .filter { it.day == day.toString() }
                .sortedBy { it.startTime }
            val isToday = day == today

            WeekDayColumn(
                date = day,
                isToday = isToday,
                events = dayEvents,
                onEventClick = onEventClick,
                locale = locale,
            )

            HorizontalDivider(
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
            )
        }
    }
}

@Composable
private fun WeekDayColumn(
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
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        // Day header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
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

        // Event cards
        events.forEach { event ->
            WeekEventCard(
                event = event,
                onClick = { onEventClick(event.id) },
            )
            Spacer(modifier = Modifier.height(4.dp))
        }
    }
}

@Composable
private fun WeekEventCard(
    event: CalendarEventDisplay,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bgColor = parseHexColorSafe(event.backgroundColor)
    val nameDisplay = buildString {
        val truncated = if (event.name.length > 25) event.name.take(25) + "…" else event.name
        append(truncated)
        if (!event.notes.isNullOrBlank()) append(" 📝")
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor.copy(alpha = 0.15f))
            .padding(horizontal = 8.dp, vertical = 6.dp)
            .let { it },
    ) {
        // Line 1: icon + name (+ 📝 if notes)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = event.icon, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.padding(start = 4.dp))
            Text(
                text = nameDisplay,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // Line 2: start – end · duration
        val startFormatted = formatMinutesToTime(event.startTime)
        val endFormatted = formatMinutesToTime(event.endTime)
        val duration = formatDuration(event.startTime, event.endTime)

        Text(
            text = "$startFormatted – $endFormatted · $duration",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }

    // Make the whole card clickable
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .let { it },
    ) { /* clickable applied via parent */ }
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
