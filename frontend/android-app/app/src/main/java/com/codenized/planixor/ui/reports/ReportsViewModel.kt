package com.codenized.planixor.ui.reports

import androidx.lifecycle.ViewModel
import com.codenized.planixor.model.CalendarView
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

/**
 * UI state for the Reports screen.
 * Contains the selected time range, chart data (empty for now), and error state.
 */
data class ReportsUiState(
    val selectedRange: CalendarView = CalendarView.Week,
    val barChartData: List<Float> = emptyList(),
    val donutChartData: List<Float> = emptyList(),
    val totalHours: String = "0h",
    val upcomingItems: List<String> = emptyList(),
    val hasData: Boolean = false,
    val error: String? = null,
)

/**
 * ViewModel for the Reports screen.
 * Manages the selected time range and exposes empty data state.
 * In future iterations, this will load real data from the local store.
 */
@HiltViewModel
class ReportsViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(ReportsUiState())
    val uiState: StateFlow<ReportsUiState> = _uiState.asStateFlow()

    fun selectTimeRange(range: CalendarView) {
        _uiState.update { it.copy(selectedRange = range) }
    }
}
