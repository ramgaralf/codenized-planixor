package com.codenized.planixor.ui.shifts

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.ui.components.ColorPickerDialog
import com.codenized.planixor.ui.theme.PlanixorTheme

private val EMOJI_CATEGORIES = mapOf(
    "😀" to listOf("😀", "😃", "😄", "😁", "😆", "🥹", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😋", "😛", "🤪", "😜", "🤑", "🤗", "🤭", "🤫", "🤔", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "😎", "🥳", "😤", "😡", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹"),
    "👋" to listOf("👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪", "🦶", "🦵", "👂", "👃", "🧠", "👀", "👁️", "👅", "👄"),
    "🌞" to listOf("☀️", "🌙", "🌞", "🌝", "🌛", "🌜", "⭐", "🌟", "✨", "💫", "🌈", "☁️", "⛅", "🌤️", "🌥️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "🌊", "💧", "💦", "☔", "🔥", "🌺", "🌸", "🌷", "🌹", "🌻", "🌼", "🌿", "🍀", "🍁", "🍂", "🌴", "🌵", "🌳", "🌲", "🪵", "🍄", "🐚", "🪨", "🌍", "🌎"),
    "🐶" to listOf("🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟"),
    "🍎" to listOf("🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🍞", "🥖", "🥨", "🧀", "🍕", "🍔", "🍟", "☕"),
    "⚽" to listOf("⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤸", "🏃", "🧘", "🎯"),
    "🚗" to listOf("🚗", "🚕", "🚌", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🛵", "🏍️", "🚲", "🛴", "✈️", "🚀", "🛸", "🚁", "⛵", "🚢", "🛳️", "🏠", "🏢", "🏭", "🏥", "🏪", "🏫", "🏰", "⛪", "🕌", "🗼", "🌉", "🎡", "🎢", "🎠", "⛲", "🗺️", "🧭"),
    "💡" to listOf("💡", "🔦", "🕯️", "💰", "💳", "💎", "⚖️", "🔧", "🔨", "⛏️", "🛠️", "🔩", "⚙️", "🔑", "🗝️", "🔒", "📱", "💻", "🖥️", "🖨️", "📷", "📹", "🎥", "📞", "☎️", "📺", "📻", "⏰", "🔔", "📚", "📝", "✏️", "📋", "📌", "📎", "🗂️", "📁", "💼", "🎒", "🛒"),
    "❤️" to listOf("❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "✅", "❌", "⚠️", "♻️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🏆", "🥇", "🥈", "🥉", "🏅", "🎉", "🎊", "🎈"),
)

private val EMOJI_CATEGORY_LABELS = listOf("😀", "👋", "🌞", "🐶", "🍎", "⚽", "🚗", "💡", "❤️")

/**
 * Shift form screen composable that supports create and edit modes.
 * Observes ShiftFormViewModel state and renders form fields with per-field validation errors.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShiftFormScreen(
    onNavigateBack: () -> Unit,
    viewModel: ShiftFormViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    if (uiState.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator()
        }
    } else {
        ShiftFormContent(
            uiState = uiState,
            onFieldChange = viewModel::onFieldChange,
            onSubmit = { viewModel.onSubmit(onNavigateBack) },
            onCancel = onNavigateBack,
        )
    }
}

@Composable
internal fun ShiftFormContent(
    uiState: ShiftFormUiState,
    onFieldChange: (String, String) -> Unit,
    onSubmit: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Name field
        NameField(
            value = uiState.name,
            error = uiState.errors["name"],
            onValueChange = { onFieldChange("name", it) },
        )

        // Icon field
        IconField(
            value = uiState.icon,
            error = uiState.errors["icon"],
            onValueChange = { onFieldChange("icon", it) },
        )

        // Background color field
        ColorField(
            value = uiState.backgroundColor,
            error = uiState.errors["backgroundColor"],
            onValueChange = { onFieldChange("backgroundColor", it) },
        )

        // Start time field
        TimeField(
            label = stringResource(R.string.shift_form_field_start_time),
            hours = uiState.startTimeHours,
            minutes = uiState.startTimeMinutes,
            error = uiState.errors["startTime"],
            onTimeSelected = { h, m ->
                onFieldChange("startTimeHours", h.toString())
                onFieldChange("startTimeMinutes", m.toString())
            },
        )

        // End time field
        TimeField(
            label = stringResource(R.string.shift_form_field_end_time),
            hours = uiState.endTimeHours,
            minutes = uiState.endTimeMinutes,
            error = uiState.errors["endTime"],
            onTimeSelected = { h, m ->
                onFieldChange("endTimeHours", h.toString())
                onFieldChange("endTimeMinutes", m.toString())
            },
        )

        // Hours worked field
        HoursWorkedField(
            hoursWorked = uiState.hoursWorked,
            error = uiState.errors["hoursWorked"],
            onTimeSelected = { h, m ->
                val totalMinutes = h * 60 + m
                onFieldChange("hoursWorked", totalMinutes.toString())
            },
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f),
            ) {
                Text(text = stringResource(R.string.shift_form_action_cancel))
            }
            Button(
                onClick = onSubmit,
                modifier = Modifier.weight(1f),
                enabled = !uiState.isSubmitting,
            ) {
                if (uiState.isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text(text = stringResource(R.string.shift_form_action_save))
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun NameField(
    value: String,
    error: String?,
    onValueChange: (String) -> Unit,
) {
    Column {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(stringResource(R.string.shift_form_field_name)) },
            singleLine = true,
            isError = error != null,
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) {
            ValidationErrorText(error)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun IconField(
    value: String,
    error: String?,
    onValueChange: (String) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }

    Column {
        Text(
            text = stringResource(R.string.shift_form_field_icon),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .border(
                    width = if (error != null) 2.dp else 1.dp,
                    color = if (error != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(8.dp),
                )
                .clickable { showPicker = true },
            contentAlignment = Alignment.Center,
        ) {
            if (value.isNotEmpty()) {
                Text(text = value, fontSize = 24.sp)
            } else {
                Text(
                    text = "➕",
                    fontSize = 24.sp,
                )
            }
        }
        if (error != null) {
            ValidationErrorText(error)
        }
    }

    if (showPicker) {
        EmojiPickerDialog(
            selectedEmoji = value,
            onEmojiSelected = { emoji ->
                onValueChange(emoji)
                showPicker = false
            },
            onDismiss = { showPicker = false },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EmojiPickerDialog(
    selectedEmoji: String,
    onEmojiSelected: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var selectedCategory by remember { mutableStateOf(EMOJI_CATEGORY_LABELS[0]) }
    var searchQuery by remember { mutableStateOf("") }

    val emojisToShow = if (searchQuery.isNotEmpty()) {
        EMOJI_CATEGORIES.values.flatten().filter { it.contains(searchQuery) }
    } else {
        EMOJI_CATEGORIES[selectedCategory] ?: emptyList()
    }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp)
                .height(420.dp),
        ) {
            // Title
            Text(
                text = stringResource(R.string.shift_form_select_icon),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(12.dp))

            // Category tabs
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                EMOJI_CATEGORY_LABELS.forEach { category ->
                    val isSelected = category == selectedCategory
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                else Color.Transparent,
                            )
                            .clickable {
                                selectedCategory = category
                                searchQuery = ""
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(text = category, fontSize = 18.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Emoji grid (scrollable)
            FlowRow(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                emojisToShow.forEach { emoji ->
                    val isSelected = emoji == selectedEmoji
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                else Color.Transparent,
                            )
                            .clickable { onEmojiSelected(emoji) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(text = emoji, fontSize = 22.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ColorField(
    value: String,
    error: String?,
    onValueChange: (String) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }

    Column {
        Text(
            text = stringResource(R.string.shift_form_field_color),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))

        // Selected color preview button
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(
                    if (value.isNotEmpty()) parseHexColor(value)
                    else MaterialTheme.colorScheme.surfaceVariant,
                )
                .border(
                    width = if (error != null) 2.dp else 1.dp,
                    color = if (error != null) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.outline,
                    shape = CircleShape,
                )
                .clickable { showPicker = true },
            contentAlignment = Alignment.Center,
        ) {
            if (value.isEmpty()) {
                Text(
                    text = "🎨",
                    fontSize = 20.sp,
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.shift_form_color_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (error != null) {
            ValidationErrorText(error)
        }
    }

    if (showPicker) {
        ColorPickerDialog(
            selectedColor = value,
            onColorSelected = { hex ->
                onValueChange(hex)
                showPicker = false
            },
            onDismiss = { showPicker = false },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeField(
    label: String,
    hours: Int?,
    minutes: Int?,
    error: String?,
    onTimeSelected: (Int, Int) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }

    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .border(
                    width = if (error != null) 2.dp else 1.dp,
                    color = if (error != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(8.dp),
                )
                .clickable { showPicker = true }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Outlined.AccessTime,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = if (hours != null && minutes != null) {
                    String.format(java.util.Locale.getDefault(), "%02d:%02d", hours, minutes)
                } else {
                    stringResource(R.string.shift_form_not_set)
                },
                style = MaterialTheme.typography.bodyLarge,
                color = if (hours != null && minutes != null) {
                    MaterialTheme.colorScheme.onSurface
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
        if (error != null) {
            ValidationErrorText(error)
        }
    }

    if (showPicker) {
        TimePickerDialog(
            initialHour = hours ?: 0,
            initialMinute = minutes ?: 0,
            onTimeSelected = onTimeSelected,
            onDismiss = { showPicker = false },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HoursWorkedField(
    hoursWorked: Int?,
    error: String?,
    onTimeSelected: (Int, Int) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }

    val displayText = if (hoursWorked != null) {
        val h = hoursWorked / 60
        val m = hoursWorked % 60
        String.format(java.util.Locale.getDefault(), "%dh %dm", h, m)
    } else {
        stringResource(R.string.shift_form_not_set)
    }

    Column {
        Text(
            text = stringResource(R.string.shift_form_field_hours_worked),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .border(
                    width = if (error != null) 2.dp else 1.dp,
                    color = if (error != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(8.dp),
                )
                .clickable { showPicker = true }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Outlined.AccessTime,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = displayText,
                style = MaterialTheme.typography.bodyLarge,
                color = if (hoursWorked != null) {
                    MaterialTheme.colorScheme.onSurface
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
        if (error != null) {
            ValidationErrorText(error)
        }
    }

    if (showPicker) {
        TimePickerDialog(
            initialHour = hoursWorked?.let { it / 60 } ?: 0,
            initialMinute = hoursWorked?.let { it % 60 } ?: 0,
            onTimeSelected = onTimeSelected,
            onDismiss = { showPicker = false },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimePickerDialog(
    initialHour: Int,
    initialMinute: Int,
    onTimeSelected: (Int, Int) -> Unit,
    onDismiss: () -> Unit,
) {
    val timePickerState = rememberTimePickerState(
        initialHour = initialHour,
        initialMinute = initialMinute,
        is24Hour = true,
    )

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surface)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.shift_form_select_time),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(16.dp))
            TimePicker(state = timePickerState)
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onDismiss) {
                    Text(text = stringResource(R.string.shift_form_action_cancel))
                }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(
                    onClick = {
                        onTimeSelected(timePickerState.hour, timePickerState.minute)
                        onDismiss()
                    },
                ) {
                    Text(text = stringResource(R.string.shift_form_action_save))
                }
            }
        }
    }
}

/**
 * Maps validation error keys to localized string resources.
 */
@Composable
private fun ValidationErrorText(errorKey: String) {
    val message = when (errorKey) {
        "shift.validation.name.required" -> stringResource(R.string.shift_validation_name_required)
        "shift.validation.name.maxLength" -> stringResource(R.string.shift_validation_name_max_length)
        "shift.validation.icon.required" -> stringResource(R.string.shift_validation_icon_required)
        "shift.validation.color.required" -> stringResource(R.string.shift_validation_color_required)
        "shift.validation.startTime.required" -> stringResource(R.string.shift_validation_start_time_required)
        "shift.validation.endTime.required" -> stringResource(R.string.shift_validation_end_time_required)
        "shift.validation.hoursWorked.range" -> stringResource(R.string.shift_validation_hours_worked_range)
        else -> errorKey
    }
    Spacer(modifier = Modifier.height(4.dp))
    Text(
        text = message,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.error,
    )
}

private fun parseHexColor(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: IllegalArgumentException) {
        Color.Gray
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftFormScreenCreatePreview() {
    PlanixorTheme {
        ShiftFormContent(
            uiState = ShiftFormUiState(),
            onFieldChange = { _, _ -> },
            onSubmit = {},
            onCancel = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftFormScreenEditPreview() {
    PlanixorTheme {
        ShiftFormContent(
            uiState = ShiftFormUiState(
                name = "Morning Shift",
                icon = "☀️",
                backgroundColor = "#10B981",
                startTimeHours = 8,
                startTimeMinutes = 0,
                endTimeHours = 16,
                endTimeMinutes = 0,
                hoursWorked = 480,
                mode = ShiftFormMode.Edit("123"),
            ),
            onFieldChange = { _, _ -> },
            onSubmit = {},
            onCancel = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ShiftFormScreenWithErrorsPreview() {
    PlanixorTheme {
        ShiftFormContent(
            uiState = ShiftFormUiState(
                errors = mapOf(
                    "name" to "shift.validation.name.required",
                    "icon" to "shift.validation.icon.required",
                    "backgroundColor" to "shift.validation.color.required",
                    "startTime" to "shift.validation.startTime.required",
                    "endTime" to "shift.validation.endTime.required",
                    "hoursWorked" to "shift.validation.hoursWorked.range",
                ),
            ),
            onFieldChange = { _, _ -> },
            onSubmit = {},
            onCancel = {},
        )
    }
}
