package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Day view composable displaying a vertical 24-hour timeline with hour labels.
 * Shows an empty state message when no events are present.
 *
 * @param currentDate The date being displayed.
 * @param locale The locale used for time formatting.
 * @param modifier Optional modifier.
 */
@Composable
fun DayView(
    currentDate: LocalDate,
    locale: Locale = Locale.getDefault(),
    modifier: Modifier = Modifier,
) {
    val hours = (0..23).toList()
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm", locale)

    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
        ) {
            items(hours) { hour ->
                HourRow(
                    hour = hour,
                    timeFormatter = timeFormatter,
                )
            }
        }


    }
}

/**
 * A single hour row in the day timeline.
 */
@Composable
private fun HourRow(
    hour: Int,
    timeFormatter: DateTimeFormatter,
    modifier: Modifier = Modifier,
) {
    val timeLabel = LocalTime.of(hour, 0).format(timeFormatter)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(60.dp),
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

@Preview(showBackground = true)
@Composable
private fun DayViewPreview() {
    PlanixorTheme {
        DayView(
            currentDate = LocalDate.of(2024, 6, 15),
        )
    }
}
