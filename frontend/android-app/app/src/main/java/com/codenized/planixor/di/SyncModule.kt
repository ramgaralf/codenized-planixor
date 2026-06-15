package com.codenized.planixor.di

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
}
