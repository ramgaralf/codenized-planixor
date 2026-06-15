package com.codenized.planixor.ui.components

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.codenized.planixor.domain.model.Shift
import com.codenized.planixor.ui.theme.PlanixorTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

/**
 * Compose UI tests for the ShiftCard component.
 * Validates: Requirements 2.2, 4.4
 */
class ShiftCardTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val activeShift = Shift(
        id = "shift-1",
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
    )

    private val deactivatedShift = Shift(
        id = "shift-2",
        name = "Night Shift",
        icon = "🌙",
        backgroundColor = "#2563EB",
        startTime = 1320,
        endTime = 360,
        hoursWorked = 480,
        isActive = false,
        createdAt = System.currentTimeMillis(),
        modifiedAt = System.currentTimeMillis(),
        syncedAt = null,
        isDeleted = false,
    )

    @Test
    fun shiftCard_should_displayNameAndIcon_when_activeShiftProvided() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftCard(
                    shift = activeShift,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Morning Shift").assertIsDisplayed()
        composeTestRule.onNodeWithText("☀️").assertIsDisplayed()
    }

    @Test
    fun shiftCard_should_displayTimeRange_when_activeShiftProvided() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftCard(
                    shift = activeShift,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("08:00").assertIsDisplayed()
        composeTestRule.onNodeWithText("16:00").assertIsDisplayed()
        composeTestRule.onNodeWithText("8h 0m").assertIsDisplayed()
    }

    @Test
    fun shiftCard_should_displayDeactivatedBadge_when_shiftIsInactive() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftCard(
                    shift = deactivatedShift,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Desactivado").assertIsDisplayed()
    }

    @Test
    fun shiftCard_should_notDisplayDeactivatedBadge_when_shiftIsActive() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftCard(
                    shift = activeShift,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Desactivado").assertDoesNotExist()
    }

    @Test
    fun shiftCard_should_invokeEditCallback_when_editButtonClicked() {
        var clickedId = ""

        composeTestRule.setContent {
            PlanixorTheme {
                ShiftCard(
                    shift = activeShift,
                    onEditClick = { clickedId = it },
                    onToggleActiveClick = {},
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Editar turno").performClick()
        assertEquals("shift-1", clickedId)
    }

    @Test
    fun shiftCard_should_invokeToggleActiveCallback_when_toggleButtonClicked() {
        var clickedId = ""

        composeTestRule.setContent {
            PlanixorTheme {
                ShiftCard(
                    shift = activeShift,
                    onEditClick = {},
                    onToggleActiveClick = { clickedId = it },
                    onDeleteClick = {},
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Activar o desactivar turno").performClick()
        assertEquals("shift-1", clickedId)
    }

    @Test
    fun shiftCard_should_invokeDeleteCallback_when_deleteButtonClicked() {
        var clickedId = ""

        composeTestRule.setContent {
            PlanixorTheme {
                ShiftCard(
                    shift = activeShift,
                    onEditClick = {},
                    onToggleActiveClick = {},
                    onDeleteClick = { clickedId = it },
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Eliminar turno").performClick()
        assertEquals("shift-1", clickedId)
    }
}
