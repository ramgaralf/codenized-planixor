package com.codenized.planixor.ui.theme

import app.cash.turbine.test
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.model.ThemeMode
import io.mockk.coEvery
import io.mockk.coVerify
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

@OptIn(ExperimentalCoroutinesApi::class)
class ThemeViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var preferencesRepository: PreferencesRepository

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        preferencesRepository = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `themeMode should be System when no persisted value exists`() = runTest {
        coEvery { preferencesRepository.themeFlow } returns flowOf(null)

        val viewModel = ThemeViewModel(preferencesRepository)
        advanceUntilIdle()

        viewModel.themeMode.test {
            assertEquals(ThemeMode.System, awaitItem())
        }
    }

    @Test
    fun `setTheme should update StateFlow and persist value`() = runTest {
        coEvery { preferencesRepository.themeFlow } returns flowOf(null)

        val viewModel = ThemeViewModel(preferencesRepository)
        advanceUntilIdle()

        viewModel.setTheme(ThemeMode.Dark)
        advanceUntilIdle()

        viewModel.themeMode.test {
            assertEquals(ThemeMode.Dark, awaitItem())
        }

        coVerify { preferencesRepository.setTheme("dark") }
    }

    @Test
    fun `setTheme should update to Light and persist`() = runTest {
        coEvery { preferencesRepository.themeFlow } returns flowOf(null)

        val viewModel = ThemeViewModel(preferencesRepository)
        advanceUntilIdle()

        viewModel.setTheme(ThemeMode.Light)
        advanceUntilIdle()

        viewModel.themeMode.test {
            assertEquals(ThemeMode.Light, awaitItem())
        }

        coVerify { preferencesRepository.setTheme("light") }
    }

    @Test
    fun `themeMode should fall back to System when DataStore value is invalid`() = runTest {
        coEvery { preferencesRepository.themeFlow } returns flowOf("invalid_value")

        val viewModel = ThemeViewModel(preferencesRepository)
        advanceUntilIdle()

        viewModel.themeMode.test {
            assertEquals(ThemeMode.System, awaitItem())
        }
    }

    @Test
    fun `themeMode should be Dark when persisted value is dark`() = runTest {
        coEvery { preferencesRepository.themeFlow } returns flowOf("dark")

        val viewModel = ThemeViewModel(preferencesRepository)
        advanceUntilIdle()

        viewModel.themeMode.test {
            assertEquals(ThemeMode.Dark, awaitItem())
        }
    }

    @Test
    fun `themeMode should be Light when persisted value is light`() = runTest {
        coEvery { preferencesRepository.themeFlow } returns flowOf("light")

        val viewModel = ThemeViewModel(preferencesRepository)
        advanceUntilIdle()

        viewModel.themeMode.test {
            assertEquals(ThemeMode.Light, awaitItem())
        }
    }
}
