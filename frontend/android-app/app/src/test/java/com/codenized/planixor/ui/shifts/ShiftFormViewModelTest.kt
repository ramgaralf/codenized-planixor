package com.codenized.planixor.ui.shifts

import androidx.lifecycle.SavedStateHandle
import app.cash.turbine.test
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftEntity
import com.codenized.planixor.data.local.ShiftRepository
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ShiftFormViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var shiftDao: ShiftDao
    private lateinit var shiftRepository: ShiftRepository
    private lateinit var viewModel: ShiftFormViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        shiftDao = mockk(relaxed = true)
        shiftRepository = ShiftRepository(shiftDao)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(shiftId: String? = null): ShiftFormViewModel {
        val savedStateHandle = SavedStateHandle().apply {
            if (shiftId != null) set("shiftId", shiftId)
        }
        return ShiftFormViewModel(shiftRepository, savedStateHandle)
    }

    @Test
    fun `initial state should be Create mode with empty fields`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(ShiftFormMode.Create, state.mode)
        assertEquals("", state.name)
        assertEquals("", state.icon)
        assertEquals("", state.backgroundColor)
        assertNull(state.startTimeHours)
        assertNull(state.startTimeMinutes)
        assertNull(state.endTimeHours)
        assertNull(state.endTimeMinutes)
        assertNull(state.hoursWorked)
        assertFalse(state.isSubmitting)
        assertFalse(state.isLoading)
        assertTrue(state.errors.isEmpty())
    }

    @Test
    fun `should enter Edit mode when shiftId is present`() = runTest {
        val shiftId = "test-shift-id"
        val entity = ShiftEntity(
            id = shiftId,
            name = "Morning",
            icon = "☀️",
            backgroundColor = "#EF4444",
            startTime = 480, // 8:00
            endTime = 960,   // 16:00
            hoursWorked = 480,
            isActive = true,
            createdAt = 1000L,
            modifiedAt = 2000L,
            syncedAt = null,
            isDeleted = false,
        )
        coEvery { shiftDao.getById(shiftId) } returns entity

        viewModel = createViewModel(shiftId)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(ShiftFormMode.Edit(shiftId), state.mode)
        assertEquals("Morning", state.name)
        assertEquals("☀️", state.icon)
        assertEquals("#EF4444", state.backgroundColor)
        assertEquals(8, state.startTimeHours)
        assertEquals(0, state.startTimeMinutes)
        assertEquals(16, state.endTimeHours)
        assertEquals(0, state.endTimeMinutes)
        assertEquals(480, state.hoursWorked)
        assertFalse(state.isLoading)
    }

    @Test
    fun `should stop loading when shift not found in edit mode`() = runTest {
        coEvery { shiftDao.getById("nonexistent") } returns null

        viewModel = createViewModel("nonexistent")
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun `onFieldChange should update name field`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "Night Shift")

        assertEquals("Night Shift", viewModel.uiState.value.name)
    }

    @Test
    fun `onFieldChange should update icon field`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("icon", "🌙")

        assertEquals("🌙", viewModel.uiState.value.icon)
    }

    @Test
    fun `onFieldChange should update backgroundColor field`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("backgroundColor", "#2563EB")

        assertEquals("#2563EB", viewModel.uiState.value.backgroundColor)
    }

    @Test
    fun `should auto-calculate hoursWorked when both times are set`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("startTimeHours", "8")
        viewModel.onFieldChange("startTimeMinutes", "0")
        viewModel.onFieldChange("endTimeHours", "16")
        viewModel.onFieldChange("endTimeMinutes", "0")

        // 16:00 - 8:00 = 480 minutes
        assertEquals(480, viewModel.uiState.value.hoursWorked)
    }

    @Test
    fun `should handle midnight crossing in hoursWorked calculation`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("startTimeHours", "22")
        viewModel.onFieldChange("startTimeMinutes", "0")
        viewModel.onFieldChange("endTimeHours", "6")
        viewModel.onFieldChange("endTimeMinutes", "0")

        // (6*60 - 22*60 + 1440) % 1440 = (360 - 1320 + 1440) % 1440 = 480
        assertEquals(480, viewModel.uiState.value.hoursWorked)
    }

    @Test
    fun `should compute 1440 when start equals end`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("startTimeHours", "9")
        viewModel.onFieldChange("startTimeMinutes", "30")
        viewModel.onFieldChange("endTimeHours", "9")
        viewModel.onFieldChange("endTimeMinutes", "30")

        assertEquals(1440, viewModel.uiState.value.hoursWorked)
    }

    @Test
    fun `should allow manual override of hoursWorked`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("startTimeHours", "8")
        viewModel.onFieldChange("startTimeMinutes", "0")
        viewModel.onFieldChange("endTimeHours", "16")
        viewModel.onFieldChange("endTimeMinutes", "0")

        // Manually override
        viewModel.onFieldChange("hoursWorked", "420")

        assertEquals(420, viewModel.uiState.value.hoursWorked)
    }

    @Test
    fun `should recalculate hoursWorked after manual override when time changes`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        // Set times
        viewModel.onFieldChange("startTimeHours", "8")
        viewModel.onFieldChange("startTimeMinutes", "0")
        viewModel.onFieldChange("endTimeHours", "16")
        viewModel.onFieldChange("endTimeMinutes", "0")

        // Manual override
        viewModel.onFieldChange("hoursWorked", "420")
        assertEquals(420, viewModel.uiState.value.hoursWorked)

        // Change time → recalculate, discard override (Property 11)
        viewModel.onFieldChange("endTimeHours", "17")

        // 17:00 - 8:00 = 540 minutes
        assertEquals(540, viewModel.uiState.value.hoursWorked)
    }

    @Test
    fun `should clear hoursWorked when a time field is cleared`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        // Set all times
        viewModel.onFieldChange("startTimeHours", "8")
        viewModel.onFieldChange("startTimeMinutes", "0")
        viewModel.onFieldChange("endTimeHours", "16")
        viewModel.onFieldChange("endTimeMinutes", "0")
        assertEquals(480, viewModel.uiState.value.hoursWorked)

        // Clear start time hours (Requirement 9.5)
        viewModel.onFieldChange("startTimeHours", "")

        assertNull(viewModel.uiState.value.hoursWorked)
    }

    @Test
    fun `should trigger debounced validation after field change`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "A")

        // Before debounce: no validation triggered yet (errors empty from initial state)
        assertTrue(viewModel.uiState.value.errors.isEmpty())

        // Advance past debounce period
        advanceTimeBy(1100)

        // Validation should have run — other required fields are empty so errors should exist
        assertTrue(viewModel.uiState.value.errors.isNotEmpty())
    }

    @Test
    fun `should not trigger validation before debounce period elapses`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "A")

        // Advance less than debounce (900ms < 1000ms)
        advanceTimeBy(900)

        // Validation should NOT have triggered yet
        assertTrue(viewModel.uiState.value.errors.isEmpty())
    }

    @Test
    fun `should reset debounce timer on consecutive field changes`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("name", "A")
        advanceTimeBy(800)

        // Another change resets the timer
        viewModel.onFieldChange("name", "AB")
        advanceTimeBy(800)

        // Total 1600ms elapsed but validation should NOT have run
        // because the second change reset the 1000ms timer at 800ms
        assertTrue(viewModel.uiState.value.errors.isEmpty())

        // Advance remaining time to complete the debounce from second change
        advanceTimeBy(300)

        // Now validation should have fired (800ms + 300ms = 1100ms from second change)
        assertTrue(viewModel.uiState.value.errors.isNotEmpty())
    }

    @Test
    fun `onSubmit should validate and show errors when form is invalid`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        var successCalled = false
        viewModel.onSubmit { successCalled = true }
        advanceUntilIdle()

        assertFalse(successCalled)
        assertTrue(viewModel.uiState.value.errors.isNotEmpty())
        assertFalse(viewModel.uiState.value.isSubmitting)
    }

    @Test
    fun `onSubmit should create shift when form is valid in Create mode`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        // Fill all required fields with valid data
        viewModel.onFieldChange("name", "Morning")
        viewModel.onFieldChange("icon", "☀️")
        viewModel.onFieldChange("backgroundColor", "#EF4444")
        viewModel.onFieldChange("startTimeHours", "8")
        viewModel.onFieldChange("startTimeMinutes", "0")
        viewModel.onFieldChange("endTimeHours", "16")
        viewModel.onFieldChange("endTimeMinutes", "0")

        var successCalled = false
        viewModel.onSubmit { successCalled = true }
        advanceUntilIdle()

        assertTrue(successCalled)
        assertFalse(viewModel.uiState.value.isSubmitting)
        coVerify {
            shiftDao.upsert(match { entity ->
                entity.name == "Morning" &&
                    entity.icon == "☀️" &&
                    entity.backgroundColor == "#EF4444" &&
                    entity.startTime == 480 &&
                    entity.endTime == 960 &&
                    entity.hoursWorked == 480
            })
        }
    }

    @Test
    fun `onSubmit should update shift when form is valid in Edit mode`() = runTest {
        val shiftId = "edit-shift-id"
        val entity = ShiftEntity(
            id = shiftId,
            name = "Old Name",
            icon = "☀️",
            backgroundColor = "#EF4444",
            startTime = 480,
            endTime = 960,
            hoursWorked = 480,
            isActive = true,
            createdAt = 1000L,
            modifiedAt = 2000L,
            syncedAt = null,
            isDeleted = false,
        )
        coEvery { shiftDao.getById(shiftId) } returns entity

        viewModel = createViewModel(shiftId)
        advanceUntilIdle()

        // Modify name
        viewModel.onFieldChange("name", "Updated Name")

        var successCalled = false
        viewModel.onSubmit { successCalled = true }
        advanceUntilIdle()

        assertTrue(successCalled)
        coVerify {
            shiftDao.upsert(match { it.name == "Updated Name" && it.id == shiftId })
        }
    }

    @Test
    fun `should not show hoursWorked when only start time is set`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFieldChange("startTimeHours", "8")
        viewModel.onFieldChange("startTimeMinutes", "0")

        assertNull(viewModel.uiState.value.hoursWorked)
    }

    @Test
    fun `should clear hoursWorked after manual override when time is cleared`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        // Set times and override
        viewModel.onFieldChange("startTimeHours", "8")
        viewModel.onFieldChange("startTimeMinutes", "0")
        viewModel.onFieldChange("endTimeHours", "16")
        viewModel.onFieldChange("endTimeMinutes", "0")
        viewModel.onFieldChange("hoursWorked", "420")

        // Clear end time
        viewModel.onFieldChange("endTimeHours", "")

        assertNull(viewModel.uiState.value.hoursWorked)
    }
}
