package com.codenized.planixor.ui.shifts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.codenized.planixor.data.local.ShiftRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel managing shift list loading, deactivation, reactivation, and deletion.
 * Collects the getAllActive() flow from ShiftRepository and maps emissions to ShiftsUiState.
 */
@HiltViewModel
class ShiftsViewModel @Inject constructor(
    private val shiftRepository: ShiftRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ShiftsUiState>(ShiftsUiState.Loading)
    val uiState: StateFlow<ShiftsUiState> = _uiState.asStateFlow()

    init {
        observeShifts()
    }

    private fun observeShifts() {
        viewModelScope.launch {
            shiftRepository.getAllActive()
                .map { shifts ->
                    if (shifts.isEmpty()) {
                        ShiftsUiState.Empty
                    } else {
                        ShiftsUiState.Success(shifts)
                    }
                }
                .catch { e ->
                    _uiState.value = ShiftsUiState.Error(
                        e.message ?: "Could not load shifts"
                    )
                }
                .collect { state ->
                    _uiState.value = state
                }
        }
    }

    /**
     * Deactivates a shift by toggling its isActive flag to false.
     * UI layer is responsible for showing a confirmation dialog before calling this.
     */
    fun deactivate(id: String) {
        viewModelScope.launch {
            shiftRepository.toggleActive(id)
        }
    }

    /**
     * Activates a shift by toggling its isActive flag to true.
     * No confirmation required — executes immediately.
     */
    fun activate(id: String) {
        viewModelScope.launch {
            shiftRepository.toggleActive(id)
        }
    }

    /**
     * Soft-deletes a shift, marking it as deleted.
     * UI layer is responsible for showing a confirmation dialog before calling this.
     */
    fun delete(id: String) {
        viewModelScope.launch {
            shiftRepository.softDelete(id)
        }
    }
}
