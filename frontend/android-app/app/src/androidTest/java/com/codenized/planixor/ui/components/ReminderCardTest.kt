package com.codenized.planixor.ui.components

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.codenized.planixor.domain.model.Reminder
import com.codenized.planixor.ui.theme.PlanixorTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

/**
 * Compose UI tests for the ReminderCard component.
 * Validates: Requirements 2.2, 4.4
 */
class ReminderCardTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val activeReminder = Reminder(
        id = "reminder-1",
        name = "Take Medicine",
        icon = "💊",
        backgroundColor = "#10B981",
        isActive = true,
        createdAt = System.currentTimeMillis(),
        modifiedAt = System.currentTimeMillis(),
        syncedAt = null,
        isDeleted = false,
    )

    private val deactivatedReminder = Reminder(
        id = "reminder-2",
        name = "Water Plants",
        icon = "🌱",
        backgroundColor = "#2563EB",
        isActive = false,
        createdAt = System.currentTimeMillis(),
        modifiedAt = System.currentTimeMillis(),
        syncedAt = null,
        isDeleted = false,
    )

    @Test
    fun reminderCard_should_displayNameAndIcon_when_activeReminderProvided() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderCard(
                    reminder = activeReminder,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Take Medicine").assertIsDisplayed()
        composeTestRule.onNodeWithText("💊").assertIsDisplayed()
    }

    @Test
    fun reminderCard_should_displayDeactivatedBadge_when_reminderIsInactive() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderCard(
                    reminder = deactivatedReminder,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Desactivado").assertIsDisplayed()
    }

    @Test
    fun reminderCard_should_notDisplayDeactivatedBadge_when_reminderIsActive() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderCard(
                    reminder = activeReminder,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Desactivado").assertDoesNotExist()
    }

    @Test
    fun reminderCard_should_invokeEditCallback_when_editButtonClicked() {
        var clickedId = ""

        composeTestRule.setContent {
            PlanixorTheme {
                ReminderCard(
                    reminder = activeReminder,
                    onEditClick = { clickedId = it },
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Editar recordatorio").performClick()
        assertEquals("reminder-1", clickedId)
    }

    @Test
    fun reminderCard_should_invokeToggleActiveCallback_when_toggleButtonClicked() {
        var clickedId = ""

        composeTestRule.setContent {
            PlanixorTheme {
                ReminderCard(
                    reminder = activeReminder,
                    onEditClick = {},
                    onToggleActiveClick = { clickedId = it },
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Activar o desactivar recordatorio").performClick()
        assertEquals("reminder-1", clickedId)
    }

    @Test
    fun reminderCard_should_invokeDeleteCallback_when_deleteButtonClicked() {
        var clickedId = ""

        composeTestRule.setContent {
            PlanixorTheme {
                ReminderCard(
                    reminder = activeReminder,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = { clickedId = it },
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Eliminar recordatorio").performClick()
        assertEquals("reminder-1", clickedId)
    }
}
