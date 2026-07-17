package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLocale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenized.planixor.R
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.LocalDate
import java.time.format.TextStyle
import java.time.temporal.WeekFields

/**
 * Per-view date navigator composable.
 * Each view mode has its own segment layout with individual prev/next controls:
 * - Day: DayName < DayNumber > < MonthName > < Year > [Hoy]
 * - Week: Semana < WeekNumber > < Year > [Hoy]
 * - Month: < MonthName > < Year > [Hoy]
 * - Year: < Year > [Hoy]
 *
 * @param currentDate The currently displayed date.
 * @param activeView The active calendar view.
 * @param onNavigateDay Navigate by ±N days.
 * @param onNavigateWeek Navigate by ±N weeks.
 * @param onNavigateMonth Navigate by ±N months.
 * @param onNavigateYear Navigate by ±N years.
 * @param onTodayClick Callback for the Today button.
 * @param modifier Optional modifier.
 */
@Composable
fun DateNavigator(
    currentDate: LocalDate,
    activeView: CalendarView,
    onNavigateDay: (Int) -> Unit,
    onNavigateWeek: (Int) -> Unit,
    onNavigateMonth: (Int) -> Unit,
    onNavigateYear: (Int) -> Unit,
    onTodayClick: () -> Unit,
    modifier: Modifier = Modifier,
    showTodayButton: Boolean = true,
) {
    when (activeView) {
        CalendarView.Day -> DayDateNavigator(
            currentDate = currentDate,
            onNavigateDay = onNavigateDay,
            onNavigateMonth = onNavigateMonth,
            onNavigateYear = onNavigateYear,
            onTodayClick = onTodayClick,
            showTodayButton = showTodayButton,
            modifier = modifier,
        )
        CalendarView.Week -> WeekDateNavigator(
            currentDate = currentDate,
            onNavigateWeek = onNavigateWeek,
            onNavigateYear = onNavigateYear,
            onTodayClick = onTodayClick,
            showTodayButton = showTodayButton,
            modifier = modifier,
        )
        CalendarView.Month -> MonthDateNavigator(
            currentDate = currentDate,
            onNavigateMonth = onNavigateMonth,
            onNavigateYear = onNavigateYear,
            onTodayClick = onTodayClick,
            showTodayButton = showTodayButton,
            modifier = modifier,
        )
        CalendarView.Year -> YearDateNavigator(
            currentDate = currentDate,
            onNavigateYear = onNavigateYear,
            onTodayClick = onTodayClick,
            showTodayButton = showTodayButton,
            modifier = modifier,
        )
    }
}

/**
 * Day: DayName < DayNumber > < MonthName > < Year > [Hoy]
 */
@Composable
private fun DayDateNavigator(
    currentDate: LocalDate,
    onNavigateDay: (Int) -> Unit,
    onNavigateMonth: (Int) -> Unit,
    onNavigateYear: (Int) -> Unit,
    onTodayClick: () -> Unit,
    modifier: Modifier = Modifier,
    showTodayButton: Boolean = true,
) {
    val locale = LocalLocale.current.platformLocale
    val dayName = currentDate.dayOfWeek.getDisplayName(TextStyle.SHORT, locale)
        .replaceFirstChar { it.titlecase(locale) }
    val dayNumber = currentDate.dayOfMonth.toString()
    val monthName = currentDate.month.getDisplayName(TextStyle.SHORT, locale)
        .replaceFirstChar { it.titlecase(locale) }
    val year = currentDate.year.toString()

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        // Day name (no controls)
        SegmentLabel(text = dayName)

        // Day number with controls
        NavSegment(
            label = dayNumber,
            onPrevious = { onNavigateDay(-1) },
            onNext = { onNavigateDay(1) },
            prevDescription = stringResource(R.string.content_description_previous_day),
            nextDescription = stringResource(R.string.content_description_next_day),
        )

        // Month name with controls
        NavSegment(
            label = monthName,
            onPrevious = { onNavigateMonth(-1) },
            onNext = { onNavigateMonth(1) },
            prevDescription = stringResource(R.string.content_description_previous_month),
            nextDescription = stringResource(R.string.content_description_next_month),
        )

        // Year with controls
        NavSegment(
            label = year,
            onPrevious = { onNavigateYear(-1) },
            onNext = { onNavigateYear(1) },
            prevDescription = stringResource(R.string.content_description_previous_year),
            nextDescription = stringResource(R.string.content_description_next_year),
        )

        if (showTodayButton) {
            Spacer(modifier = Modifier.weight(1f))
            TodayButton(onClick = onTodayClick)
        }
    }
}

/**
 * Week: Semana < WeekNumber > < Year > [Hoy]
 */
@Composable
private fun WeekDateNavigator(
    currentDate: LocalDate,
    onNavigateWeek: (Int) -> Unit,
    onNavigateYear: (Int) -> Unit,
    onTodayClick: () -> Unit,
    modifier: Modifier = Modifier,
    showTodayButton: Boolean = true,
) {
    val locale = LocalLocale.current.platformLocale
    val weekFields = WeekFields.of(locale)
    val weekNumber = currentDate.get(weekFields.weekOfWeekBasedYear()).toString()
    val year = currentDate.year.toString()
    val weekLabel = stringResource(R.string.calendar_week_label)

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        SegmentLabel(text = weekLabel)

        NavSegment(
            label = weekNumber,
            onPrevious = { onNavigateWeek(-1) },
            onNext = { onNavigateWeek(1) },
            prevDescription = stringResource(R.string.content_description_previous_week),
            nextDescription = stringResource(R.string.content_description_next_week),
        )

        NavSegment(
            label = year,
            onPrevious = { onNavigateYear(-1) },
            onNext = { onNavigateYear(1) },
            prevDescription = stringResource(R.string.content_description_previous_year),
            nextDescription = stringResource(R.string.content_description_next_year),
        )

        if (showTodayButton) {
            Spacer(modifier = Modifier.weight(1f))
            TodayButton(onClick = onTodayClick)
        }
    }
}

