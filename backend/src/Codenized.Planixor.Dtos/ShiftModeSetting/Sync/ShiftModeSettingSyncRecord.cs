// <copyright file="ShiftModeSettingSyncRecord.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.ShiftModeSetting.Sync;

/// <summary>
/// Represents a single shift mode setting record in a sync payload (both push and pull).
/// </summary>
/// <param name="Id">The shift mode setting identifier.</param>
/// <param name="Enabled">Whether shift mode is enabled.</param>
/// <param name="ModifiedAt">The last modification timestamp (UTC).</param>
/// <param name="IsDeleted">Whether the record is soft-deleted.</param>
public record ShiftModeSettingSyncRecord(
    Guid Id,
    bool Enabled,
    DateTime ModifiedAt,
    bool IsDeleted);
