package com.codenized.planixor.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.reports.ReportMode
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.PrimaryBlue
import java.time.Month
import java.time.Year
import java.time.format.TextStyle
import java.util.Locale

/**
 * Navigation bar for the Reports screen with left/right arrows, a center label, and a Today button.
 *
 * - Month mode: displays localized month-year (e.g., "Junio 2025")
 * - Year mode: displays year label (e.g., "2025")
 * - Navigation range: currentYear-10 to currentYear+10
 * - Today button: right-aligned, small outlined text button with primary-blue text
 *
 * @param mode The current report mode (MONTH or YEAR).
 * @param selectedMonth The currently selected month (0-indexed, 0=January).
 * @param selectedYear The currently selected year.
 * @param onPrevious Callback when the user navigates to the previous period.
 * @param onNext Callback when the user navigates to the next period.
 * @param onToday Callback when the user clicks the Today button.
 * @param modifier Optional modifier.
 */
@Composable
fun DateNavigator(
    mode: ReportMode,
    selectedMonth: Int,
    selectedYear: Int,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onToday: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val currentYear = Year.now().value
    val minYear = currentYear - 10
    val maxYear = currentYear + 10

    val canNavigatePrevious = when (mode) {
        ReportMode.MONTH -> {
            selectedYear > minYear || (selectedYear == minYear && selectedMonth > 0)
        }
        ReportMode.YEAR -> selectedYear > minYear
    }

    val canNavigateNext = when (mode) {
        ReportMode.MONTH -> {
            selectedYear < maxYear || (selectedYear == maxYear && selectedMonth < 11)
        }
        ReportMode.YEAR -> selectedYear < maxYear
    }

    val label = when (mode) {
        ReportMode.MONTH -> {
            val locale = Locale.getDefault()
            val monthName = Month.of(selectedMonth + 1)
                .getDisplayName(TextStyle.FULL, locale)
                .replaceFirstChar { it.titlecase(locale) }
            "$monthName $selectedYear"
        }
        ReportMode.YEAR -> selectedYear.toString()
    }

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        IconButton(
            onClick = onPrevious,
            enabled = canNavigatePrevious,
            modifier = Modifier.size(40.dp),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = stringResource(R.string.reports_navigate_previous),
                tint = if (canNavigatePrevious) {
                    MaterialTheme.colorScheme.onSurface
                } else {
                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
                },
            )
        }

        Text(
            text = label,
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.SemiBold,
            ),
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
        )

        IconButton(
            onClick = onNext,
            enabled = canNavigateNext,
            modifier = Modifier.size(40.dp),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = stringResource(R.string.reports_navigate_next),
                tint = if (canNavigateNext) {
                    MaterialTheme.colorScheme.onSurface
                } else {
                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
                },
            )
        }

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

@Preview(showBackground = true)
@Composable
private fun DateNavigatorMonthPreview() {
    PlanixorTheme {
        DateNavigator(
            mode = ReportMode.MONTH,
            selectedMonth = 5,
            selectedYear = 2025,
            onPrevious = {},
            onNext = {},
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
            onPrevious = {},
            onNext = {},
            onToday = {},
        )
    }
}
