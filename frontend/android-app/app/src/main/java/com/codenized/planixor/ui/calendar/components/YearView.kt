package com.codenized.planixor.ui.calendar.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import java.time.Month
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Year view composable displaying 12 mini-month calendars.
 * Day indicators use:
 * - Fill color = shift color (transparent if no shift)
 * - Border around circle = has reminder
 * - No separate "today" dot — today's font is slightly larger (13sp vs 11sp)
 * - No border for days without reminders
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
    val locale = LocalLocale.current.platformLocale
    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val scrollState = rememberScrollState()

    // Auto-scroll to current month row, centered on screen
    val density = androidx.compose.ui.platform.LocalDensity.current
    androidx.compose.runtime.LaunchedEffect(year) {
        if (year == today.year) {
            val currentMonthIndex = today.monthValue - 1 // 0-based
            val rowIndex = currentMonthIndex / 2 // 2 months per row
            val rowHeightPx = with(density) { 200.dp.toPx() } // approximate row height
            val halfScreenPx = with(density) { 300.dp.toPx() } // approximate half screen
            val targetScroll = ((rowIndex * rowHeightPx) - halfScreenPx).coerceAtLeast(0f).toInt()
            scrollState.animateScrollTo(targetScroll)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        // 6 rows of 2 months
        Month.entries.chunked(2).forEach { monthRow ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                monthRow.forEach { month ->
                    val monthYm = YearMonth.of(year, month)
                    val monthStartStr = monthYm.atDay(1).toString()
                    val monthEndStr = monthYm.atEndOfMonth().toString()
                    // Range intersection: event visible if startDay <= monthEnd AND endDay >= monthStart
                    val monthEvents = events.filter { it.startDay <= monthEndStr && it.endDay >= monthStartStr }
                    MiniMonth(
                        yearMonth = monthYm,
                        today = today,
                        firstDayOfWeek = firstDayOfWeek,
                        locale = locale,
                        events = monthEvents,
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
    events: List<CalendarEventDisplay>,
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
                        val dayStr = day.toString()
                        // Shift events: only shown on their startDay (even if multi-day)
                        // Reminder events: shown on all days they span (range intersection)
                        events.filter { event ->
                            if (event.eventType == "shift") {
                                event.startDay == dayStr
                            } else {
                                event.startDay <= dayStr && event.endDay >= dayStr
                            }
                        }
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

/**
 * Mini day cell for year view.
 * - Fill: shift background color (transparent if no shift)
 * - Border: primary color if has reminder, none otherwise
 * - Today: slightly larger font (13sp vs 11sp), bold
 * - No separate today dot indicator
 */
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
    val hasReminder = events.any { it.eventType == "reminder" }

    val hasShift = shiftEvent != null && shiftEvent.backgroundColor.isNotBlank() && shiftEvent.backgroundColor != "transparent"
    val fillColor = if (hasShift) parseHexColorSafe(shiftEvent!!.backgroundColor) else Color.Transparent
    val textColor = if (hasShift) Color.White else MaterialTheme.colorScheme.onSurface

    val fontSize = if (isToday) 14.sp else 12.sp
    val fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .padding(1.dp)
            .clickable(enabled = isCurrentMonth, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (!isCurrentMonth) return@Box

        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(fillColor)
                .then(
                    if (hasReminder) Modifier.border(
                        width = 3.dp,
                        color = MaterialTheme.colorScheme.onSurface,
                        shape = CircleShape,
                    ) else Modifier,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = date.dayOfMonth.toString(),
                fontSize = fontSize,
                fontWeight = fontWeight,
                color = textColor,
                textAlign = TextAlign.Center,
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
