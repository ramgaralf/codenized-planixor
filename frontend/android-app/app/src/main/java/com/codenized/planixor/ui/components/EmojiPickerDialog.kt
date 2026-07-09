package com.codenized.planixor.ui.components

import android.graphics.Color
import android.view.ContextThemeWrapper
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.emoji2.emojipicker.EmojiPickerView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.LocalThemeViewModel
import com.codenized.planixor.R
import com.codenized.planixor.model.ThemeMode

/**
 * A dialog that displays the native AndroidX Emoji Picker (androidx.emoji2:emojipicker).
 * Provides the complete system emoji set with built-in category tabs and recent emojis.
 *
 * The EmojiPickerView is a View-based widget that resolves its internal colors from
 * Material 3 theme attributes. We wrap the context with the appropriate Material 3 theme
 * (dark or light) based on the app's ThemeMode setting to ensure proper rendering.
 *
 * @param selectedEmoji The currently selected emoji string (used for highlighting, if supported).
 * @param onEmojiSelected Callback invoked with the selected emoji string.
 * @param onDismiss Callback invoked when the dialog is dismissed.
 */
@Composable
fun EmojiPickerDialog(
    selectedEmoji: String,
    onEmojiSelected: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Determine dark mode from the app's ThemeViewModel (not just system setting)
    val themeViewModel = LocalThemeViewModel.current
    val themeMode by themeViewModel.themeMode.collectAsStateWithLifecycle()
    val isDarkTheme = when (themeMode) {
        ThemeMode.Light -> false
        ThemeMode.Dark -> true
        ThemeMode.System -> isSystemInDarkTheme()
    }

    val themeResId = if (isDarkTheme) {
        com.google.android.material.R.style.Theme_Material3_Dark
    } else {
        com.google.android.material.R.style.Theme_Material3_Light
    }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = modifier
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
        ) {
            // Title
            Text(
                text = stringResource(R.string.emoji_picker_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(modifier = Modifier.height(12.dp))

            // Native AndroidX Emoji Picker (View-based, wrapped in AndroidView)
            AndroidView(
                factory = { context ->
                    val themedContext = ContextThemeWrapper(context, themeResId)
                    EmojiPickerView(themedContext).apply {
                        setOnEmojiPickedListener { emojiViewItem ->
                            onEmojiSelected(emojiViewItem.emoji)
                        }
                        // Transparent background so Compose dialog surface shows through
                        setBackgroundColor(Color.TRANSPARENT)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(350.dp),
            )
        }
    }
}
