package com.codenized.planixor.di

import com.codenized.planixor.data.local.AnnualHoursConfigRepository
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.sync.AnnualHoursConfigSyncAdapter
import com.codenized.planixor.data.sync.AnnualHoursConfigSyncApiService
import com.codenized.planixor.data.sync.AnnualHoursConfigSyncManager
import com.codenized.planixor.data.sync.CalendarEventSyncAdapter
import com.codenized.planixor.data.sync.CalendarEventSyncApiService
import com.codenized.planixor.data.sync.ReminderSyncManager
import com.codenized.planixor.data.sync.ShiftSyncManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing sync manager dependencies.
 * Sync managers are pure Kotlin classes handling push/pull logic and conflict resolution.
 */
@Module
@InstallIn(SingletonComponent::class)
object SyncModule {

    @Provides
    @Singleton
    fun provideShiftSyncManager(): ShiftSyncManager {
        return ShiftSyncManager()
    }

    @Provides
    @Singleton
    fun provideReminderSyncManager(): ReminderSyncManager {
        return ReminderSyncManager()
    }

    @Provides
    @Singleton
    fun provideAnnualHoursConfigSyncManager(): AnnualHoursConfigSyncManager {
        return AnnualHoursConfigSyncManager()
    }

    @Provides
    @Singleton
    fun provideCalendarEventSyncAdapter(
        calendarEventDao: CalendarEventDao,
        syncApiService: CalendarEventSyncApiService,
    ): CalendarEventSyncAdapter {
        return CalendarEventSyncAdapter(calendarEventDao, syncApiService)
    }

    @Provides
    @Singleton
    fun provideAnnualHoursConfigSyncAdapter(
        repository: AnnualHoursConfigRepository,
        syncApiService: AnnualHoursConfigSyncApiService,
        syncManager: AnnualHoursConfigSyncManager,
    ): AnnualHoursConfigSyncAdapter {
        return AnnualHoursConfigSyncAdapter(repository, syncApiService, syncManager)
    }
}
