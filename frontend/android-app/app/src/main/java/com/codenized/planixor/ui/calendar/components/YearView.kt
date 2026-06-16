package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
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
import java.time.Month
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Year view composable displaying 12 mini-month calendars.
 * Shows colored circles for shifts and emoji indicators for reminders.
 * Tapping a day navigates to EventDetailPage for that day.
 *
 * @param currentDate Anchor date within the year being displayed.
 * @param events Events for this year (already filtered).
 * @param onDayClick Callback when a day is tapped.
 * @param modifier Optional modifier.
 */
@Composable
fun YearView(
    currentDate: LocalDate,
    events: List<CalendarEventDisplay>,
    onDayClick: (LocalDate) -> Unit,
    modifier: Modifier = Modifier,
) {
    val year = currentDate.year
    val today = LocalDate.now()
    val locale = Locale.getDefault()
    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val scrollState = rememberScrollState()

    // Group events by day for quick lookup
    val eventsByDay = events.groupBy { it.day }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        // 4 rows of 3 months
        Month.entries.chunked(3).forEach { monthRow ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                monthRow.forEach { month ->
                    MiniMonth(
                        yearMonth = YearMonth.of(year, month),
                        today = today,
                        firstDayOfWeek = firstDayOfWeek,
                        locale = locale,
                        eventsByDay = eventsByDay,
                        onDayClick = onDayClick,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun MiniMonth(
    yearMonth: YearMonth,
    today: LocalDate,
    firstDayOfWeek: DayOfWeek,
    locale: Locale,
    eventsByDay: Map<String, List<CalendarEventDisplay>>,
    onDayClick: (LocalDate) -> Unit,
    modifier: Modifier = Modifier,
) {
    val monthName = yearMonth.month.getDisplayName(TextStyle.SHORT, locale)
    val calendarDays = buildMiniMonthDays(yearMonth, firstDayOfWeek)

    Column(
        modifier = modifier.padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = monthName,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(bottom = 2.dp),
        )

        calendarDays.chunked(7).forEach { week ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                week.forEach { day ->
                    val dayEvents = if (day.month == yearMonth.month) {
                        eventsByDay[day.toString()] ?: emptyList()
                    } else {
                        emptyList()
                    }
                    MiniDayCell(
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
private fun MiniDayCell(
    date: LocalDate,
    isCurrentMonth: Boolean,
    isToday: Boolean,
    events: List<CalendarEventDisplay>,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shiftEvent = events.find { it.eventType == "shift" }
    val reminderEvents = events.filter { it.eventType == "reminder" }.sortedBy { it.startTime }
    val firstReminder = reminderEvents.firstOrNull()

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .padding(1.dp)
            .clickable(enabled = isCurrentMonth, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (!isCurrentMonth) return@Box

        // Shift indicator: colored circle behind the day number
        if (shiftEvent != null) {
            val shiftColor = parseHexColorSafe(shiftEvent.backgroundColor)
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(shiftColor.copy(alpha = 0.6f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = date.dayOfMonth.toString(),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = MaterialTheme.typography.labelSmall.fontSize * 0.7f,
                    ),
                    color = Color.White,
                    textAlign = TextAlign.Center,
                )
            }
        } else if (isToday) {
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = date.dayOfMonth.toString(),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = MaterialTheme.typography.labelSmall.fontSize * 0.7f,
                    ),
                    color = Color.White,
                    textAlign = TextAlign.Center,
                )
            }
        } else {
            Text(
                text = date.dayOfMonth.toString(),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = MaterialTheme.typography.labelSmall.fontSize * 0.7f,
                ),
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
        }

        // Reminder emoji indicator (upper-right corner)
        if (firstReminder != null) {
            Text(
                text = firstReminder.icon,
                fontSize = 6.sp,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(1.dp),
            )
        }
    }
}

private fun buildMiniMonthDays(
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
private fun YearViewPreview() {
    PlanixorTheme {
        YearView(
            currentDate = LocalDate.of(2024, 6, 15),
            events = emptyList(),
            onDayClick = {},
        )
    }
}
