package com.codenized.planixor.ui.calendar

import androidx.compose.foundation.layout.Box
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
import com.codenized.planixor.model.CalendarView
import com.codenized.planixor.ui.theme.PlanixorTheme
import java.time.LocalDate

/**
 * Main calendar screen composable.
 * Displays a TopAppBar area with ViewSelector and DateNavigator,
 * plus an empty state placeholder for the calendar content.
 *
 * @param viewModel The CalendarViewModel injected via Hilt.
 * @param modifier Optional modifier.
 */
@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel = hiltViewModel(),
    modifier: Modifier = Modifier,
) {
    val activeView by viewModel.activeView.collectAsStateWithLifecycle()
    val currentDate by viewModel.currentDate.collectAsStateWithLifecycle()

    CalendarScreenContent(
        activeView = activeView,
        currentDate = currentDate,
        onViewSelected = viewModel::switchView,
        onNavigateBackward = viewModel::navigateBackward,
        onNavigateForward = viewModel::navigateForward,
        onTodayClick = viewModel::goToToday,
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
    onViewSelected: (CalendarView) -> Unit,
    onNavigateBackward: () -> Unit,
    onNavigateForward: () -> Unit,
    onTodayClick: () -> Unit,
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .weight(1f),
        ) {
            when (activeView) {
                CalendarView.Day -> DayView(currentDate = currentDate)
                CalendarView.Week -> WeekView(currentDate = currentDate)
                CalendarView.Month -> MonthView(currentDate = currentDate)
                CalendarView.Year -> YearView(currentDate = currentDate)
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun CalendarScreenContentPreview() {
    PlanixorTheme {
        CalendarScreenContent(
            activeView = CalendarView.Week,
            currentDate = LocalDate.of(2024, 6, 15),
            onViewSelected = {},
            onNavigateBackward = {},
            onNavigateForward = {},
            onTodayClick = {},
        )
    }
}
