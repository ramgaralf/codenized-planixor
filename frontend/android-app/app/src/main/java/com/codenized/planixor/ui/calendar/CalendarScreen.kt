package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.R
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.calendar.components.DayView
import com.codenized.planixor.ui.calendar.components.MonthView
import com.codenized.planixor.ui.calendar.components.ViewSelector
import com.codenized.planixor.ui.calendar.components.WeekView
import com.codenized.planixor.ui.calendar.components.YearView
import com.codenized.planixor.ui.components.DayActionModal
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.LocalDate

/**
 * Main calendar screen composable.
 * Displays ViewSelector, DateNavigator (per-view with segment controls), and the active view.
 * Observes CalendarViewModel state for navigation and event data.
 *
 * In Shift Mode (Month/Year views), day-tap interactions are handled differently:
 * - Empty day → prerequisite check → Calendar_Event_Form (handled via onNavigateToForm)
 * - Day with content → DayActionModal with shift/reminder cards
 *
 * @param onNavigateToEventDetail Callback to navigate to event detail/edit page.
 * @param onNavigateToDayView Callback to navigate to day view for a specific date.
 * @param onNavigateToForm Callback to navigate to the Calendar_Event_Form with a preselected date.
 * @param onEditEvent Callback to navigate to the event edit form for a given event ID.
 * @param viewModel The CalendarViewModel injected via Hilt.
 * @param modifier Optional modifier.
 */
@Composable
fun CalendarScreen(
    modifier: Modifier = Modifier,
    onNavigateToEventDetail: (String) -> Unit = {},
    onNavigateToDayView: (LocalDate) -> Unit = {},
    onNavigateToForm: (LocalDate) -> Unit = {},
    onEditEvent: (String) -> Unit = {},
    viewModel: CalendarViewModel = hiltViewModel(),
) {
    val activeView by viewModel.activeView.collectAsStateWithLifecycle()
    val currentDate by viewModel.currentDate.collectAsStateWithLifecycle()
    val events by viewModel.events.collectAsStateWithLifecycle()
    val availableViews by viewModel.availableViews.collectAsStateWithLifecycle()
    val shiftModeEnabled by viewModel.shiftModeEnabled.collectAsStateWithLifecycle()
    val dayActionModalData by viewModel.dayActionModalState.collectAsStateWithLifecycle()

    CalendarScreenContent(
        activeView = activeView,
        currentDate = currentDate,
        events = events,
        availableViews = availableViews,
        onViewSelected = viewModel::switchView,
        onNavigateDay = viewModel::navigateDay,
        onNavigateWeek = viewModel::navigateWeek,
        onNavigateMonth = viewModel::navigateMonth,
        onNavigateYear = viewModel::navigateYear,
        onTodayClick = viewModel::goToToday,
        onEventClick = onNavigateToEventDetail,
        onDayClick = { date ->
            if (shiftModeEnabled && (activeView == CalendarView.Month || activeView == CalendarView.Year)) {
                viewModel.onShiftModeDayTap(date) { tappedDate ->
                    onNavigateToForm(tappedDate)
                }
            } else {
                viewModel.switchView(CalendarView.Day)
                viewModel.navigateToDate(date)
                onNavigateToDayView(date)
            }
        },
        modifier = modifier,
    )

    // Day Action Modal: shown when dayActionModalState is non-null (shift mode day with content)
    dayActionModalData?.let { modalData ->
        DayActionModal(
            date = modalData.date,
            shiftEvents = modalData.shiftEvents,
            reminderEvents = modalData.reminderEvents,
            onCreateEvent = {
                viewModel.dismissDayActionModal()
                // If on Year view, switch to Month view for return navigation (per spec Req 8.4)
                if (activeView == CalendarView.Year) {
                    viewModel.switchView(CalendarView.Month)
                    viewModel.navigateToDate(modalData.date)
                }
                onNavigateToForm(modalData.date)
            },
            onEditShift = { eventId ->
                viewModel.dismissDayActionModal()
                // If on Year view, switch to Month view for return navigation (per spec Req 8.6)
                if (activeView == CalendarView.Year) {
                    viewModel.switchView(CalendarView.Month)
                    viewModel.navigateToDate(modalData.date)
                }
                onEditEvent(eventId)
            },
            onEditReminder = { eventId ->
                viewModel.dismissDayActionModal()
                // If on Year view, switch to Month view for return navigation (per spec Req 8.8)
                if (activeView == CalendarView.Year) {
                    viewModel.switchView(CalendarView.Month)
                    viewModel.navigateToDate(modalData.date)
                }
                onEditEvent(eventId)
            },
            onDismiss = {
                viewModel.dismissDayActionModal()
            },
        )
    }
}

/**
 * Stateless content composable for the calendar screen.
 * Enables preview and testing without a ViewModel.
 */
@Composable
fun CalendarScreenContent(
    activeView: CalendarView,
    currentDate: LocalDate,
    events: List<CalendarEventDisplay>,
    onViewSelected: (CalendarView) -> Unit,
    onNavigateDay: (Int) -> Unit,
    onNavigateWeek: (Int) -> Unit,
    onNavigateMonth: (Int) -> Unit,
    onNavigateYear: (Int) -> Unit,
    onTodayClick: () -> Unit,
    onEventClick: (String) -> Unit,
    onDayClick: (LocalDate) -> Unit,
    modifier: Modifier = Modifier,
    availableViews: List<CalendarView> = CalendarView.entries,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
    ) {
        Spacer(modifier = Modifier.height(8.dp))

        // Line 1: ViewSelector (left) + Today button (right, same style)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ViewSelector(
                activeView = activeView,
                onViewSelected = onViewSelected,
                views = availableViews,
            )
            Spacer(modifier = Modifier.weight(1f))
            androidx.compose.material3.OutlinedButton(
                onClick = onTodayClick,
                modifier = Modifier.height(40.dp),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(50),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp),
            ) {
                Text(
                    text = stringResource(R.string.calendar_today),
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Line 2: DateNavigator — full width, no Today button
        DateNavigator(
            currentDate = currentDate,
            activeView = activeView,
            onNavigateDay = onNavigateDay,
            onNavigateWeek = onNavigateWeek,
            onNavigateMonth = onNavigateMonth,
            onNavigateYear = onNavigateYear,
            onTodayClick = onTodayClick,
            showTodayButton = false,
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Calendar content area — switches based on active view
        when (activeView) {
            CalendarView.Day -> DayView(
                currentDate = currentDate,
                events = events,
                onEventClick = onEventClick,
                modifier = Modifier.weight(1f),
            )
            CalendarView.Week -> WeekView(
                currentDate = currentDate,
                events = events,
                onEventClick = onEventClick,
                modifier = Modifier.weight(1f),
            )
            CalendarView.Month -> MonthView(
                currentDate = currentDate,
                events = events,
                onDayClick = onDayClick,
                modifier = Modifier.weight(1f),
            )
            CalendarView.Year -> YearView(
                currentDate = currentDate,
                events = events,
                onDayClick = onDayClick,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun CalendarScreenContentPreview() {
    PlanixorTheme {
        CalendarScreenContent(
            activeView = CalendarView.Day,
            currentDate = LocalDate.of(2024, 6, 15),
            events = emptyList(),
            onViewSelected = {},
            onNavigateDay = {},
            onNavigateWeek = {},
            onNavigateMonth = {},
            onNavigateYear = {},
            onTodayClick = {},
            onEventClick = {},
            onDayClick = {},
        )
    }
}
