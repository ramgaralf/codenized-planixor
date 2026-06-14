package com.codenized.planixor.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import com.codenized.planixor.model.ThemeMode

private val LightColorScheme = lightColorScheme(
    primary = PrimaryBlue,
    secondary = PrimaryPurple,
    tertiary = AccentTeal,
    background = LightBackground,
    surface = LightSurface,
    onBackground = TextPrimaryLight,
    onSurface = TextPrimaryLight,
    onPrimary = LightBackground,
    onSecondary = LightBackground,
    onTertiary = LightBackground,
    surfaceVariant = NeutralLight,
    onSurfaceVariant = TextSecondary,
    outline = BorderLight,
    error = Error,
)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryBlue,
    secondary = PrimaryPurple,
    tertiary = AccentTeal,
    background = BackgroundDark,
    surface = SurfaceDark,
    onBackground = TextPrimaryDark,
    onSurface = TextPrimaryDark,
    onPrimary = TextPrimaryDark,
    onSecondary = TextPrimaryDark,
    onTertiary = TextPrimaryDark,
    surfaceVariant = SurfaceDark,
    onSurfaceVariant = TextSecondaryDark,
    outline = BorderDark,
    error = ErrorDark,
)

/**
 * Planixor application theme wrapper using Material Design 3.
 * Supports three-state theme: Light, Dark, or System (follows OS preference).
 */
@Composable
fun PlanixorTheme(
    themeMode: ThemeMode = ThemeMode.System,
    content: @Composable () -> Unit,
) {
    val darkTheme = when (themeMode) {
        ThemeMode.Light -> false
        ThemeMode.Dark -> true
        ThemeMode.System -> isSystemInDarkTheme()
    }

    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = PlanixorTypography,
        content = content,
    )
}
