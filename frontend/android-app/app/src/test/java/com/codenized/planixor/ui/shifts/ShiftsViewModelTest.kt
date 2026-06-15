package com.codenized.planixor.ui.shifts

import app.cash.turbine.test
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftEntity
import com.codenized.planixor.data.local.ShiftRepository
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ShiftsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var shiftDao: ShiftDao

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createShiftEntity(
        id: String = "shift-1",
        name: String = "Morning",
        icon: String = "☀️",
        backgroundColor: String = "#EF4444",
        startTime: Int = 480,
        endTime: Int = 960,
        hoursWorked: Int = 480,
        isActive: Boolean = true,
        createdAt: Long = 1000L,
        modifiedAt: Long = 2000L,
    ): ShiftEntity = ShiftEntity(
        id = id,
        name = name,
        icon = icon,
        backgroundColor = backgroundColor,
        startTime = startTime,
        endTime = endTime,
        hoursWorked = hoursWorked,
        isActive = isActive,
        createdAt = createdAt,
        modifiedAt = modifiedAt,
        syncedAt = null,
        isDeleted = false,
    )

    @Test
    fun `initial state should be Loading`() = runTest {
        shiftDao = mockk(relaxed = true)
        every { shiftDao.getAllActive() } returns flow {
            // Never emit — keep the ViewModel in Loading state
            kotlinx.coroutines.awaitCancellation()
        }
        val repository = ShiftRepository(shiftDao)
        val viewModel = ShiftsViewModel(repository)

        assertEquals(ShiftsUiState.Loading, viewModel.uiState.value)
    }

    @Test
    fun `should transition from Loading to Success when flow emits non-empty list`() = runTest {
        shiftDao = mockk(relaxed = true)
        val entities = listOf(
            createShiftEntity(id = "1", name = "Morning"),
            createShiftEntity(id = "2", name = "Night"),
        )
        every { shiftDao.getAllActive() } returns flowOf(entities)

        val repository = ShiftRepository(shiftDao)
        val viewModel = ShiftsViewModel(repository)

        viewModel.uiState.test {
            // Initial emission is Loading
            assertEquals(ShiftsUiState.Loading, awaitItem())

            // After flow emits data → Success
            val successState = awaitItem()
            assertTrue(successState is ShiftsUiState.Success)
            val shifts = (successState as ShiftsUiState.Success).shifts
            assertEquals(2, shifts.size)
            assertEquals("Morning", shifts[0].name)
            assertEquals("Night", shifts[1].name)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `should transition from Loading to Empty when flow emits empty list`() = runTest {
        shiftDao = mockk(relaxed = true)
        every { shiftDao.getAllActive() } returns flowOf(emptyList())

        val repository = ShiftRepository(shiftDao)
        val viewModel = ShiftsViewModel(repository)

        viewModel.uiState.test {
            // Initial emission is Loading
            assertEquals(ShiftsUiState.Loading, awaitItem())

            // After flow emits empty list → Empty
            assertEquals(ShiftsUiState.Empty, awaitItem())

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `should transition from Loading to Error when flow throws exception`() = runTest {
        shiftDao = mockk(relaxed = true)
        every { shiftDao.getAllActive() } returns flow {
            throw RuntimeException("Database read failed")
        }

        val repository = ShiftRepository(shiftDao)
        val viewModel = ShiftsViewModel(repository)

        viewModel.uiState.test {
            // Initial emission is Loading
            assertEquals(ShiftsUiState.Loading, awaitItem())

            // After flow throws → Error
            val errorState = awaitItem()
            assertTrue(errorState is ShiftsUiState.Error)
            assertEquals("Database read failed", (errorState as ShiftsUiState.Error).message)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `should use default error message when exception has no message`() = runTest {
        shiftDao = mockk(relaxed = true)
        every { shiftDao.getAllActive() } returns flow {
            throw RuntimeException()
        }

        val repository = ShiftRepository(shiftDao)
        val viewModel = ShiftsViewModel(repository)

        viewModel.uiState.test {
            assertEquals(ShiftsUiState.Loading, awaitItem())

            val errorState = awaitItem()
            assertTrue(errorState is ShiftsUiState.Error)
            assertEquals("Could not load shifts", (errorState as ShiftsUiState.Error).message)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `Success state should contain correct shift data`() = runTest {
        shiftDao = mockk(relaxed = true)
        val entities = listOf(
            createShiftEntity(
                id = "abc-123",
                name = "Evening",
                icon = "🌙",
                backgroundColor = "#7C3AED",
                startTime = 1020,
                endTime = 1380,
                hoursWorked = 360,
                isActive = true,
                createdAt = 5000L,
                modifiedAt = 6000L,
            ),
        )
        every { shiftDao.getAllActive() } returns flowOf(entities)

        val repository = ShiftRepository(shiftDao)
        val viewModel = ShiftsViewModel(repository)

        viewModel.uiState.test {
            awaitItem() // Loading

            val successState = awaitItem() as ShiftsUiState.Success
            val shift = successState.shifts[0]
            assertEquals("abc-123", shift.id)
            assertEquals("Evening", shift.name)
            assertEquals("🌙", shift.icon)
            assertEquals("#7C3AED", shift.backgroundColor)
            assertEquals(1020, shift.startTime)
            assertEquals(1380, shift.endTime)
            assertEquals(360, shift.hoursWorked)
            assertTrue(shift.isActive)

            cancelAndIgnoreRemainingEvents()
        }
    }
}
