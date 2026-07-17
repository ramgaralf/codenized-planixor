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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
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
import java.time.Month
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Year view composable displaying 12 mini-month grids in a 3 columns × 4 rows layout.
 * Current day is highlighted with the primary theme color.
 * First day of week is locale-dependent.
 *
 * @param currentDate The anchor date within the year being displayed.
 * @param locale The locale used for first day of week and month name formatting.
 * @param modifier Optional modifier.
 */
@Composable
fun YearView(
    currentDate: LocalDate,
    modifier: Modifier = Modifier,
    locale: Locale = Locale.getDefault(),
) {
    val year = currentDate.year
    val today = LocalDate.now()
    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val scrollState = rememberScrollState()

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 8.dp, vertical = 4.dp),
        ) {
            // 4 rows of 3 months each
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
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }


    }
}

/**
 * A compact mini-month widget with the month name and a small day grid.
 */
@Composable
private fun MiniMonth(
    yearMonth: YearMonth,
    today: LocalDate,
    firstDayOfWeek: DayOfWeek,
    locale: Locale,
    modifier: Modifier = Modifier,
) {
    val monthName = yearMonth.month.getDisplayName(TextStyle.SHORT, locale)
    val calendarDays = buildMiniMonthDays(yearMonth, firstDayOfWeek)

    Column(
        modifier = modifier.padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Month name header
        Text(
            text = monthName,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(bottom = 2.dp),
        )

        // Compact day grid
        calendarDays.chunked(7).forEach { week ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                week.forEach { day ->
                    MiniDayCell(
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

/**
 * A tiny day cell for the mini-month grid in year view.
 */
@Composable
private fun MiniDayCell(
    date: LocalDate,
    isCurrentMonth: Boolean,
    isToday: Boolean,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .padding(1.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (isToday) {
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
                    color = androidx.compose.ui.graphics.Color.White,
                    textAlign = TextAlign.Center,
                )
            }
        } else if (isCurrentMonth) {
            Text(
                text = date.dayOfMonth.toString(),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = MaterialTheme.typography.labelSmall.fontSize * 0.7f,
                ),
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
        }
        // Days from adjacent months are not shown in mini-month (too compact)
    }
}

/**
 * Builds the list of dates for a mini-month grid, including
 * leading/trailing days to fill complete weeks.
 */
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
        )
    }
}
