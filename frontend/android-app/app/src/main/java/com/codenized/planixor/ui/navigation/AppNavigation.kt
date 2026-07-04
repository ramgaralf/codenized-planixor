package com.codenized.planixor.ui.navigation

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
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
import androidx.compose.ui.res.painterResource
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.ui.calendar.CalendarScreen
import com.codenized.planixor.ui.calendar.CalendarViewModel
import com.codenized.planixor.ui.calendar.EventFormScreen
import com.codenized.planixor.ui.calendar.EventFormUiState
import com.codenized.planixor.ui.components.SyncButton
import com.codenized.planixor.ui.notifications.NotificationsScreen
import com.codenized.planixor.ui.notifications.NotificationsViewModel
import com.codenized.planixor.ui.reports.ReportMode
import com.codenized.planixor.ui.reports.ReportsScreen
import com.codenized.planixor.ui.reports.ReportsViewModel
import com.codenized.planixor.ui.settings.SettingsScreen
import com.codenized.planixor.ui.shifts.ShiftFormScreen
import com.codenized.planixor.ui.shifts.ShiftsScreen
import com.codenized.planixor.ui.reminders.ReminderFormScreen
import com.codenized.planixor.ui.reminders.RemindersScreen
import com.codenized.planixor.ui.sync.SyncConfigScreen
import com.codenized.planixor.ui.sync.SyncScreen
import com.codenized.planixor.ui.sync.SyncViewModel
import com.codenized.planixor.ui.theme.PrimaryBlue
import com.codenized.planixor.ui.theme.TextSecondary
import com.codenized.planixor.data.notification.NotificationChannel
import com.codenized.planixor.ui.calendar.PrerequisiteDialogState
import com.codenized.planixor.ui.components.PrerequisiteDialog
import kotlinx.coroutines.flow.MutableStateFlow
import java.time.LocalDate

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

    // Observe CalendarViewModel's current navigated date for pre-selection when creating events
    val calendarBackStackEntry = navBackStackEntry?.takeIf { it.destination.route == Screen.Calendar.route }
    val calendarViewModel: CalendarViewModel? = if (calendarBackStackEntry != null) {
        hiltViewModel<CalendarViewModel>(calendarBackStackEntry)
    } else {
        null
    }
    val fallbackDateFlow = androidx.compose.runtime.remember { MutableStateFlow(LocalDate.now()) }
    val calendarCurrentDate by (calendarViewModel?.currentDate
        ?: fallbackDateFlow).collectAsStateWithLifecycle()

    // Observe ReportsViewModel mode when on Reports screen for top bar config button
    val isOnReportsScreen = currentRoute == Screen.Reports.route

    // Notifications badge and channel visibility
    val notificationsViewModel: NotificationsViewModel = hiltViewModel()
    val notificationBadgeCount by notificationsViewModel.badgeCount.collectAsStateWithLifecycle()
    val notificationChannel by notificationsViewModel.channelFlow.collectAsStateWithLifecycle()
    val showBellIcon = notificationChannel != NotificationChannel.SYSTEM

    // Sync status for the SyncButton
    val syncViewModel: SyncViewModel = hiltViewModel()
    val syncUiState by syncViewModel.uiState.collectAsStateWithLifecycle()

    // Wrap in a composable helper to properly handle conditional ViewModel retrieval
    val isReportsYearMode = isOnReportsScreen && navBackStackEntry != null
    val reportsViewModel: ReportsViewModel? = if (isReportsYearMode) {
        hiltViewModel<ReportsViewModel>(navBackStackEntry!!)
    } else {
        null
    }
    val showAnnualConfigButton = if (reportsViewModel != null) {
        val state by reportsViewModel.uiState.collectAsStateWithLifecycle()
        state.mode == ReportMode.YEAR
    } else {
        false
    }

    val pageTitle = when {
        currentRoute == Screen.Calendar.route -> stringResource(R.string.nav_calendar)
        currentRoute == Screen.Reports.route -> stringResource(R.string.nav_reports)
        currentRoute?.startsWith("shifts") == true -> stringResource(R.string.nav_shifts)
        currentRoute?.startsWith("reminders") == true -> stringResource(R.string.nav_reminders)
        currentRoute == Screen.Settings.route -> stringResource(R.string.settings_title)
        else -> stringResource(R.string.nav_calendar)
    }

    // Determine if we're on a sub-screen that has its own top bar
    val isSubScreen = currentRoute == Screen.ShiftCreate.route ||
        currentRoute == Screen.ShiftEdit.route ||
        currentRoute == Screen.ReminderCreate.route ||
        currentRoute == Screen.ReminderEdit.route ||
        currentRoute == Screen.EventCreate.route ||
        currentRoute == Screen.EventEdit.route ||
        currentRoute == Screen.Notifications.route ||
        currentRoute == Screen.SyncConfig.route ||
        currentRoute == Screen.Sync.route

    // For bottom nav selection, map sub-routes to their parent
    val bottomNavRoute = when {
        currentRoute?.startsWith("calendar") == true -> Screen.Calendar.route
        currentRoute?.startsWith("shifts") == true -> Screen.Shifts.route
        currentRoute?.startsWith("reminders") == true -> Screen.Reminders.route
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
                                Screen.ReminderCreate.route -> stringResource(R.string.reminder_form_title_create)
                                Screen.ReminderEdit.route -> stringResource(R.string.reminder_form_title_edit)
                                Screen.EventCreate.route -> stringResource(R.string.event_form_title_create)
                                Screen.EventEdit.route -> stringResource(R.string.event_form_title_edit)
                                Screen.Notifications.route -> stringResource(R.string.notifications_title)
                                Screen.SyncConfig.route -> stringResource(R.string.sync_config_title)
                                Screen.Sync.route -> stringResource(R.string.sync_title)
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
                        // Logo icon from vector drawable
                        Image(
                            painter = painterResource(id = R.drawable.ic_logo),
                            contentDescription = null,
                            modifier = Modifier.size(28.dp),
                        )

                        Spacer(modifier = Modifier.width(12.dp))

                        // App name + page title
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = pageTitle,
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                color = MaterialTheme.colorScheme.onBackground,
                            )
                        }
                    }
                    }
                },
                actions = {
                    // New event button (only on Calendar screen)
                    if (currentRoute == Screen.Calendar.route) {
                        IconButton(onClick = {
                            calendarViewModel?.performPrerequisiteCheck(
                                onCanCreate = {
                                    navController.navigate(Screen.EventCreate.createRoute(calendarCurrentDate.toString()))
                                },
                            )
                        }) {
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
                    // New reminder button (only on Reminders screen)
                    if (currentRoute == Screen.Reminders.route) {
                        IconButton(onClick = { navController.navigate(Screen.ReminderCreate.route) }) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(PrimaryBlue),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Add,
                                    contentDescription = stringResource(R.string.reminder_new_reminder),
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                    }
                    // Annual config button (only on Reports screen in Year mode)
                    if (showAnnualConfigButton) {
                        IconButton(onClick = { reportsViewModel?.openConfigDialog() }) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(PrimaryBlue),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Settings,
                                    contentDescription = stringResource(R.string.annual_config_button),
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                    }
                    // Notifications icon button with badge
                    if (showBellIcon) {
                        IconButton(onClick = { navController.navigate(Screen.Notifications.route) }) {
                            BadgedBellIcon(badgeCount = notificationBadgeCount)
                        }
                    }
                    // Sync status button (replaces user avatar)
                    SyncButton(
                        connectionStatus = syncUiState.connectionStatus,
                        onClick = {
                            if (syncUiState.config == null) {
                                navController.navigate(Screen.SyncConfig.route)
                            } else {
                                navController.navigate(Screen.Sync.route)
                            }
                        },
                    )
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
        // Observe prerequisite dialog state
        val prerequisiteState by (calendarViewModel?.prerequisiteState
            ?: MutableStateFlow(PrerequisiteDialogState())).collectAsStateWithLifecycle()

        Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            NavHost(
                navController = navController,
                startDestination = Screen.Calendar.route,
            ) {
            composable(Screen.Calendar.route) {
                CalendarScreen(
                    onNavigateToEventDetail = { eventId ->
                        navController.navigate(Screen.EventEdit.createRoute(eventId))
                    },
                )
            }
            composable(
                route = "calendar/new?preSelectedDate={preSelectedDate}",
                arguments = listOf(
                    navArgument("preSelectedDate") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    },
                ),
            ) { backStackEntry ->
                val preSelectedDate = backStackEntry.arguments?.getString("preSelectedDate")
                CalendarEventFormDestination(
                    eventId = null,
                    preSelectedDate = preSelectedDate,
                    onNavigateBack = { navController.popBackStack() },
                )
            }
            composable(
                route = Screen.EventEdit.route,
                arguments = listOf(
                    navArgument("eventId") { type = NavType.StringType },
                ),
            ) { backStackEntry ->
                val eventId = backStackEntry.arguments?.getString("eventId")
                CalendarEventFormDestination(
                    eventId = eventId,
                    onNavigateBack = { navController.popBackStack() },
                )
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
                RemindersScreen(
                    onNavigateToNewReminder = {
                        navController.navigate(Screen.ReminderCreate.route)
                    },
                    onNavigateToEditReminder = { reminderId ->
                        navController.navigate(Screen.ReminderEdit.createRoute(reminderId))
                    },
                )
            }
            composable(Screen.ReminderCreate.route) {
                ReminderFormScreen(
                    onNavigateBack = { navController.popBackStack() },
                )
            }
            composable(
                route = Screen.ReminderEdit.route,
                arguments = listOf(
                    navArgument("reminderId") { type = NavType.StringType },
                ),
            ) {
                ReminderFormScreen(
                    onNavigateBack = { navController.popBackStack() },
                )
            }
            composable(Screen.Reports.route) {
                ReportsScreen()
            }
            composable(Screen.Notifications.route) {
                NotificationsScreen()
            }
            composable(Screen.Settings.route) {
                SettingsScreen()
            }
            composable(Screen.SyncConfig.route) {
                SyncConfigScreen(
                    viewModel = syncViewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToSync = {
                        navController.navigate(Screen.Sync.route) {
                            popUpTo(Screen.SyncConfig.route) { inclusive = true }
                        }
                    },
                )
            }
            composable(Screen.Sync.route) {
                SyncScreen(
                    viewModel = syncViewModel,
                    onNavigateToConfig = {
                        navController.navigate(Screen.SyncConfig.route)
                    },
                )
            }
        }

            // Prerequisite dialog
            if (prerequisiteState.showDialog) {
                PrerequisiteDialog(
                    missingShifts = prerequisiteState.missingShifts,
                    missingReminders = prerequisiteState.missingReminders,
                    onNavigateToShifts = {
                        calendarViewModel?.dismissPrerequisiteDialog()
                        navController.navigate(Screen.Shifts.route)
                    },
                    onNavigateToReminders = {
                        calendarViewModel?.dismissPrerequisiteDialog()
                        navController.navigate(Screen.Reminders.route)
                    },
                    onDismiss = {
                        calendarViewModel?.dismissPrerequisiteDialog()
                    },
                )
            }
        }
    }
}

