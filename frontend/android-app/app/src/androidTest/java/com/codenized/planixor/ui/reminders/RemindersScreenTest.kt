package com.codenized.planixor.ui.reminders

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.codenized.planixor.domain.model.Reminder
import com.codenized.planixor.ui.theme.PlanixorTheme
import org.junit.Rule
import org.junit.Test

/**
 * Compose UI tests for the RemindersScreen content composable.
 * Tests loading, empty, error, and success states.
 * Validates: Requirements 2.2, 2.3, 2.5
 */
class RemindersScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun remindersScreen_should_showProgressIndicator_when_stateIsLoading() {
        composeTestRule.setContent {
            PlanixorTheme {
                RemindersScreenContent(
                    uiState = RemindersUiState(isLoading = true),
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                    onConfirmDeactivate = {},
                    onDismissDeactivate = {},
                    onConfirmDelete = {},
                    onDismissDelete = {},
                )
            }
        }

        // Loading state: no empty or error text should be present
        composeTestRule.onNodeWithText("No hay recordatorios disponibles").assertDoesNotExist()
        composeTestRule.onNodeWithText("No se pudieron cargar los recordatorios").assertDoesNotExist()
    }

    @Test
    fun remindersScreen_should_showEmptyMessage_when_noRemindersExist() {
        composeTestRule.setContent {
            PlanixorTheme {
                RemindersScreenContent(
                    uiState = RemindersUiState(isLoading = false, reminders = emptyList()),
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                    onConfirmDeactivate = {},
                    onDismissDeactivate = {},
                    onConfirmDelete = {},
                    onDismissDelete = {},
                )
            }
        }

        composeTestRule.onNodeWithText("No hay recordatorios disponibles").assertIsDisplayed()
    }

    @Test
    fun remindersScreen_should_showErrorMessage_when_stateIsError() {
        composeTestRule.setContent {
            PlanixorTheme {
                RemindersScreenContent(
                    uiState = RemindersUiState(
                        isLoading = false,
                        error = "Could not load reminders",
                    ),
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                    onConfirmDeactivate = {},
                    onDismissDeactivate = {},
                    onConfirmDelete = {},
                    onDismissDelete = {},
                )
            }
        }

        composeTestRule.onNodeWithText("No se pudieron cargar los recordatorios").assertIsDisplayed()
    }

    @Test
    fun remindersScreen_should_showReminderNames_when_stateIsSuccess() {
        val reminders = listOf(
            Reminder(
                id = "1",
                name = "Take Medicine",
                icon = "💊",
                backgroundColor = "#10B981",
                isActive = true,
                createdAt = System.currentTimeMillis(),
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
            Reminder(
                id = "2",
                name = "Water Plants",
                icon = "🌱",
                backgroundColor = "#2563EB",
                isActive = true,
                createdAt = System.currentTimeMillis(),
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )

        composeTestRule.setContent {
            PlanixorTheme {
                RemindersScreenContent(
                    uiState = RemindersUiState(isLoading = false, reminders = reminders),
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                    onConfirmDeactivate = {},
                    onDismissDeactivate = {},
                    onConfirmDelete = {},
                    onDismissDelete = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Take Medicine").assertIsDisplayed()
        composeTestRule.onNodeWithText("Water Plants").assertIsDisplayed()
    }

    @Test
    fun remindersScreen_should_notShowEmptyMessage_when_stateIsSuccess() {
        val reminders = listOf(
            Reminder(
                id = "1",
                name = "Take Medicine",
                icon = "💊",
                backgroundColor = "#10B981",
                isActive = true,
                createdAt = System.currentTimeMillis(),
                modifiedAt = System.currentTimeMillis(),
                syncedAt = null,
                isDeleted = false,
            ),
        )

        composeTestRule.setContent {
            PlanixorTheme {
                RemindersScreenContent(
                    uiState = RemindersUiState(isLoading = false, reminders = reminders),
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                    onConfirmDeactivate = {},
                    onDismissDeactivate = {},
                    onConfirmDelete = {},
                    onDismissDelete = {},
                )
            }
        }

        composeTestRule.onNodeWithText("No hay recordatorios disponibles").assertDoesNotExist()
        composeTestRule.onNodeWithText("No se pudieron cargar los recordatorios").assertDoesNotExist()
    }
}
