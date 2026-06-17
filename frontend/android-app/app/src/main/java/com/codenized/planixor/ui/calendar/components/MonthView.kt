package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Month view composable displaying a day grid with emoji indicators.
 * Shift events fill the entire day cell with their background color.
 * Day number header: transparent for normal days, primary circle for today.
 * Emojis are ~24sp (doubled from previous ~12sp). Padding between header and content.
 * Tapping a day navigates to Day view.
 *
 * @param currentDate Anchor date within the month being displayed.
 * @param events Events for this month (already filtered).
 * @param onDayClick Callback when a day block is tapped (navigates to Day view).
 * @param modifier Optional modifier.
 */
@Composable
fun MonthView(
    currentDate: LocalDate,
    events: List<CalendarEventDisplay>,
    onDayClick: (LocalDate) -> Unit,
    modifier: Modifier = Modifier,
) {
    val yearMonth = YearMonth.from(currentDate)
    val locale = Locale.getDefault()
    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val today = LocalDate.now()

    val daysOfWeek = buildDaysOfWeekList(firstDayOfWeek)
    val calendarDays = buildMonthCalendarDays(yearMonth, firstDayOfWeek)

    val eventsByDay = events.groupBy { it.day }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 8.dp),
    ) {
        // Day-of-week headers
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            daysOfWeek.forEach { dayOfWeek ->
                Text(
                    text = dayOfWeek.getDisplayName(TextStyle.SHORT, locale),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        // Day grid
        calendarDays.chunked(7).forEach { week ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                week.forEach { day ->
                    val dayEvents = eventsByDay[day.toString()] ?: emptyList()
                    MonthDayCell(
                        date = day,
                        isCurrentMonth = day.month == yearMonth.month,
                        isToday = day == today,
                        events = dayEvents,
                        onClick = { onDayClick(day) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun MonthDayCell(
    date: LocalDate,
    isCurrentMonth: Boolean,
    isToday: Boolean,
    events: List<CalendarEventDisplay>,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Shift background fills the entire cell
    val shiftEvent = events.find { it.eventType == "shift" }
    val cellBg = if (shiftEvent != null && shiftEvent.backgroundColor.isNotBlank() && shiftEvent.backgroundColor != "transparent") {
        parseHexColorSafe(shiftEvent.backgroundColor)
    } else {
        Color.Transparent
    }

    // Emojis: shifts first, then reminders, max 5
    val sortedEvents = events.sortedWith(compareBy({ it.eventType != "shift" }, { it.startTime }))
    val emojisToShow = sortedEvents.take(5).map { it.icon }
    val overflow = events.size - 5

    // Text color: white on colored background, normal otherwise
    val hasShiftBg = shiftEvent != null && shiftEvent.backgroundColor.isNotBlank() && shiftEvent.backgroundColor != "transparent"
    val textColor = if (hasShiftBg) Color.White else {
        if (isCurrentMonth) MaterialTheme.colorScheme.onSurface
        else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
    }

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .background(cellBg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(2.dp),
        ) {
            // Day number header
            if (isToday) {
                Box(
                    modifier = Modifier
                        .size(22.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = date.dayOfMonth.toString(),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontSize = 10.sp,
                    )
                }
            } else {
                // Transparent background for normal days
                Box(
                    modifier = Modifier.size(22.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = date.dayOfMonth.toString(),
                        style = MaterialTheme.typography.labelSmall,
                        color = textColor,
                        fontSize = 10.sp,
                    )
                }
            }

            // Padding between header and emoji content
            Spacer(modifier = Modifier.height(2.dp))

            // Emoji indicators — doubled size (~24sp from ~12sp)
            if (emojisToShow.isNotEmpty()) {
                Text(
                    text = emojisToShow.joinToString(""),
                    fontSize = 16.sp,
                    maxLines = 1,
                )
                if (overflow > 0) {
                    Text(
                        text = "+$overflow",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (hasShiftBg) Color.White.copy(alpha = 0.8f)
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 7.sp,
                    )
                }
            }
        }
    }
}

private fun buildDaysOfWeekList(firstDayOfWeek: DayOfWeek): List<DayOfWeek> {
    val days = DayOfWeek.entries.toMutableList()
    while (days.first() != firstDayOfWeek) {
        days.add(days.removeFirst())
    }
    return days
}

private fun buildMonthCalendarDays(
    yearMonth: YearMonth,
    firstDayOfWeek: DayOfWeek,
): List<LocalDate> {
    val firstOfMonth = yearMonth.atDay(1)
    val daysBefore = (firstOfMonth.dayOfWeek.value - firstDayOfWeek.value + 7) % 7
    val startDate = firstOfMonth.minusDays(daysBefore.toLong())
    val totalDays = if (daysBefore + yearMonth.lengthOfMonth() > 35) 42 else 35
    return (0 until totalDays).map { startDate.plusDays(it.toLong()) }
}

@Preview(showBackground = true)
@Composable
private fun MonthViewPreview() {
    PlanixorTheme {
        MonthView(
            currentDate = LocalDate.of(2024, 6, 15),
            events = emptyList(),
            onDayClick = {},
        )
    }
}
