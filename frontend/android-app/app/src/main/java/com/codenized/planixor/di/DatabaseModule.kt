package com.codenized.planixor.di

import android.content.Context
import androidx.room.Room
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.PlanixorDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing Room database and DAO dependencies.
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun providePlanixorDatabase(
        @ApplicationContext context: Context,
    ): PlanixorDatabase {
        return Room.databaseBuilder(
            context,
            PlanixorDatabase::class.java,
            "planixor_database",
        ).build()
    }

    @Provides
    @Singleton
    fun provideCalendarEventDao(database: PlanixorDatabase): CalendarEventDao {
        return database.calendarEventDao()
    }
}
