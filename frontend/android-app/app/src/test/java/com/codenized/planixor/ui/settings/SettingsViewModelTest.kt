package com.codenized.planixor.ui.settings

import app.cash.turbine.test
import com.codenized.planixor.data.local.PlanixorDatabase
import com.codenized.planixor.data.local.PreferencesRepository
import com.codenized.planixor.data.local.ShiftModeSettingRepository
import com.codenized.planixor.data.notification.NotificationChannel
import com.codenized.planixor.data.notification.NotificationPreferences
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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
class SettingsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var preferencesRepository: PreferencesRepository
    private lateinit var notificationPreferences: NotificationPreferences
    private lateinit var database: PlanixorDatabase
    private lateinit var shiftModeSettingRepository: ShiftModeSettingRepository
    private lateinit var viewModel: SettingsViewModel

    private val shiftModeFlow = MutableStateFlow(false)

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        preferencesRepository = mockk(relaxed = true)
        notificationPreferences = mockk(relaxed = true)
        database = mockk(relaxed = true)
        shiftModeSettingRepository = mockk(relaxed = true)

        every { preferencesRepository.localeFlow } returns flowOf("es")
        every { notificationPreferences.channelFlow } returns flowOf(NotificationChannel.APP)
        every { shiftModeSettingRepository.observeEnabled() } returns shiftModeFlow
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): SettingsViewModel {
        return SettingsViewModel(
            preferencesRepository,
            notificationPreferences,
            database,
            shiftModeSettingRepository,
        )
    }

    @Test
    fun `toggleShiftMode should call repository toggle`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.toggleShiftMode()
        advanceUntilIdle()

        coVerify(exactly = 1) { shiftModeSettingRepository.toggle() }
    }

    @Test
    fun `shiftModeEnabled should emit repository observeEnabled values`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.shiftModeEnabled.test {
            assertEquals(false, awaitItem())

            shiftModeFlow.value = true
            assertEquals(true, awaitItem())

            shiftModeFlow.value = false
            assertEquals(false, awaitItem())
        }
    }
}
