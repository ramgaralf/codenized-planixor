package com.codenized.planixor.ui.shifts

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.codenized.planixor.ui.theme.PlanixorTheme
import org.junit.Rule
import org.junit.Test

/**
 * Compose UI tests for the ShiftFormScreen content composable.
 * Tests validation error display and form field rendering.
 * Validates: Requirements 2.5, 4.4
 */
class ShiftFormScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun shiftForm_should_showNameValidationError_when_nameErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(
                        errors = mapOf("name" to "shift.validation.name.required"),
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
    fun shiftForm_should_showNameMaxLengthError_when_maxLengthErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(
                        errors = mapOf("name" to "shift.validation.name.maxLength"),
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
    fun shiftForm_should_showIconValidationError_when_iconErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(
                        errors = mapOf("icon" to "shift.validation.icon.required"),
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
    fun shiftForm_should_showColorValidationError_when_colorErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(
                        errors = mapOf("backgroundColor" to "shift.validation.color.required"),
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
    fun shiftForm_should_showStartTimeError_when_startTimeErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(
                        errors = mapOf("startTime" to "shift.validation.startTime.required"),
                    ),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("La hora de inicio es obligatoria").assertIsDisplayed()
    }

    @Test
    fun shiftForm_should_showEndTimeError_when_endTimeErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(
                        errors = mapOf("endTime" to "shift.validation.endTime.required"),
                    ),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("La hora de fin es obligatoria").assertIsDisplayed()
    }

    @Test
    fun shiftForm_should_showHoursWorkedError_when_hoursWorkedErrorInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(
                        errors = mapOf("hoursWorked" to "shift.validation.hoursWorked.range"),
                    ),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Las horas trabajadas deben estar entre 1 minuto y 24 horas")
            .assertIsDisplayed()
    }

    @Test
    fun shiftForm_should_showMultipleErrors_when_multipleErrorsInState() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(
                        errors = mapOf(
                            "name" to "shift.validation.name.required",
                            "icon" to "shift.validation.icon.required",
                            "backgroundColor" to "shift.validation.color.required",
                        ),
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
    fun shiftForm_should_showNoErrors_when_errorsMapIsEmpty() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(errors = emptyMap()),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("El nombre es obligatorio").assertDoesNotExist()
        composeTestRule.onNodeWithText("Selecciona un ícono").assertDoesNotExist()
        composeTestRule.onNodeWithText("Selecciona un color de fondo").assertDoesNotExist()
        composeTestRule.onNodeWithText("La hora de inicio es obligatoria").assertDoesNotExist()
        composeTestRule.onNodeWithText("La hora de fin es obligatoria").assertDoesNotExist()
        composeTestRule.onNodeWithText("Las horas trabajadas deben estar entre 1 minuto y 24 horas")
            .assertDoesNotExist()
    }

    @Test
    fun shiftForm_should_displayFormFieldLabels_when_rendered() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(),
                    onFieldChange = { _, _ -> },
                    onSubmit = {},
                    onCancel = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Nombre").assertIsDisplayed()
        composeTestRule.onNodeWithText("Ícono").assertIsDisplayed()
        composeTestRule.onNodeWithText("Color de fondo").assertIsDisplayed()
        composeTestRule.onNodeWithText("Hora de inicio").assertIsDisplayed()
        composeTestRule.onNodeWithText("Hora de fin").assertIsDisplayed()
        composeTestRule.onNodeWithText("Horas trabajadas").assertIsDisplayed()
    }

    @Test
    fun shiftForm_should_displaySaveAndCancelButtons_when_rendered() {
        composeTestRule.setContent {
            PlanixorTheme {
                ShiftFormContent(
                    uiState = ShiftFormUiState(),
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
