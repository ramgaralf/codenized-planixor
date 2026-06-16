package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.codenized.planixor.domain.model.CalendarEventDisplay
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.calendar.components.DayView
import com.codenized.planixor.ui.calendar.components.MonthView
import com.codenized.planixor.ui.calendar.components.ViewSelector
import com.codenized.planixor.ui.calendar.components.WeekView
import com.codenized.planixor.ui.calendar.components.YearView
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.LocalDate

/**
 * Main calendar screen composable.
 * Displays ViewSelector, DateNavigator, and the active view component (Day/Week/Month/Year).
 * Observes CalendarViewModel state for navigation and event data.
 *
 * @param onNavigateToEventDetail Callback to navigate to event detail page.
 * @param onNavigateToDayView Callback to navigate to day view for a specific date.
 * @param viewModel The CalendarViewModel injected via Hilt.
 * @param modifier Optional modifier.
 */
@Composable
fun CalendarScreen(
    onNavigateToEventDetail: (String) -> Unit = {},
    onNavigateToDayView: (LocalDate) -> Unit = {},
    viewModel: CalendarViewModel = hiltViewModel(),
    modifier: Modifier = Modifier,
) {
    val activeView by viewModel.activeView.collectAsStateWithLifecycle()
    val currentDate by viewModel.currentDate.collectAsStateWithLifecycle()
    val events by viewModel.events.collectAsStateWithLifecycle()

    CalendarScreenContent(
        activeView = activeView,
        currentDate = currentDate,
        events = events,
        onViewSelected = viewModel::switchView,
        onNavigateBackward = viewModel::navigateBackward,
        onNavigateForward = viewModel::navigateForward,
        onTodayClick = viewModel::goToToday,
        onEventClick = onNavigateToEventDetail,
        onDayClick = { date ->
            viewModel.switchView(CalendarView.Day)
            viewModel.navigateToDate(date)
            onNavigateToDayView(date)
        },
        modifier = modifier,
    )
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
    onNavigateBackward: () -> Unit,
    onNavigateForward: () -> Unit,
    onTodayClick: () -> Unit,
    onEventClick: (String) -> Unit,
    onDayClick: (LocalDate) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
    ) {
        Spacer(modifier = Modifier.height(8.dp))

        ViewSelector(
            activeView = activeView,
            onViewSelected = onViewSelected,
        )

        Spacer(modifier = Modifier.height(8.dp))

        DateNavigator(
            currentDate = currentDate,
            activeView = activeView,
            onNavigateBackward = onNavigateBackward,
            onNavigateForward = onNavigateForward,
            onTodayClick = onTodayClick,
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
            onNavigateBackward = {},
            onNavigateForward = {},
            onTodayClick = {},
            onEventClick = {},
            onDayClick = {},
        )
    }
}
