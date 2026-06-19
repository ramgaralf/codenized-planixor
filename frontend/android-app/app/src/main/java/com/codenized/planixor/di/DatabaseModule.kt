package com.codenized.planixor.di

import android.content.Context
import androidx.room.Room
import com.codenized.planixor.data.local.AnnualHoursConfigDao
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.PlanixorDatabase
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
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
        )
            .addMigrations(PlanixorDatabase.MIGRATION_3_4, PlanixorDatabase.MIGRATION_4_5, PlanixorDatabase.MIGRATION_5_6)
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideCalendarEventDao(database: PlanixorDatabase): CalendarEventDao {
        return database.calendarEventDao()
    }

    @Provides
    @Singleton
    fun provideShiftDao(database: PlanixorDatabase): ShiftDao {
        return database.shiftDao()
    }

    @Provides
    @Singleton
    fun provideReminderDao(database: PlanixorDatabase): ReminderDao {
        return database.reminderDao()
    }

    @Provides
    @Singleton
    fun provideAnnualHoursConfigDao(database: PlanixorDatabase): AnnualHoursConfigDao {
        return database.annualHoursConfigDao()
    }
}
