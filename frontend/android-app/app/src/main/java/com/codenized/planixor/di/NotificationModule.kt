package com.codenized.planixor.di

import com.codenized.planixor.data.notification.NotificationPreferences
import com.codenized.planixor.data.notification.NotificationPreferencesImpl
import com.codenized.planixor.data.notification.NotificationService
import com.codenized.planixor.data.notification.NotificationServiceImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing notification-related dependencies.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class NotificationModule {

    @Binds
    @Singleton
    abstract fun bindNotificationService(
        impl: NotificationServiceImpl,
    ): NotificationService

    @Binds
    @Singleton
    abstract fun bindNotificationPreferences(
        impl: NotificationPreferencesImpl,
    ): NotificationPreferences
}
