package com.codenized.planixor.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.PrimaryBlue
import com.codenized.planixor.ui.theme.TextSecondary

/**
 * Data class representing a bottom navigation item.
 */
data class BottomNavItem(
    val screen: Screen,
    val labelResId: Int,
    val icon: ImageVector,
)

/**
 * Bottom navigation bar with 5 items: Calendar, Shifts, Reminders, Reports, Settings.
 *
 * @param currentRoute The currently active route.
 * @param onNavigate Callback invoked when a navigation item is tapped.
 * @param modifier Optional modifier.
 */
@Composable
fun BottomNavBar(
    currentRoute: String?,
    onNavigate: (Screen) -> Unit,
    modifier: Modifier = Modifier,
) {
    val items = listOf(
        BottomNavItem(Screen.Calendar, R.string.nav_calendar, Icons.Outlined.CalendarMonth),
        BottomNavItem(Screen.Reports, R.string.nav_reports, Icons.Outlined.BarChart),
        BottomNavItem(Screen.Shifts, R.string.nav_shifts, Icons.Outlined.Schedule),
        BottomNavItem(Screen.Reminders, R.string.nav_reminders, Icons.Outlined.Notifications),
        BottomNavItem(Screen.Settings, R.string.nav_settings, Icons.Outlined.Settings),
    )

    NavigationBar(
        modifier = modifier,
        tonalElevation = 0.dp,
    ) {
        items.forEach { item ->
            val selected = currentRoute == item.screen.route

            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.screen) },
                icon = {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = stringResource(item.labelResId),
                    )
                },
                label = {
                    Text(text = stringResource(item.labelResId))
                },
                alwaysShowLabel = selected,
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = PrimaryBlue,
                    selectedTextColor = PrimaryBlue,
                    unselectedIconColor = TextSecondary,
                    unselectedTextColor = TextSecondary,
                    indicatorColor = Color.Transparent,
                ),
            )
        }
    }
}


@Preview(showBackground = true)
@Composable
private fun BottomNavBarPreview() {
    PlanixorTheme {
        BottomNavBar(
            currentRoute = "calendar",
            onNavigate = {},
        )
    }
}
