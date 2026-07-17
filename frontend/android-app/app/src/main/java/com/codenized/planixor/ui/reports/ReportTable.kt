package com.codenized.planixor.ui.reports

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenized.planixor.R
import com.codenized.planixor.domain.model.AnnualHoursConfig
import com.codenized.planixor.domain.model.TypeAggregate
import com.codenized.planixor.domain.util.formatDuration
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Report table displaying rows of event type data with totals.
 *
 * @param data List of TypeAggregate (pre-sorted by the caller based on mode).
 * @param totalMinutes Grand total minutes across all types.
 * @param annualConfig Optional annual config (only passed for shifts in year mode).
 * @param modifier Optional modifier.
 */
@Composable
fun ReportTable(
    data: List<TypeAggregate>,
    totalMinutes: Int,
    modifier: Modifier = Modifier,
    annualConfig: AnnualHoursConfig? = null,
) {
    if (data.isEmpty()) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
    ) {
        // Data rows
        data.forEach { aggregate ->
            ReportTableRow(
                icon = aggregate.icon,
                name = aggregate.name,
                count = aggregate.eventCount,
                duration = formatDuration(aggregate.totalMinutes),
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        HorizontalDivider(
            modifier = Modifier.padding(vertical = 8.dp),
            color = MaterialTheme.colorScheme.outlineVariant,
        )

        // Total row
        val totalEventCount = data.sumOf { it.eventCount }
        ReportTableSummaryRow(
            label = stringResource(R.string.reports_total_label),
            countText = totalEventCount.toString(),
            duration = formatDuration(totalMinutes),
        )

        // Annual config rows (shifts only, year mode)
        if (annualConfig != null) {
            Spacer(modifier = Modifier.height(4.dp))

            ReportTableSummaryRow(
                label = stringResource(R.string.reports_configured_hours_label),
                countText = "",
                duration = formatDuration(annualConfig.configuredHours * 60),
            )

            Spacer(modifier = Modifier.height(4.dp))

            val differenceMinutes = totalMinutes - (annualConfig.configuredHours * 60)
            val differenceColor = if (differenceMinutes >= 0) {
                Color(0xFF10B981) // green — surplus
            } else {
                Color(0xFFEF4444) // red — deficit
            }
            val absDifference = kotlin.math.abs(differenceMinutes)
            val sign = if (differenceMinutes >= 0) "+" else "-"

            ReportTableSummaryRow(
                label = stringResource(R.string.reports_difference_label),
                countText = "",
                duration = "$sign${formatDuration(absDifference)}",
                durationColor = differenceColor,
            )
        }
    }
}

@Composable
private fun ReportTableRow(
    icon: String,
    name: String,
    count: Int,
    duration: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = icon,
            fontSize = 18.sp,
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = name,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(32.dp),
            textAlign = TextAlign.End,
            maxLines = 1,
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = duration,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.width(88.dp),
            textAlign = TextAlign.End,
            maxLines = 1,
        )
    }
}

@Composable
private fun ReportTableSummaryRow(
    label: String,
    duration: String,
    modifier: Modifier = Modifier,
    countText: String = "",
    durationColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = countText,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(32.dp),
            textAlign = TextAlign.End,
            maxLines = 1,
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = duration,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
            color = durationColor,
            modifier = Modifier.width(88.dp),
            textAlign = TextAlign.End,
            maxLines = 1,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportTablePreview() {
    PlanixorTheme {
        ReportTable(
            data = listOf(
                TypeAggregate(
                    typeId = "1",
                    name = "Morning",
                    icon = "☀️",
                    backgroundColor = "#10B981",
                    totalMinutes = 480,
                    eventCount = 5,
                    percentage = 60.0,
                ),
                TypeAggregate(
                    typeId = "2",
                    name = "Night",
                    icon = "🌙",
                    backgroundColor = "#2563EB",
                    totalMinutes = 320,
                    eventCount = 3,
                    percentage = 40.0,
                ),
            ),
            totalMinutes = 800,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ReportTableWithAnnualConfigPreview() {
    PlanixorTheme {
        ReportTable(
            data = listOf(
                TypeAggregate(
                    typeId = "1",
                    name = "Morning",
                    icon = "☀️",
                    backgroundColor = "#10B981",
                    totalMinutes = 54000,
                    eventCount = 90,
                    percentage = 50.0,
                ),
                TypeAggregate(
                    typeId = "2",
                    name = "Night",
                    icon = "🌙",
                    backgroundColor = "#2563EB",
                    totalMinutes = 54000,
                    eventCount = 90,
                    percentage = 50.0,
                ),
            ),
            totalMinutes = 108000,
            annualConfig = AnnualHoursConfig(
                id = "cfg-1",
                year = 2025,
                configuredHours = 1800,
                modifiedAt = 0L,
                syncedAt = null,
                isDeleted = false,
            ),
        )
    }
}
