package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip

import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Month view composable displaying a day grid (7 columns × 5-6 rows).
 * Current day is highlighted with a primary theme color circle.
 * Days from adjacent months are shown in secondary text color.
 * First day of week is locale-dependent.
 *
 * @param currentDate The anchor date within the month being displayed.
 * @param locale The locale used for first day of week and day name formatting.
 * @param modifier Optional modifier.
 */
@Composable
fun MonthView(
    currentDate: LocalDate,
    modifier: Modifier = Modifier,
    locale: Locale = Locale.getDefault(),
) {
    val yearMonth = YearMonth.from(currentDate)
    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val today = LocalDate.now()

    val daysOfWeek = buildDaysOfWeekList(firstDayOfWeek)
    val calendarDays = buildMonthCalendarDays(yearMonth, firstDayOfWeek)

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
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
                        MonthDayCell(
                            date = day,
                            isCurrentMonth = day.month == yearMonth.month,
                            isToday = day == today,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }


    }
}

/**
 * A single day cell in the month grid.
 */
@Composable
private fun MonthDayCell(
    date: LocalDate,
    isCurrentMonth: Boolean,
    isToday: Boolean,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .padding(4.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (isToday) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = date.dayOfMonth.toString(),
                    style = MaterialTheme.typography.bodySmall,
                    color = androidx.compose.ui.graphics.Color.White,
                    textAlign = TextAlign.Center,
                )
            }
        } else {
            Text(
                text = date.dayOfMonth.toString(),
                style = MaterialTheme.typography.bodySmall,
                color = if (isCurrentMonth) {
                    MaterialTheme.colorScheme.onSurface
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                textAlign = TextAlign.Center,
            )
        }
    }
}

/**
 * Builds an ordered list of DayOfWeek starting from the given first day.
 */
private fun buildDaysOfWeekList(firstDayOfWeek: DayOfWeek): List<DayOfWeek> {
    val days = DayOfWeek.entries.toMutableList()
    while (days.first() != firstDayOfWeek) {
        days.add(days.removeAt(0))
    }
    return days
}

/**
 * Builds the list of dates to display in the month grid,
 * including leading/trailing days from adjacent months to fill complete weeks.
 */
private fun buildMonthCalendarDays(
    yearMonth: YearMonth,
    firstDayOfWeek: DayOfWeek,
): List<LocalDate> {
    val firstOfMonth = yearMonth.atDay(1)
    val lastOfMonth = yearMonth.atEndOfMonth()

    // Calculate days to prepend from previous month
    val daysBefore = (firstOfMonth.dayOfWeek.value - firstDayOfWeek.value + 7) % 7
    val startDate = firstOfMonth.minusDays(daysBefore.toLong())

    // Fill complete weeks (5 or 6 rows)
    val totalDays = if (daysBefore + yearMonth.lengthOfMonth() > 35) 42 else 35
    return (0 until totalDays).map { startDate.plusDays(it.toLong()) }
}

@Preview(showBackground = true)
@Composable
private fun MonthViewPreview() {
    PlanixorTheme {
        MonthView(
            currentDate = LocalDate.of(2024, 6, 15),
        )
    }
}