/**
 * Destination composable for the calendar event create/edit form.
 * Obtains the CalendarViewModel via Hilt and wires it to EventFormScreen.
 * If eventId is provided, loads the existing event for editing.
 * If preSelectedDate is provided (from calendar navigation), uses that date for the form.
 */
@Composable
private fun CalendarEventFormDestination(
    eventId: String?,
    preSelectedDate: String? = null,
    onNavigateBack: () -> Unit,
) {
    val viewModel: CalendarViewModel = hiltViewModel()
    val formState by viewModel.formState.collectAsStateWithLifecycle()
    val isEditMode = eventId != null
    val showDeleteDialogState = androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }

    androidx.compose.runtime.LaunchedEffect(eventId) {
        if (eventId != null) {
            viewModel.loadEventForEdit(eventId)
        } else if (preSelectedDate != null) {
            val date = LocalDate.parse(preSelectedDate)
            viewModel.initCreateFormWithDate(date)
        } else {
            viewModel.initCreateForm()
        }
    }

    EventFormScreen(
        uiState = formState,
        isEditMode = isEditMode,
        onEventTypeSelected = viewModel::selectEventType,
        onStartDaySelected = viewModel::onStartDaySelected,
        onEndDaySelected = viewModel::onEndDaySelected,
        onStartTimeSelected = viewModel::onStartTimeSelected,
        onEndTimeSelected = viewModel::onEndTimeSelected,
        onNotesChanged = viewModel::onNotesChanged,
        onAlertOffsetsChanged = viewModel::onAlertOffsetsChanged,
        onSave = {
            if (isEditMode) {
                viewModel.updateEvent(eventId!!, onNavigateBack)
            } else {
                viewModel.saveEvent(onNavigateBack)
            }
        },
        onCancel = onNavigateBack,
        onDelete = if (isEditMode) {
            { showDeleteDialogState.value = true }
        } else {
            null
        },
    )

    // Delete confirmation dialog
    if (showDeleteDialogState.value && eventId != null) {
        com.codenized.planixor.ui.calendar.DeleteConfirmationDialog(
            eventName = formState.derivedName.ifBlank { "Event" },
            onConfirm = {
                showDeleteDialogState.value = false
                viewModel.deleteEvent(eventId, onNavigateBack)
            },
            onDismiss = { showDeleteDialogState.value = false },
        )
    }
}

/**
 * Bell icon with optional badge showing unread notification count.
 * Badge rules: 0 = hidden, 1-99 = exact count, >99 = "99+".
 */
@Composable
private fun BadgedBellIcon(badgeCount: Int) {
    BadgedBox(
        badge = {
            if (badgeCount > 0) {
                Badge {
                    Text(
                        text = if (badgeCount > 99) "99+" else badgeCount.toString(),
                    )
                }
            }
        },
    ) {
        Icon(
            imageVector = Icons.Outlined.Notifications,
            contentDescription = stringResource(R.string.content_description_notifications),
            tint = TextSecondary,
        )
    }
}
