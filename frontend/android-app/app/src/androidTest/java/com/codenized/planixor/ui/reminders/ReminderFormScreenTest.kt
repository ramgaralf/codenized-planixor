package com.codenized.planixor.ui.reminders

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.codenized.planixor.ui.theme.PlanixorTheme
import org.junit.Rule
import org.junit.Test

/**
 * Compose UI tests for the ReminderFormScreen content composable.
 * Tests validation error display and form field rendering.
 * Validates: Requirements 2.2, 4.4
 */
class ReminderFormScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun reminderForm_should_showNameValidationError_when_nameErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderFormContent(
                    uiState = ReminderFormUiState(
                        nameError = "reminder.validation.name.required",
                    ),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("El nombre es obligatorio").assertIsDisplayed()
    }

    @Test
    fun reminderForm_should_showNameMaxLengthError_when_maxLengthErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderFormContent(
                    uiState = ReminderFormUiState(
                        nameError = "reminder.validation.name.maxLength",
                    ),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("El nombre debe tener 50 caracteres o menos").assertIsDisplayed()
    }

    @Test
    fun reminderForm_should_showIconValidationError_when_iconErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderFormContent(
                    uiState = ReminderFormUiState(
                        iconError = "reminder.validation.icon.required",
                    ),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Selecciona un ícono").assertIsDisplayed()
    }

    @Test
    fun reminderForm_should_showColorValidationError_when_colorErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderFormContent(
                    uiState = ReminderFormUiState(
                        backgroundColorError = "reminder.validation.color.required",
                    ),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Selecciona un color de fondo").assertIsDisplayed()
    }

    @Test
    fun reminderForm_should_showMultipleErrors_when_multipleErrorsInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderFormContent(
                    uiState = ReminderFormUiState(
                        nameError = "reminder.validation.name.required",
                        iconError = "reminder.validation.icon.required",
                        backgroundColorError = "reminder.validation.color.required",
                    ),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("El nombre es obligatorio").assertIsDisplayed()
        composeTestRule.onNodeWithText("Selecciona un ícono").assertIsDisplayed()
        composeTestRule.onNodeWithText("Selecciona un color de fondo").assertIsDisplayed()
    }

    @Test
    fun reminderForm_should_showNoErrors_when_noErrorsInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderFormContent(
                    uiState = ReminderFormUiState(),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("El nombre es obligatorio").assertDoesNotExist()
        composeTestRule.onNodeWithText("Selecciona un ícono").assertDoesNotExist()
        composeTestRule.onNodeWithText("Selecciona un color de fondo").assertDoesNotExist()
    }

    @Test
    fun reminderForm_should_displayFormFieldLabels_when_rendered() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderFormContent(
                    uiState = ReminderFormUiState(),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Nombre").assertIsDisplayed()
        composeTestRule.onNodeWithText("Ícono").assertIsDisplayed()
        composeTestRule.onNodeWithText("Color de fondo").assertIsDisplayed()
    }

    @Test
    fun reminderForm_should_displaySaveAndCancelButtons_when_rendered() {
        composeTestRule.setContent {
            PlanixorTheme {
                ReminderFormContent(
                    uiState = ReminderFormUiState(),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Guardar").assertIsDisplayed()
        composeTestRule.onNodeWithText("Cancelar").assertIsDisplayed()
    }
}
