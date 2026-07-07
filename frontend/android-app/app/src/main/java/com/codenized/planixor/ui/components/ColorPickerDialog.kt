package com.codenized.planixor.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Predefined palette: 9 families × 5 shades = 45 colors total.
 * Order: lightest to darkest within each family.
 */
val PREDEFINED_PALETTE = listOf(
    // Red
    "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#991B1B",
    // Orange
    "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#9A3412",
    // Amber
    "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#92400E",
    // Green
    "#6EE7B7", "#34D399", "#10B981", "#059669", "#065F46",
    // Teal
    "#67E8F9", "#22D3EE", "#0B86D4", "#0E7490", "#155E75",
    // Blue
    "#93C5FD", "#60A5FA", "#2563EB", "#1D4ED8", "#1E3A8A",
    // Purple
    "#C4B5FD", "#A78BFA", "#7C3AED", "#6D28D9", "#4C1D95",
    // Pink
    "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#9D174D",
    // Gray
    "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#1F2937",
)

private const val SHADES_PER_FAMILY = 5

/**
 * A reusable dialog that displays the Predefined_Palette as a 9×5 grid.
 * Theme-aware shade recommendations:
 *  - Light mode: indices 2–4 (medium to dark) recommended at full opacity
 *  - Dark mode: indices 0–2 (light to medium) recommended at full opacity
 *  - Non-recommended shades displayed at 50% opacity but remain selectable
 * The selected color shows a checkmark overlay.
 *
 * @param selectedColor The currently selected hex color (e.g. "#EF4444"), or empty if none.
 * @param onColorSelected Callback invoked with the selected hex color string.
 * @param onDismiss Callback invoked when the dialog is dismissed.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ColorPickerDialog(
    selectedColor: String,
    onColorSelected: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isDarkTheme = isSystemInDarkTheme()

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = modifier
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
        ) {
            // Title
            Text(
                text = stringResource(R.string.color_picker_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(modifier = Modifier.height(12.dp))

            // Color grid (9 families × 5 shades)
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PREDEFINED_PALETTE.forEachIndexed { index, hex ->
                    val shadeIndex = index % SHADES_PER_FAMILY
                    val isRecommended = if (isDarkTheme) {
                        shadeIndex in 0..2
                    } else {
                        shadeIndex in 2..4
                    }
                    val isSelected = hex == selectedColor
                    val color = parseHexColorSafe(hex)
                    val alpha = if (isRecommended) 1f else 0.5f

                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .alpha(alpha)
                            .background(color)
                            .border(
                                width = if (isSelected) 3.dp else 0.dp,
                                color = if (isSelected) MaterialTheme.colorScheme.onBackground
                                else Color.Transparent,
                                shape = CircleShape,
                            )
                            .clickable { onColorSelected(hex) },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (isSelected) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = if (shadeIndex >= 3) Color.White else Color.Black,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Hint text
            Text(
                text = stringResource(R.string.color_picker_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Dismiss button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onDismiss) {
                    Text(text = stringResource(R.string.color_picker_dismiss))
                }
            }
        }
    }
}

private fun parseHexColorSafe(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: IllegalArgumentException) {
        Color.Gray
    }
}

@Preview(showBackground = true)
@Composable
private fun ColorPickerDialogPreview() {
    PlanixorTheme {
        ColorPickerDialog(
            selectedColor = "#EF4444",
            onColorSelected = {},
            onDismiss = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ColorPickerDialogNoSelectionPreview() {
    PlanixorTheme {
        ColorPickerDialog(
            selectedColor = "",
            onColorSelected = {},
            onDismiss = {},
        )
    }
}
