package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Week view composable displaying a 7-column grid with day headers and hourly rows.
 * Shows an empty state message when no events are present.
 *
 * @param currentDate The anchor date for the week being displayed.
 * @param locale The locale used for formatting and determining first day of week.
 * @param modifier Optional modifier.
 */
@Composable
fun WeekView(
    currentDate: LocalDate,
    modifier: Modifier = Modifier,
    locale: Locale = Locale.getDefault(),
) {
    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val weekStart = currentDate.with(firstDayOfWeek)
        .let { start ->
            if (start.isAfter(currentDate)) start.minusWeeks(1) else start
        }
    val weekDays = (0L..6L).map { weekStart.plusDays(it) }
    val hours = (0..23).toList()
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm", locale)
    val horizontalScrollState = rememberScrollState()

    Box(modifier = modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Day headers row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 56.dp),
            ) {
                weekDays.forEach { day ->
                    DayHeader(
                        date = day,
                        locale = locale,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))

            // Hourly grid (scrollable)
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .horizontalScroll(horizontalScrollState),
            ) {
                items(hours) { hour ->
                    WeekHourRow(
                        hour = hour,
                        timeFormatter = timeFormatter,
                        dayCount = 7,
                    )
                }
            }
        }


    }
}

/**
 * Day column header showing abbreviated day name and date number.
 */
@Composable
private fun DayHeader(
    date: LocalDate,
    locale: Locale,
    modifier: Modifier = Modifier,
) {
    val dayName = date.dayOfWeek.getDisplayName(TextStyle.SHORT, locale)
    val dayNumber = date.dayOfMonth.toString()

    Column(
        modifier = modifier.padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = dayName,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = dayNumber,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

/**
 * A single hour row spanning all 7 day columns in the week grid.
 */
@Composable
private fun WeekHourRow(
    hour: Int,
    timeFormatter: DateTimeFormatter,
    dayCount: Int,
    modifier: Modifier = Modifier,
) {
    val timeLabel = LocalTime.of(hour, 0).format(timeFormatter)

    Row(
        modifier = modifier.height(60.dp),
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

        repeat(dayCount) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(60.dp),
            ) {
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                )
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
        )
    }
}
