// <copyright file="ShiftSyncItem.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Shift.Sync;

/// <summary>
/// Represents a single shift record in a sync payload (both push and pull).
/// </summary>
/// <param name="Id">The shift identifier.</param>
/// <param name="Name">The shift name.</param>
/// <param name="Icon">The shift icon (single emoji).</param>
/// <param name="BackgroundColor">The shift background color (hex).</param>
/// <param name="StartTime">The shift start time in minutes from midnight (0–1439).</param>
/// <param name="EndTime">The shift end time in minutes from midnight (0–1439).</param>
/// <param name="HoursWorked">The hours worked in total minutes (1–1440).</param>
/// <param name="IsActive">Whether the shift is active.</param>
/// <param name="CreatedAt">The creation timestamp (UTC).</param>
/// <param name="ModifiedAt">The last modification timestamp (UTC).</param>
/// <param name="IsDeleted">Whether the shift is soft-deleted.</param>
public record ShiftSyncItem(
    Guid Id,
    string Name,
    string Icon,
    string BackgroundColor,
    int StartTime,
    int EndTime,
    int HoursWorked,
    bool IsActive,
    DateTime CreatedAt,
    DateTime ModifiedAt,
    bool IsDeleted);
