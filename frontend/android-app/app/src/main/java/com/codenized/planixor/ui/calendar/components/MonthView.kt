package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLocale
import androidx.compose.ui.text.font.FontWeight
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

private const val MAX_VISIBLE_EMOJIS = 3
private const val MAX_WITH_OVERFLOW = 2

/**
 * Month view composable displaying a day grid as mini-cards with left color strip.
 *
 * Design:
 * - Each day cell is a mini-card with a subtle border and rounded corners (6dp).
 * - If the day has a shift event, a colored left strip (3.5dp) replaces the left border.
 * - Emojis are stacked vertically (one per line), max 3 visible. If >3 events, shows 2 emojis + "+N".
 * - Today is highlighted with a primary-colored circle on the day number.
 * - Days outside the current month have reduced opacity (0.35).
 * - Rows fill remaining height equally (no scroll).
 *
 * @param currentDate Anchor date within the month being displayed.
 * @param events Events for this month (already filtered).
 * @param onDayClick Callback when a day block is tapped.
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
    val locale = LocalLocale.current.platformLocale
    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val today = LocalDate.now()

    val daysOfWeek = buildDaysOfWeekList(firstDayOfWeek)
    val calendarDays = buildMonthCalendarDays(yearMonth, firstDayOfWeek)

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        // Day-of-week headers
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(3.dp),
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

        // Day grid — rows fill remaining height equally, with gap between cells
        calendarDays.chunked(7).forEachIndexed { rowIndex, week ->
            if (rowIndex > 0) {
                Spacer(modifier = Modifier.height(3.dp))
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                week.forEach { day ->
                    val dayStr = day.toString()
                    // Shift events: only shown on their startDay (even if multi-day)
                    // Reminder events: shown on all days they span (range intersection)
                    val dayEvents = events.filter { event ->
                        if (event.eventType == "shift") {
                            event.startDay == dayStr
                        } else {
                            event.startDay <= dayStr && event.endDay >= dayStr
                        }
                    }
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
    val borderColor = MaterialTheme.colorScheme.outlineVariant

    // Determine shift color for left strip
    val shiftEvent = events.find { it.eventType == "shift" }
    val hasShift = shiftEvent != null &&
        shiftEvent.backgroundColor.isNotBlank() &&
        shiftEvent.backgroundColor != "transparent"
    val shiftColor = if (hasShift) parseHexColorSafe(shiftEvent!!.backgroundColor) else Color.Transparent

    // Sort events: shifts first, then reminders by start time
    val sortedEvents = events.sortedWith(compareBy({ it.eventType != "shift" }, { it.startTime }))
    val totalCount = sortedEvents.size
    val showOverflow = totalCount > MAX_VISIBLE_EMOJIS
    val visibleCount = if (showOverflow) MAX_WITH_OVERFLOW else totalCount
    val emojisToShow = sortedEvents.take(visibleCount).map { it.icon }
    val hiddenCount = totalCount - visibleCount

    val cellShape = RoundedCornerShape(6.dp)
    val cellAlpha = if (isCurrentMonth) 1f else 0.35f

    Box(
        modifier = modifier
            .fillMaxSize()
            .alpha(cellAlpha)
            .clip(cellShape)
            .background(if (hasShift) shiftColor else Color.Transparent)
            .border(
                width = 1.dp,
                color = borderColor,
                shape = cellShape,
            )
            .clickable(onClick = onClick),
    ) {
        // Cell content
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxSize()
                .padding(2.dp),
        ) {
            // Day number
            if (isToday) {
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = date.dayOfMonth.toString(),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        textAlign = TextAlign.Center,
                    )
                }
            } else {
                Box(
                    modifier = Modifier.size(20.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = date.dayOfMonth.toString(),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Normal,
                        color = if (hasShift) Color.White else MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            // Emoji indicators — one per line, vertical stack
            if (emojisToShow.isNotEmpty()) {
                Spacer(modifier = Modifier.height(2.dp))

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(1.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    emojisToShow.forEach { emoji ->
                        Text(
                            text = emoji,
                            fontSize = 13.sp,
                        )
                    }
                    if (showOverflow) {
                        Text(
                            text = "+$hiddenCount",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (hasShift) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

// parseHexColorSafe is reused from EventCard.kt (internal visibility, same package)

private fun buildDaysOfWeekList(firstDayOfWeek: DayOfWeek): List<DayOfWeek> {
    val days = DayOfWeek.entries.toMutableList()
    while (days.first() != firstDayOfWeek) {
        days.add(days.removeAt(0))
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