/**
 * Month: < MonthName > < Year > [Hoy]
 */
@Composable
private fun MonthDateNavigator(
    currentDate: LocalDate,
    onNavigateMonth: (Int) -> Unit,
    onNavigateYear: (Int) -> Unit,
    onTodayClick: () -> Unit,
    modifier: Modifier = Modifier,
    showTodayButton: Boolean = true,
) {
    val locale = LocalLocale.current.platformLocale
    val monthName = currentDate.month.getDisplayName(TextStyle.FULL, locale)
        .replaceFirstChar { it.titlecase(locale) }
    val year = currentDate.year.toString()

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        NavSegment(
            label = monthName,
            onPrevious = { onNavigateMonth(-1) },
            onNext = { onNavigateMonth(1) },
            prevDescription = stringResource(R.string.content_description_previous_month),
            nextDescription = stringResource(R.string.content_description_next_month),
        )

        NavSegment(
            label = year,
            onPrevious = { onNavigateYear(-1) },
            onNext = { onNavigateYear(1) },
            prevDescription = stringResource(R.string.content_description_previous_year),
            nextDescription = stringResource(R.string.content_description_next_year),
        )

        if (showTodayButton) {
            Spacer(modifier = Modifier.weight(1f))
            TodayButton(onClick = onTodayClick)
        }
    }
}

/**
 * Year: < Year > [Hoy]
 */
@Composable
private fun YearDateNavigator(
    currentDate: LocalDate,
    onNavigateYear: (Int) -> Unit,
    onTodayClick: () -> Unit,
    modifier: Modifier = Modifier,
    showTodayButton: Boolean = true,
) {
    val year = currentDate.year.toString()

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        NavSegment(
            label = year,
            onPrevious = { onNavigateYear(-1) },
            onNext = { onNavigateYear(1) },
            prevDescription = stringResource(R.string.content_description_previous_year),
            nextDescription = stringResource(R.string.content_description_next_year),
        )

        if (showTodayButton) {
            Spacer(modifier = Modifier.weight(1f))
            TodayButton(onClick = onTodayClick)
        }
    }
}

/**
 * A label segment without navigation controls — fixed width for stability.
 */
@Composable
private fun SegmentLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleSmall.copy(
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
        ),
        color = MaterialTheme.colorScheme.onSurface,
        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        modifier = Modifier.width(40.dp),
    )
}

/**
 * A segment with prev/next chevron buttons and a centered label with fixed width.
 */
@Composable
private fun NavSegment(
    label: String,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    prevDescription: String,
    nextDescription: String,
    labelWidth: androidx.compose.ui.unit.Dp = 44.dp,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(
            onClick = onPrevious,
            modifier = Modifier.size(28.dp),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = prevDescription,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Text(
            text = label,
            style = MaterialTheme.typography.titleSmall.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
            ),
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.width(labelWidth),
        )

        IconButton(
            onClick = onNext,
            modifier = Modifier.size(28.dp),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = nextDescription,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/**
 * Today button — filled primary style to distinguish from navigation controls.
 */
@Composable
private fun TodayButton(onClick: () -> Unit) {
    Button(
        onClick = onClick,
        contentPadding = ButtonDefaults.ContentPadding,
        modifier = Modifier.height(32.dp),
    ) {
        Text(
            text = stringResource(R.string.calendar_today),
            style = MaterialTheme.typography.labelMedium.copy(
                fontWeight = FontWeight.SemiBold,
            ),
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun DayDateNavigatorPreview() {
    PlanixorTheme {
        DateNavigator(
            currentDate = LocalDate.of(2024, 6, 15),
            activeView = CalendarView.Day,
            onNavigateDay = {},
            onNavigateWeek = {},
            onNavigateMonth = {},
            onNavigateYear = {},
            onTodayClick = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun WeekDateNavigatorPreview() {
    PlanixorTheme {
        DateNavigator(
            currentDate = LocalDate.of(2024, 6, 15),
            activeView = CalendarView.Week,
            onNavigateDay = {},
            onNavigateWeek = {},
            onNavigateMonth = {},
            onNavigateYear = {},
            onTodayClick = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun MonthDateNavigatorPreview() {
    PlanixorTheme {
        DateNavigator(
            currentDate = LocalDate.of(2024, 6, 15),
            activeView = CalendarView.Month,
            onNavigateDay = {},
            onNavigateWeek = {},
            onNavigateMonth = {},
            onNavigateYear = {},
            onTodayClick = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun YearDateNavigatorPreview() {
    PlanixorTheme {
        DateNavigator(
            currentDate = LocalDate.of(2024, 6, 15),
            activeView = CalendarView.Year,
            onNavigateDay = {},
            onNavigateWeek = {},
            onNavigateMonth = {},
            onNavigateYear = {},
            onTodayClick = {},
        )
    }
}

