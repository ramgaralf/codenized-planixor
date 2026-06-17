package com.codenized.planixor.ui.calendar

import app.cash.turbine.test
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ReminderRepository
import com.codenized.planixor.data.local.ShiftRepository
import com.codenized.planixor.model.CalendarView
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

@OptIn(ExperimentalCoroutinesApi::class)
class CalendarViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeDataStore: FakeDataStore
    private lateinit var preferencesRepository: PreferencesRepository
    private lateinit var shiftRepository: ShiftRepository
    private lateinit var reminderRepository: ReminderRepository
    private lateinit var viewModel: CalendarViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeDataStore = FakeDataStore()
        preferencesRepository = PreferencesRepository(fakeDataStore)
        shiftRepository = mockk(relaxed = true)
        reminderRepository = mockk(relaxed = true)

        coEvery { shiftRepository.getAllActive() } returns flowOf(emptyList())
        coEvery { reminderRepository.getActiveForCalendarSelection() } returns flowOf(emptyList())
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): CalendarViewModel {
        return CalendarViewModel(preferencesRepository, shiftRepository, reminderRepository)
    }

    @Test
    fun `activeView should default to Day when no persisted value`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Day, awaitItem())
        }
    }

    @Test
    fun `activeView should restore persisted value on init`() = runTest {
        preferencesRepository.setActiveView("month")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Month, awaitItem())
        }
    }

    @Test
    fun `activeView should default to Day when persisted value is invalid`() = runTest {
        preferencesRepository.setActiveView("invalid_value")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Day, awaitItem())
        }
    }

    @Test
    fun `switchView should update activeView StateFlow`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Week)
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Week, awaitItem())
        }
    }

    @Test
    fun `switchView should persist the new view`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Month)
        advanceUntilIdle()

        preferencesRepository.activeViewFlow.test {
            assertEquals("month", awaitItem())
        }
    }

    @Test
    fun `navigateForward should add 1 day when activeView is Day`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Day)
        val dateBefore = viewModel.currentDate.value
        viewModel.navigateForward()

        assertEquals(dateBefore.plusDays(1), viewModel.currentDate.value)
    }

    @Test
    fun `navigateForward should add 1 week when activeView is Week`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Week)
        val dateBefore = viewModel.currentDate.value
        viewModel.navigateForward()

        assertEquals(dateBefore.plusWeeks(1), viewModel.currentDate.value)
    }

    @Test
    fun `navigateForward should add 1 month when activeView is Month`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Month)
        val dateBefore = viewModel.currentDate.value
        viewModel.navigateForward()

        assertEquals(dateBefore.plusMonths(1), viewModel.currentDate.value)
    }

    @Test
    fun `navigateForward should add 1 year when activeView is Year`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Year)
        val dateBefore = viewModel.currentDate.value
        viewModel.navigateForward()

        assertEquals(dateBefore.plusYears(1), viewModel.currentDate.value)
    }

    @Test
    fun `navigateBackward should subtract 1 day when activeView is Day`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Day)
        val dateBefore = viewModel.currentDate.value
        viewModel.navigateBackward()

        assertEquals(dateBefore.minusDays(1), viewModel.currentDate.value)
    }

    @Test
    fun `navigateBackward should subtract 1 week when activeView is Week`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Week)
        val dateBefore = viewModel.currentDate.value
        viewModel.navigateBackward()

        assertEquals(dateBefore.minusWeeks(1), viewModel.currentDate.value)
    }

    @Test
    fun `navigateBackward should subtract 1 month when activeView is Month`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Month)
        val dateBefore = viewModel.currentDate.value
        viewModel.navigateBackward()

        assertEquals(dateBefore.minusMonths(1), viewModel.currentDate.value)
    }

    @Test
    fun `navigateBackward should subtract 1 year when activeView is Year`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Year)
        val dateBefore = viewModel.currentDate.value
        viewModel.navigateBackward()

        assertEquals(dateBefore.minusYears(1), viewModel.currentDate.value)
    }

    @Test
    fun `goToToday should reset currentDate to today`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.navigateForward()
        viewModel.navigateForward()
        viewModel.goToToday()

        assertEquals(LocalDate.now(), viewModel.currentDate.value)
    }

    @Test
    fun `activeView should restore Day from persisted value`() = runTest {
        preferencesRepository.setActiveView("day")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Day, awaitItem())
        }
    }

    @Test
    fun `activeView should restore Year from persisted value`() = runTest {
        preferencesRepository.setActiveView("year")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Year, awaitItem())
        }
    }

    // --- Form state: conditional time editability ---

    @Test
    fun `initCreateForm should set startDay and endDay to pre-selected day`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Day)
        advanceUntilIdle()

        viewModel.initCreateForm()
        advanceUntilIdle()

        val formState = viewModel.formState.value
        assertEquals(viewModel.currentDate.value, formState.startDay)
        assertEquals(viewModel.currentDate.value, formState.endDay)
    }

    @Test
    fun `form should have isTimeEditable false after selecting a shift`() = runTest {
        val mockShift = com.codenized.planixor.domain.model.Shift(
            id = "shift-1",
            name = "Morning",
            icon = "☀️",
            backgroundColor = "#10B981",
            startTime = 480,
            endTime = 1020,
            hoursWorked = 540,
            isActive = true,
            createdAt = System.currentTimeMillis(),
            isDeleted = false,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
        )
        coEvery { shiftRepository.getById("shift-1") } returns mockShift

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.initCreateForm()
        advanceUntilIdle()

        viewModel.selectEventType("shift", "shift-1")
        advanceUntilIdle()

        val formState = viewModel.formState.value
        assertEquals(false, formState.isTimeEditable)
        assertEquals(540, formState.totalHours)
    }

    @Test
    fun `form should have isTimeEditable true after selecting a reminder`() = runTest {
        val mockReminder = com.codenized.planixor.domain.model.Reminder(
            id = "reminder-1",
            name = "Meeting",
            icon = "📝",
            backgroundColor = "#2563EB",
            isActive = true,
            createdAt = System.currentTimeMillis(),
            isDeleted = false,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
        )
        coEvery { reminderRepository.getById("reminder-1") } returns mockReminder

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.initCreateForm()
        advanceUntilIdle()

        viewModel.selectEventType("reminder", "reminder-1")
        advanceUntilIdle()

        val formState = viewModel.formState.value
        assertEquals(true, formState.isTimeEditable)
    }

    @Test
    fun `form should auto-compute endDay for crossing midnight shift`() = runTest {
        val mockShift = com.codenized.planixor.domain.model.Shift(
            id = "shift-night",
            name = "Night",
            icon = "🌙",
            backgroundColor = "#2563EB",
            startTime = 1320,
            endTime = 360,
            hoursWorked = 480,
            isActive = true,
            createdAt = System.currentTimeMillis(),
            isDeleted = false,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
        )
        coEvery { shiftRepository.getById("shift-night") } returns mockShift

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.initCreateForm()
        advanceUntilIdle()

        viewModel.selectEventType("shift", "shift-night")
        advanceUntilIdle()

        val formState = viewModel.formState.value
        val expectedEndDay = formState.startDay?.plusDays(1)
        assertEquals(expectedEndDay, formState.endDay)
        assertEquals(480, formState.totalHours)
    }

    @Test
    fun `onStartTimeSelected should recalculate totalHours for reminder`() = runTest {
        val mockReminder = com.codenized.planixor.domain.model.Reminder(
            id = "reminder-1",
            name = "Meeting",
            icon = "📝",
            backgroundColor = "#2563EB",
            isActive = true,
            createdAt = System.currentTimeMillis(),
            isDeleted = false,
            modifiedAt = System.currentTimeMillis(),
            syncedAt = null,
        )
        coEvery { reminderRepository.getById("reminder-1") } returns mockReminder

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.initCreateForm()
        advanceUntilIdle()

        viewModel.selectEventType("reminder", "reminder-1")
        advanceUntilIdle()

        // Set time range: 8:00 - 17:00 = 9 hours = 540 minutes
        viewModel.onStartTimeSelected(8, 0)
        viewModel.onEndTimeSelected(17, 0)
        advanceUntilIdle()

        val formState = viewModel.formState.value
        assertEquals(540, formState.totalHours)
    }
}
