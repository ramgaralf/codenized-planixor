package com.codenized.planixor.di

import com.codenized.planixor.data.sync.AnnualHoursConfigSyncApiService
import com.codenized.planixor.data.sync.CalendarEventSyncApiService
import com.codenized.planixor.data.sync.DynamicBaseUrlInterceptor
import com.codenized.planixor.data.sync.NotificationRecordSyncApiService
import com.codenized.planixor.data.sync.ReminderSyncApiService
import com.codenized.planixor.data.sync.ShiftSyncApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

/**
 * Hilt module providing networking dependencies.
 * Uses a dynamic base URL interceptor so the actual server URL comes from user
 * sync configuration at runtime, not a hardcoded constant.
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * Placeholder base URL — will be overridden at runtime by DynamicBaseUrlInterceptor.
     */
    private const val PLACEHOLDER_BASE_URL = "http://localhost/"

    /**
     * Provides the dynamic base URL interceptor as a singleton.
     * The SyncServiceController updates serverUrl and apiKey on this interceptor
     * before each sync cycle.
     */
    @Provides
    @Singleton
    fun provideDynamicBaseUrlInterceptor(): DynamicBaseUrlInterceptor {
        return DynamicBaseUrlInterceptor()
    }

    /**
     * Provides a configured OkHttpClient with logging and dynamic URL interceptors.
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(dynamicBaseUrlInterceptor: DynamicBaseUrlInterceptor): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(dynamicBaseUrlInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()
    }

    /**
     * Provides a configured Retrofit instance with placeholder base URL.
     */
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(PLACEHOLDER_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideCalendarEventSyncApiService(retrofit: Retrofit): CalendarEventSyncApiService {
        return retrofit.create(CalendarEventSyncApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAnnualHoursConfigSyncApiService(retrofit: Retrofit): AnnualHoursConfigSyncApiService {
        return retrofit.create(AnnualHoursConfigSyncApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideNotificationRecordSyncApiService(retrofit: Retrofit): NotificationRecordSyncApiService {
        return retrofit.create(NotificationRecordSyncApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideShiftSyncApiService(retrofit: Retrofit): ShiftSyncApiService {
        return retrofit.create(ShiftSyncApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideReminderSyncApiService(retrofit: Retrofit): ReminderSyncApiService {
        return retrofit.create(ReminderSyncApiService::class.java)
    }
}
