package com.codenized.planixor.ui.components

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
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalLocale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenized.planixor.R
import com.codenized.planixor.ui.reports.ReportMode
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.PrimaryBlue
import java.time.Month
import java.time.format.TextStyle

/**
 * Navigation bar for the Reports screen with separate month and year navigators.
 *
 * - Month mode: < MonthName > < Year > [Hoy] (month and year navigated independently)
 * - Year mode: < Year > [Hoy]
 * - Navigation range: currentYear-10 to currentYear+10
 * - Today button: right-aligned, small outlined text button with primary-blue text
 *
 * @param mode The current report mode (MONTH or YEAR).
 * @param selectedMonth The currently selected month (0-indexed, 0=January).
 * @param selectedYear The currently selected year.
 * @param onPreviousMonth Callback when the user navigates to the previous month.
 * @param onNextMonth Callback when the user navigates to the next month.
 * @param onPreviousYear Callback when the user navigates to the previous year.
 * @param onNextYear Callback when the user navigates to the next year.
 * @param onToday Callback when the user clicks the Today button.
 * @param modifier Optional modifier.
 */
@Composable
fun DateNavigator(
    mode: ReportMode,
    selectedMonth: Int,
    selectedYear: Int,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onPreviousYear: () -> Unit,
    onNextYear: () -> Unit,
    onToday: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (mode) {
        ReportMode.MONTH -> MonthReportsNavigator(
            selectedMonth = selectedMonth,
            selectedYear = selectedYear,
            onPreviousMonth = onPreviousMonth,
            onNextMonth = onNextMonth,
            onPreviousYear = onPreviousYear,
            onNextYear = onNextYear,
            onToday = onToday,
            modifier = modifier,
        )
        ReportMode.YEAR -> YearReportsNavigator(
            selectedYear = selectedYear,
            onPreviousYear = onPreviousYear,
            onNextYear = onNextYear,
            onToday = onToday,
            modifier = modifier,
        )
    }
}

/**
 * Reports month mode: < MonthName > < Year > [Hoy]
 * Month and year are navigated independently via separate nav segments.
 */
@Composable
private fun MonthReportsNavigator(
    selectedMonth: Int,
    selectedYear: Int,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onPreviousYear: () -> Unit,
    onNextYear: () -> Unit,
    onToday: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val locale = LocalLocale.current.platformLocale
    val monthName = Month.of(selectedMonth + 1)
        .getDisplayName(TextStyle.FULL, locale)
        .replaceFirstChar { it.titlecase(locale) }
    val year = selectedYear.toString()

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        ReportsNavSegment(
            label = monthName,
            onPrevious = onPreviousMonth,
            onNext = onNextMonth,
            prevDescription = stringResource(R.string.reports_navigate_previous),
            nextDescription = stringResource(R.string.reports_navigate_next),
            labelWidth = 90.dp,
        )

        ReportsNavSegment(
            label = year,
            onPrevious = onPreviousYear,
            onNext = onNextYear,
            prevDescription = stringResource(R.string.content_description_previous_year),
            nextDescription = stringResource(R.string.content_description_next_year),
        )

        Spacer(modifier = Modifier.weight(1f))

        OutlinedButton(
            onClick = onToday,
            modifier = Modifier.height(32.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = PrimaryBlue,
            ),
        ) {
            Text(
                text = stringResource(R.string.calendar_today),
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                ),
            )
        }
    }
}

/**
 * Reports year mode: < Year > [Hoy]
 */
@Composable
private fun YearReportsNavigator(
    selectedYear: Int,
    onPreviousYear: () -> Unit,
    onNextYear: () -> Unit,
    onToday: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val year = selectedYear.toString()

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        ReportsNavSegment(
            label = year,
            onPrevious = onPreviousYear,
            onNext = onNextYear,
            prevDescription = stringResource(R.string.content_description_previous_year),
            nextDescription = stringResource(R.string.content_description_next_year),
        )

        Spacer(modifier = Modifier.weight(1f))

        OutlinedButton(
            onClick = onToday,
            modifier = Modifier.height(32.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = PrimaryBlue,
            ),
        ) {
            Text(
                text = stringResource(R.string.calendar_today),
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                ),
            )
        }
    }
}

/**
 * A nav segment with prev/next chevron buttons and a centered label.
 */
@Composable
private fun ReportsNavSegment(
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
            textAlign = TextAlign.Center,
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

@Preview(showBackground = true)
@Composable
private fun DateNavigatorMonthPreview() {
    PlanixorTheme {
        DateNavigator(
            mode = ReportMode.MONTH,
            selectedMonth = 5,
            selectedYear = 2025,
            onPreviousMonth = {},
            onNextMonth = {},
            onPreviousYear = {},
            onNextYear = {},
            onToday = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun DateNavigatorYearPreview() {
    PlanixorTheme {
        DateNavigator(
            mode = ReportMode.YEAR,
            selectedMonth = 0,
            selectedYear = 2025,
            onPreviousMonth = {},
            onNextMonth = {},
            onPreviousYear = {},
            onNextYear = {},
            onToday = {},
        )
    }
}
