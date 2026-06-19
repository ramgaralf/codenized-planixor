package com.codenized.planixor.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for annual hours configuration.
 */
@Dao
interface AnnualHoursConfigDao {

    @Query("SELECT * FROM annual_hours_config WHERE year = :year AND isDeleted = 0 LIMIT 1")
    fun getByYear(year: Int): Flow<AnnualHoursConfigEntity?>

    @Query("SELECT * FROM annual_hours_config WHERE year = :year AND isDeleted = 0 LIMIT 1")
    suspend fun getByYearSync(year: Int): AnnualHoursConfigEntity?

    @Query("SELECT * FROM annual_hours_config WHERE isDeleted = 0")
    fun getAll(): Flow<List<AnnualHoursConfigEntity>>

    @Query("SELECT * FROM annual_hours_config WHERE syncedAt IS NULL OR modifiedAt > syncedAt")
    suspend fun getPendingSync(): List<AnnualHoursConfigEntity>

    @Query("SELECT * FROM annual_hours_config WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): AnnualHoursConfigEntity?

    @Upsert
    suspend fun upsert(entity: AnnualHoursConfigEntity)
}
