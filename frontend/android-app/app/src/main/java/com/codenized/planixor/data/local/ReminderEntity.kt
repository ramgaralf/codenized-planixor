package com.codenized.planixor.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity representing a reminder stored locally.
 * All fields follow the offline-first sync strategy with change tracking.
 */
@Entity(tableName = "reminders")
data class ReminderEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val isActive: Boolean,
    @ColumnInfo(defaultValue = "never")
    val seriesFrequency: String = "never",
    @ColumnInfo(defaultValue = "")
    val seriesEndDate: String = "",
    val createdAt: Long,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
