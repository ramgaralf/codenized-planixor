package com.codenized.planixor.ui.reminders

import androidx.lifecycle.SavedStateHandle
import app.cash.turbine.test
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ReminderEntity
import com.codenized.planixor.data.local.ReminderRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ReminderFormViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var reminderDao: ReminderDao
    private lateinit var reminderRepository: ReminderRepository

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        reminderDao = mockk(relaxed = true)
        reminderRepository = ReminderRepository(reminderDao)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(reminderId: String? = null): ReminderFormViewModel {
        val savedStateHandle = SavedStateHandle().apply {
            if (reminderId != null) set("reminderId", reminderId)
        }
        val calendarEventDao = mockk<com.codenized.planixor.data.local.CalendarEventDao>(relaxed = true)
        coEvery { calendarEventDao.getAll() } returns emptyList()
        return ReminderFormViewModel(reminderRepository, calendarEventDao, savedStateHandle)
    }

    private fun createReminderEntity(
        id: String = "reminder-1",
        name: String = "Take Medicine",
        icon: String = "💊",
        backgroundColor: String = "#EF4444",
        isActive: Boolean = true,
        createdAt: Long = 1000L,
        modifiedAt: Long = 2000L,
        syncedAt: Long? = null,
        isDeleted: Boolean = false,
    ): ReminderEntity = ReminderEntity(
        id = id,
        name = name,
        icon = icon,
        backgroundColor = backgroundColor,
        isActive = isActive,
        createdAt = createdAt,
        modifiedAt = modifiedAt,
        syncedAt = syncedAt,
        isDeleted = isDeleted,
    )

    // --- Create mode ---

    @Test
    fun `initial state should be Create mode with empty fields`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(ReminderFormMode.Create, state.mode)
        assertEquals("", state.name)
        assertEquals("", state.icon)
        assertEquals("", state.backgroundColor)
        assertNull(state.nameError)
        assertNull(state.iconError)
        assertNull(state.backgroundColorError)
        assertFalse(state.isValid)
        assertFalse(state.isSaving)
        assertNull(state.saveError)
        assertFalse(state.isLoading)
    }

    // --- Edit mode: pre-population ---

    @Test
    fun `should enter Edit mode and pre-populate fields when reminderId is present`() = runTest {
        val reminderId = "test-reminder-id"
        val entity = createReminderEntity(
            id = reminderId,
            name = "Water Plants",
            icon = "🌱",
            backgroundColor = "#10B981",
        )
        coEvery { reminderDao.getById(reminderId) } returns entity

        val viewModel = createViewModel(reminderId)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(ReminderFormMode.Edit(reminderId), state.mode)
        assertEquals("Water Plants", state.name)
        assertEquals("🌱", state.icon)
        assertEquals("#10B981", state.backgroundColor)
        assertFalse(state.isLoading)
        assertTrue(state.isValid)
    }

    @Test
    fun `should stop loading when reminder not found in edit mode`() = runTest {
        coEvery { reminderDao.getById("nonexistent") } returns null

        val viewModel = createViewModel("nonexistent")
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isLoading)
        assertTrue(viewModel.uiState.value.shouldNavigateBack)
    }

    @Test
    fun `should stop loading when reminder is deleted in edit mode`() = runTest {
        val entity = createReminderEntity(id = "deleted-one", isDeleted = true)
        coEvery { reminderDao.getById("deleted-one") } returns entity

        val viewModel = createViewModel("deleted-one")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertTrue(state.shouldNavigateBack)
        // Fields remain empty — deleted reminder is not loaded
        assertEquals("", state.name)
    }

    // --- Validation trigger timing ---

    @Test
    fun `should not show errors before first submit attempt`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "Test")

        // No errors shown before submit attempt (Requirement 9.6)
        assertNull(viewModel.uiState.value.nameError)
        assertNull(viewModel.uiState.value.iconError)
        assertNull(viewModel.uiState.value.backgroundColorError)
        assertTrue(viewModel.uiState.value.fieldErrors.isEmpty())
        assertFalse(viewModel.uiState.value.hasAttemptedSubmit)
    }

    @Test
    fun `should not trigger validation before submit even after time passes`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "Test")

        // Advance time — no validation fires without submit
        advanceTimeBy(2000)

        // No errors
        assertNull(viewModel.uiState.value.iconError)
        assertNull(viewModel.uiState.value.backgroundColorError)
    }

    @Test
    fun `should show errors only after submit attempt`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "Test")

        // Submit with icon and color missing
        viewModel.onSubmit {}
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.hasAttemptedSubmit)
        assertTrue(viewModel.uiState.value.fieldErrors.isNotEmpty())
        assertNotNull(viewModel.uiState.value.iconError)
        assertNotNull(viewModel.uiState.value.backgroundColorError)
        assertNull(viewModel.uiState.value.nameError)
    }

    @Test
    fun `should clear validation errors when fields become valid after submit`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        // Trigger validation via submit with missing fields
        viewModel.onFieldChange("name", "Test")
        viewModel.onSubmit {}
        advanceUntilIdle()

        // Errors should be present for icon and color
        assertNotNull(viewModel.uiState.value.iconError)
        assertNotNull(viewModel.uiState.value.backgroundColorError)

        // Fill all fields validly — errors clear immediately
        viewModel.onFieldChange("icon", "💊")
        viewModel.onFieldChange("backgroundColor", "#EF4444")

        // All errors should be cleared immediately (no debounce needed)
        assertNull(viewModel.uiState.value.nameError)
        assertNull(viewModel.uiState.value.iconError)
        assertNull(viewModel.uiState.value.backgroundColorError)
        assertTrue(viewModel.uiState.value.fieldErrors.isEmpty())
    }

    // --- Field changes ---

    @Test
    fun `onFieldChange should update name field`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "Morning Reminder")

        assertEquals("Morning Reminder", viewModel.uiState.value.name)
    }

    @Test
    fun `onFieldChange should update icon field`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("icon", "🌙")

        assertEquals("🌙", viewModel.uiState.value.icon)
    }

    @Test
    fun `onFieldChange should update backgroundColor field`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("backgroundColor", "#2563EB")

        assertEquals("#2563EB", viewModel.uiState.value.backgroundColor)
    }

    // --- Submit ---

    @Test
    fun `onSubmit should validate and show errors when form is invalid`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        var successCalled = false
        viewModel.onSubmit { successCalled = true }
        advanceUntilIdle()

        assertFalse(successCalled)
        assertFalse(viewModel.uiState.value.isValid)
        assertEquals("reminder.validation.name.required", viewModel.uiState.value.nameError)
        assertEquals("reminder.validation.icon.required", viewModel.uiState.value.iconError)
        assertEquals("reminder.validation.color.required", viewModel.uiState.value.backgroundColorError)
    }

    @Test
    fun `onSubmit should create reminder when form is valid in Create mode`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "Take Medicine")
        viewModel.onFieldChange("icon", "💊")
        viewModel.onFieldChange("backgroundColor", "#EF4444")

        var successCalled = false
        viewModel.onSubmit { successCalled = true }
        advanceUntilIdle()

        assertTrue(successCalled)
        assertFalse(viewModel.uiState.value.isSaving)
        coVerify {
            reminderDao.upsert(match { entity ->
                entity.name == "Take Medicine" &&
                    entity.icon == "💊" &&
                    entity.backgroundColor == "#EF4444" &&
                    entity.isActive &&
                    !entity.isDeleted &&
                    entity.syncedAt == null
            })
        }
    }

    @Test
    fun `onSubmit should update reminder when form is valid in Edit mode`() = runTest {
        val reminderId = "edit-reminder-id"
        val entity = createReminderEntity(
            id = reminderId,
            name = "Old Name",
            icon = "💊",
            backgroundColor = "#EF4444",
        )
        coEvery { reminderDao.getById(reminderId) } returns entity

        val viewModel = createViewModel(reminderId)
        advanceUntilIdle()

        // Modify name
        viewModel.onFieldChange("name", "Updated Name")

        var successCalled = false
        viewModel.onSubmit { successCalled = true }
        advanceUntilIdle()

        assertTrue(successCalled)
        coVerify {
            reminderDao.upsert(match { it.name == "Updated Name" && it.id == reminderId })
        }
    }

    @Test
    fun `onSubmit should set saveError when repository throws`() = runTest {
        val viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "Test Reminder")
        viewModel.onFieldChange("icon", "💊")
        viewModel.onFieldChange("backgroundColor", "#EF4444")

        coEvery { reminderDao.upsert(any()) } throws RuntimeException("Write failed")

        var successCalled = false
        viewModel.onSubmit { successCalled = true }
        advanceUntilIdle()

        assertFalse(successCalled)
        assertFalse(viewModel.uiState.value.isSaving)
        assertEquals("Write failed", viewModel.uiState.value.saveError)
    }

    @Test
    fun `onSubmit should reject edit and signal navigate back when reminder is deleted`() = runTest {
        val reminderId = "edit-deleted-id"
        val activeEntity = createReminderEntity(
            id = reminderId,
            name = "Original Name",
            icon = "💊",
            backgroundColor = "#EF4444",
            isDeleted = false,
        )

        // First getById call during load returns active entity
        coEvery { reminderDao.getById(reminderId) } returns activeEntity

        val viewModel = createViewModel(reminderId)
        advanceUntilIdle()

        // Verify form is populated
        assertEquals("Original Name", viewModel.uiState.value.name)

        // Simulate reminder being deleted between load and submit
        val deletedEntity = activeEntity.copy(isDeleted = true)
        coEvery { reminderDao.getById(reminderId) } returns deletedEntity

        var successCalled = false
        viewModel.onSubmit { successCalled = true }
        advanceUntilIdle()

        assertFalse(successCalled)
        assertTrue(viewModel.uiState.value.shouldNavigateBack)
        assertFalse(viewModel.uiState.value.isSaving)
    }
}
