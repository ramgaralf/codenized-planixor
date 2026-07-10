package com.codenized.planixor.di

import android.content.Context
import android.util.Log
import androidx.room.Room
import com.codenized.planixor.data.local.AnnualHoursConfigDao
import com.codenized.planixor.data.local.CalendarEventDao
import com.codenized.planixor.data.local.NotificationRecordDao
import com.codenized.planixor.data.local.PlanixorDatabase
import com.codenized.planixor.data.local.ReminderDao
import com.codenized.planixor.data.local.ShiftDao
import com.codenized.planixor.data.local.ShiftModeSettingDao
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

    private const val TAG = "DatabaseModule"

    @Provides
    @Singleton
    fun providePlanixorDatabase(
        @ApplicationContext context: Context,
    ): PlanixorDatabase {
        val db = buildDatabase(context)
        return try {
            // Force-open to trigger migration/validation immediately.
            // Room's .build() is lazy — the actual DB open happens on first DAO access.
            db.openHelper.writableDatabase
            db
        } catch (e: IllegalStateException) {
            Log.e(TAG, "Database schema validation failed, recreating database", e)
            db.close()
            context.deleteDatabase("planixor_database")
            buildDatabase(context)
        }
    }

    private fun buildDatabase(context: Context): PlanixorDatabase {
        return Room.databaseBuilder(
            context,
            PlanixorDatabase::class.java,
            "planixor_database",
        )
            .addMigrations(
                PlanixorDatabase.MIGRATION_3_4,
                PlanixorDatabase.MIGRATION_4_5,
                PlanixorDatabase.MIGRATION_5_6,
                PlanixorDatabase.MIGRATION_6_7,
                PlanixorDatabase.MIGRATION_7_8,
                PlanixorDatabase.MIGRATION_8_9,
                PlanixorDatabase.MIGRATION_9_10,
                PlanixorDatabase.MIGRATION_10_11,
                PlanixorDatabase.MIGRATION_11_12,
            )
            .fallbackToDestructiveMigrationFrom(8, 9, 10, 11)
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

    @Provides
    @Singleton
    fun provideNotificationRecordDao(database: PlanixorDatabase): NotificationRecordDao {
        return database.notificationRecordDao()
    }

    @Provides
    @Singleton
    fun provideShiftModeSettingDao(database: PlanixorDatabase): ShiftModeSettingDao {
        return database.shiftModeSettingDao()
    }
}
