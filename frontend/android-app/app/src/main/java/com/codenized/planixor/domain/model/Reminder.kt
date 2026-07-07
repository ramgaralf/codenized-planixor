package com.codenized.planixor.domain.model

/**
 * Domain model representing a reminder template.
 * Reminders are reusable templates assigned to calendar events.
 */
data class Reminder(
    val id: String,
    val name: String,
    val icon: String,
    val backgroundColor: String,
    val isActive: Boolean,
    val seriesFrequency: String = "never",
    val seriesEndDate: String = "",
    val createdAt: Long,
    val modifiedAt: Long,
    val syncedAt: Long?,
    val isDeleted: Boolean,
)
