package com.codenized.planixor.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.codenized.planixor.R
import com.codenized.planixor.ui.calendar.CalendarScreen
import com.codenized.planixor.ui.reports.ReportsScreen
import com.codenized.planixor.ui.settings.SettingsScreen
import com.codenized.planixor.ui.shifts.ShiftFormScreen
import com.codenized.planixor.ui.shifts.ShiftsScreen
import com.codenized.planixor.ui.theme.PrimaryBlue
import com.codenized.planixor.ui.theme.PrimaryPurple
import com.codenized.planixor.ui.theme.TextSecondary

/**
 * Main navigation graph for the Planixor application.
 * Integrates BottomNavBar with NavHost using a Scaffold.
 * Calendar is the start destination.
 * TopAppBar displays the brand logo and app name.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val pageTitle = when {
        currentRoute == Screen.Calendar.route -> stringResource(R.string.nav_calendar)
        currentRoute == Screen.Reports.route -> stringResource(R.string.nav_reports)
        currentRoute?.startsWith("shifts") == true -> stringResource(R.string.nav_shifts)
        currentRoute == Screen.Reminders.route -> stringResource(R.string.nav_reminders)
        currentRoute == Screen.Settings.route -> stringResource(R.string.settings_title)
        else -> stringResource(R.string.nav_calendar)
    }

    // Determine if we're on a sub-screen that has its own top bar
    val isSubScreen = currentRoute == Screen.ShiftCreate.route ||
        currentRoute == Screen.ShiftEdit.route

    // For bottom nav selection, map sub-routes to their parent
    val bottomNavRoute = when {
        currentRoute?.startsWith("shifts") == true -> Screen.Shifts.route
        else -> currentRoute
    }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    if (isSubScreen) {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = stringResource(R.string.content_description_previous),
                            )
                        }
                    }
                },
                title = {
                    if (isSubScreen) {
                        Text(
                            text = when (currentRoute) {
                                Screen.ShiftCreate.route -> stringResource(R.string.shift_form_title_create)
                                Screen.ShiftEdit.route -> stringResource(R.string.shift_form_title_edit)
                                else -> ""
                            },
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                            ),
                        )
                    } else {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Logo icon with gradient background
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    brush = Brush.linearGradient(
                                        colors = listOf(PrimaryBlue, PrimaryPurple),
                                    ),
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "P",
                                color = Color.White,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        // App name + page title
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = stringResource(R.string.app_name),
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                ),
                                color = MaterialTheme.colorScheme.onBackground,
                            )
                            Text(
                                text = " · ",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextSecondary,
                            )
                            Text(
                                text = pageTitle,
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Normal,
                                ),
                                color = TextSecondary,
                            )
                        }
                    }
                    }
                },
                actions = {
                    // New event button (only on Calendar screen)
                    if (currentRoute == Screen.Calendar.route) {
                        IconButton(onClick = { /* TODO: new event */ }) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(PrimaryBlue),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Add,
                                    contentDescription = stringResource(R.string.action_new_event),
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                    }
                    // New shift button (only on Shifts screen)
                    if (currentRoute == Screen.Shifts.route) {
                        IconButton(onClick = { navController.navigate(Screen.ShiftCreate.route) }) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(PrimaryBlue),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Add,
                                    contentDescription = stringResource(R.string.shifts_new_shift),
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                    }
                    // Notifications icon button (stub)
                    IconButton(onClick = { /* TODO: notifications */ }) {
                        Icon(
                            imageVector = Icons.Outlined.Notifications,
                            contentDescription = stringResource(R.string.content_description_notifications),
                            tint = TextSecondary,
                        )
                    }
                    // User avatar icon button (stub)
                    IconButton(onClick = { /* TODO: user profile */ }) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Person,
                                contentDescription = stringResource(R.string.content_description_user_menu),
                                tint = TextSecondary,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
        bottomBar = {
            BottomNavBar(
                currentRoute = bottomNavRoute,
                onNavigate = { screen ->
                    navController.navigate(screen.route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
            )
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Calendar.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Screen.Calendar.route) {
                CalendarScreen()
            }
            composable(Screen.Shifts.route) {
                ShiftsScreen(
                    onNavigateToNewShift = {
                        navController.navigate(Screen.ShiftCreate.route)
                    },
                    onNavigateToEditShift = { shiftId ->
                        navController.navigate(Screen.ShiftEdit.createRoute(shiftId))
                    },
                )
            }
            composable(Screen.ShiftCreate.route) {
                ShiftFormScreen(
                    onNavigateBack = { navController.popBackStack() },
                )
            }
            composable(
                route = Screen.ShiftEdit.route,
                arguments = listOf(
                    navArgument("shiftId") { type = NavType.StringType },
                ),
            ) {
                ShiftFormScreen(
                    onNavigateBack = { navController.popBackStack() },
                )
            }
            composable(Screen.Reminders.route) {
                RemindersPlaceholder()
            }
            composable(Screen.Reports.route) {
                ReportsScreen()
            }
            composable(Screen.Settings.route) {
                SettingsScreen()
            }
        }
    }
}

@Composable
private fun RemindersPlaceholder() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = stringResource(R.string.nav_reminders))
    }
}
