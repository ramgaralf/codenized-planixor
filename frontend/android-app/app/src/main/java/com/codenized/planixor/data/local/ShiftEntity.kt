package com.codenized.planixor.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing a shift stored locally.
 * All fields follow the offline-first sync strategy with change tracking.
 */
@Entity(tableName = "shifts")
data class ShiftEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val startTime: Int,
    val endTime: Int,
    val hoursWorked: Int,
    val isActive: Boolean,
    val createdAt: Long,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
