package com.codenized.planixor.ui.shifts

import com.codenized.planixor.domain.model.Shift

/**
 * Sealed interface representing all possible UI states for the Shifts screen.
 */
sealed interface ShiftsUiState {
    data object Loading : ShiftsUiState
    data object Empty : ShiftsUiState
    data class Error(val message: String) : ShiftsUiState
    data class Success(val shifts: List<Shift>) : ShiftsUiState
}
