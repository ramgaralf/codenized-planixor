package com.codenized.planixor.ui.calendar

import app.cash.turbine.test
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.model.CalendarView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
    private lateinit var viewModel: CalendarViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeDataStore = FakeDataStore()
        preferencesRepository = PreferencesRepository(fakeDataStore)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): CalendarViewModel {
        return CalendarViewModel(preferencesRepository)
    }

    @Test
    fun `activeView should default to Week when no persisted value`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Week, awaitItem())
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
    fun `activeView should default to Week when persisted value is invalid`() = runTest {
        preferencesRepository.setActiveView("invalid_value")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Week, awaitItem())
        }
    }

    @Test
    fun `switchView should update activeView StateFlow`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Day)
        advanceUntilIdle()

        viewModel.activeView.test {
            assertEquals(CalendarView.Day, awaitItem())
        }
    }

    @Test
    fun `switchView should persist the new view`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.switchView(CalendarView.Month)
        advanceUntilIdle()

        // Verify the value was persisted by reading from the repository flow
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
}
