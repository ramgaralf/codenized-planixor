package com.codenized.planixor.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room entity representing an annual hours configuration stored locally.
 * All fields follow the offline-first sync strategy with change tracking.
 */
@Entity(
    tableName = "annual_hours_config",
    indices = [
        Index(value = ["year", "isDeleted"]),
        Index(value = ["modifiedAt"]),
    ],
)
data class AnnualHoursConfigEntity(
    @PrimaryKey val id: String,
    val year: Int,
    val configuredHours: Int,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
