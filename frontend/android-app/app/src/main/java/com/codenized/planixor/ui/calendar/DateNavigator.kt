package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import com.codenized.planixor.R
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.PrimaryBlue
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Navigation row with prev/next arrows, a formatted date label, and a Today button.
 * Date format varies per active view:
 * - Day: "EEEE, d MMMM yyyy"
 * - Week: "Semana W, yyyy" (week number)
 * - Month: "MMMM yyyy"
 * - Year: "yyyy"
 *
 * @param currentDate The currently displayed date.
 * @param activeView The active calendar view (determines date formatting).
 * @param onNavigateBackward Callback for the previous arrow button.
 * @param onNavigateForward Callback for the next arrow button.
 * @param onTodayClick Callback for the Today button.
 * @param modifier Optional modifier.
 */
@Composable
fun DateNavigator(
    currentDate: LocalDate,
    activeView: CalendarView,
    onNavigateBackward: () -> Unit,
    onNavigateForward: () -> Unit,
    onTodayClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val locale = Locale.getDefault()
    val weekLabel = stringResource(R.string.calendar_week_label)
    val dateLabel = formatDateLabel(currentDate, activeView, locale, weekLabel)

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        IconButton(onClick = onNavigateBackward) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = stringResource(R.string.content_description_previous),
            )
        }

        Text(
            text = dateLabel,
            style = MaterialTheme.typography.titleSmall,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(1f),
        )

        IconButton(onClick = onNavigateForward) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = stringResource(R.string.content_description_next),
            )
        }

        TextButton(onClick = onTodayClick) {
            Text(
                text = stringResource(R.string.calendar_today),
                color = PrimaryBlue,
            )
        }
    }
}

/**
 * Formats the date label based on the active view and locale.
 */
private fun formatDateLabel(
    date: LocalDate,
    view: CalendarView,
    locale: Locale,
    weekLabel: String,
): String = when (view) {
    CalendarView.Day -> {
        val formatter = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", locale)
        date.format(formatter).replaceFirstChar { it.titlecase(locale) }
    }
    CalendarView.Week -> {
        val weekFields = WeekFields.of(locale)
        val weekNumber = date.get(weekFields.weekOfWeekBasedYear())
        val year = date.year
        String.format(locale, "%s %d, %d", weekLabel, weekNumber, year)
    }
    CalendarView.Month -> {
        val formatter = DateTimeFormatter.ofPattern("MMMM yyyy", locale)
        date.format(formatter).replaceFirstChar { it.titlecase(locale) }
    }
    CalendarView.Year -> {
        date.year.toString()
    }
}

@Preview(showBackground = true)
@Composable
private fun DateNavigatorPreview() {
    PlanixorTheme {
        DateNavigator(
            currentDate = LocalDate.of(2024, 6, 15),
            activeView = CalendarView.Day,
            onNavigateBackward = {},
            onNavigateForward = {},
            onTodayClick = {},
        )
    }
}
