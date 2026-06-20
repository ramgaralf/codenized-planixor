package com.codenized.planixor.di

import com.codenized.planixor.data.sync.AnnualHoursConfigSyncApiService
import com.codenized.planixor.data.sync.CalendarEventSyncApiService
import com.codenized.planixor.data.sync.NotificationRecordSyncApiService
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
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val BASE_URL = "http://10.0.2.2:80/"

    /**
     * Provides a configured OkHttpClient with logging interceptor.
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .build()
    }

    /**
     * Provides a configured Retrofit instance.
     */
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    /**
     * Provides the CalendarEventSyncApiService Retrofit interface.
     */
    @Provides
    @Singleton
    fun provideCalendarEventSyncApiService(retrofit: Retrofit): CalendarEventSyncApiService {
        return retrofit.create(CalendarEventSyncApiService::class.java)
    }

    /**
     * Provides the AnnualHoursConfigSyncApiService Retrofit interface.
     */
    @Provides
    @Singleton
    fun provideAnnualHoursConfigSyncApiService(retrofit: Retrofit): AnnualHoursConfigSyncApiService {
        return retrofit.create(AnnualHoursConfigSyncApiService::class.java)
    }

    /**
     * Provides the NotificationRecordSyncApiService Retrofit interface.
     */
    @Provides
    @Singleton
    fun provideNotificationRecordSyncApiService(retrofit: Retrofit): NotificationRecordSyncApiService {
        return retrofit.create(NotificationRecordSyncApiService::class.java)
    }
}
