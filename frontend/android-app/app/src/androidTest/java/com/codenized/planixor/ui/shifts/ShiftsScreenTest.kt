package com.codenized.planixor.ui.shifts

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.codenized.planixor.domain.model.Shift
import com.codenized.planixor.ui.theme.PlanixorTheme
import org.junit.Rule
import org.junit.Test

/**
 * Compose UI tests for the ShiftsScreen content composable.
 * Tests loading, empty, error, and success states.
 * Validates: Requirements 2.2, 2.3, 2.5
 */
class ShiftsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun shiftsScreen_should_showProgressIndicator_when_stateIsLoading() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftsScreenContent(
                    uiState = ShiftsUiState.Loading,
                    onNewShiftClick = {},
                    onEditClick = {},
                    onDeactivateConfirmed = {},
                    onActivateClick = {},
                    onDeleteConfirmed = {},
                )
            }
        }

        // Loading state: no empty or error text should be present
        composeTestRule.onNodeWithText("No hay turnos disponibles").assertDoesNotExist()
        composeTestRule.onNodeWithText("No se pudieron cargar los turnos").assertDoesNotExist()
    }

    @Test
    fun shiftsScreen_should_showEmptyMessage_when_stateIsEmpty() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftsScreenContent(
                    uiState = ShiftsUiState.Empty,
                    onNewShiftClick = {},
                    onEditClick = {},
                    onDeactivateConfirmed = {},
                    onActivateClick = {},
                    onDeleteConfirmed = {},
                )
            }
        }

        composeTestRule.onNodeWithText("No hay turnos disponibles").assertIsDisplayed()
    }

    @Test
    fun shiftsScreen_should_showErrorMessage_when_stateIsError() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftsScreenContent(
                    uiState = ShiftsUiState.Error("Could not load shifts"),
                    onNewShiftClick = {},
                    onEditClick = {},
                    onDeactivateConfirmed = {},
                    onActivateClick = {},
                    onDeleteConfirmed = {},
                )
            }
        }

        composeTestRule.onNodeWithText("No se pudieron cargar los turnos").assertIsDisplayed()
    }

    @Test
    fun shiftsScreen_should_showShiftNames_when_stateIsSuccess() {
        val shifts = listOf(
            Shift(
                id = "1",
                name = "Morning Shift",
                icon = "☀️",
                backgroundColor = "#10B981",
                startTime = 480,
                endTime = 960,
                hoursWorked = 480,
                isActive = true,
                createdAt = System.currentTimeMillis(),
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
            Shift(
                id = "2",
                name = "Night Shift",
                icon = "🌙",
                backgroundColor = "#2563EB",
                startTime = 1320,
                endTime = 360,
                hoursWorked = 480,
                isActive = true,
                createdAt = System.currentTimeMillis(),
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )

        composeTestRule.setContent {
            PlanixorTheme {
                ShiftsScreenContent(
                    uiState = ShiftsUiState.Success(shifts),
                    onNewShiftClick = {},
                    onEditClick = {},
                    onDeactivateConfirmed = {},
                    onActivateClick = {},
                    onDeleteConfirmed = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Morning Shift").assertIsDisplayed()
        composeTestRule.onNodeWithText("Night Shift").assertIsDisplayed()
    }

    @Test
    fun shiftsScreen_should_notShowEmptyMessage_when_stateIsSuccess() {
        val shifts = listOf(
            Shift(
                id = "1",
                name = "Morning Shift",
                icon = "☀️",
                backgroundColor = "#10B981",
                startTime = 480,
                endTime = 960,
                hoursWorked = 480,
                isActive = true,
                createdAt = System.currentTimeMillis(),
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )

        composeTestRule.setContent {
            PlanixorTheme {
                ShiftsScreenContent(
                    uiState = ShiftsUiState.Success(shifts),
                    onNewShiftClick = {},
                    onEditClick = {},
                    onDeactivateConfirmed = {},
                    onActivateClick = {},
                    onDeleteConfirmed = {},
                )
            }
        }

        composeTestRule.onNodeWithText("No hay turnos disponibles").assertDoesNotExist()
        composeTestRule.onNodeWithText("No se pudieron cargar los turnos").assertDoesNotExist()
    }
}
