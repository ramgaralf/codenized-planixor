// <copyright file="ReminderSyncRecord.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Reminder.Sync;

/// <summary>
/// Represents a single reminder record in a sync payload (both push and pull).
/// </summary>
/// <param name="Id">The reminder identifier.</param>
/// <param name="Name">The reminder name.</param>
/// <param name="Icon">The reminder icon (single emoji).</param>
/// <param name="BackgroundColor">The reminder background color (hex from Predefined_Palette).</param>
/// <param name="IsActive">Whether the reminder is active.</param>
/// <param name="SeriesFrequency">The series frequency value (never, weekly, monthly, yearly).</param>
/// <param name="SeriesEndDate">The series end date (ISO YYYY-MM-DD or empty/null).</param>
/// <param name="CreatedAt">The creation timestamp (UTC).</param>
/// <param name="ModifiedAt">The last modification timestamp (UTC).</param>
/// <param name="IsDeleted">Whether the reminder is soft-deleted.</param>
public record ReminderSyncRecord(
    Guid Id,
    string Name,
    string Icon,
    string BackgroundColor,
    bool IsActive,
    string? SeriesFrequency,
    string? SeriesEndDate,
    DateTime CreatedAt,
    DateTime ModifiedAt,
    bool IsDeleted);
