package com.codenized.planixor.di

import com.codenized.planixor.data.local.AnnualHoursConfigRepository
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftModeSettingDao
import com.codenized.planixor.data.sync.AnnualHoursConfigSyncAdapter
import com.codenized.planixor.data.sync.AnnualHoursConfigSyncApiService
import com.codenized.planixor.data.sync.AnnualHoursConfigSyncManager
import com.codenized.planixor.data.sync.CalendarEventSyncAdapter
import com.codenized.planixor.data.sync.CalendarEventSyncApiService
import com.codenized.planixor.data.sync.DynamicBaseUrlInterceptor
import com.codenized.planixor.data.sync.NotificationPurgeService
import com.codenized.planixor.data.sync.NotificationRecordSyncAdapter
import com.codenized.planixor.data.sync.NotificationRecordSyncApiService
import com.codenized.planixor.data.sync.ReminderSyncAdapter
import com.codenized.planixor.data.sync.ReminderSyncApiService
import com.codenized.planixor.data.sync.ReminderSyncManager
import com.codenized.planixor.data.sync.ShiftModeSettingSyncAdapter
import com.codenized.planixor.data.sync.ShiftModeSettingSyncApiService
import com.codenized.planixor.data.sync.ShiftSyncAdapter
import com.codenized.planixor.data.sync.ShiftSyncApiService
import com.codenized.planixor.data.sync.ShiftSyncManager
import com.codenized.planixor.data.sync.SyncServiceController
import com.codenized.planixor.data.sync.SyncValidationService
import com.codenized.planixor.data.sync.SyncValidationServiceImpl
import com.codenized.planixor.data.local.PreferencesRepository
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

    @Provides
    @Singleton
    fun provideNotificationRecordSyncAdapter(
        notificationRecordDao: NotificationRecordDao,
        syncApiService: NotificationRecordSyncApiService,
    ): NotificationRecordSyncAdapter {
        return NotificationRecordSyncAdapter(notificationRecordDao, syncApiService)
    }

    @Provides
    @Singleton
    fun provideShiftSyncAdapter(
        shiftDao: ShiftDao,
        syncApiService: ShiftSyncApiService,
    ): ShiftSyncAdapter {
        return ShiftSyncAdapter(shiftDao, syncApiService)
    }

    @Provides
    @Singleton
    fun provideReminderSyncAdapter(
        reminderDao: ReminderDao,
        syncApiService: ReminderSyncApiService,
    ): ReminderSyncAdapter {
        return ReminderSyncAdapter(reminderDao, syncApiService)
    }

    @Provides
    @Singleton
    fun provideShiftModeSettingSyncAdapter(
        shiftModeSettingDao: ShiftModeSettingDao,
        syncApiService: ShiftModeSettingSyncApiService,
    ): ShiftModeSettingSyncAdapter {
        return ShiftModeSettingSyncAdapter(shiftModeSettingDao, syncApiService)
    }

    @Provides
    @Singleton
    fun provideSyncValidationService(): SyncValidationService {
        return SyncValidationServiceImpl()
    }

    @Provides
    @Singleton
    fun provideSyncServiceController(
        preferencesRepository: PreferencesRepository,
        calendarEventSyncAdapter: CalendarEventSyncAdapter,
        notificationRecordSyncAdapter: NotificationRecordSyncAdapter,
        annualHoursConfigSyncAdapter: AnnualHoursConfigSyncAdapter,
        shiftSyncAdapter: ShiftSyncAdapter,
        reminderSyncAdapter: ReminderSyncAdapter,
        shiftModeSettingSyncAdapter: ShiftModeSettingSyncAdapter,
        dynamicBaseUrlInterceptor: DynamicBaseUrlInterceptor,
        notificationPurgeService: NotificationPurgeService,
    ): SyncServiceController {
        return SyncServiceController(
            preferencesRepository,
            calendarEventSyncAdapter,
            notificationRecordSyncAdapter,
            annualHoursConfigSyncAdapter,
            shiftSyncAdapter,
            reminderSyncAdapter,
            shiftModeSettingSyncAdapter,
            dynamicBaseUrlInterceptor,
            notificationPurgeService,
        )
    }
}
