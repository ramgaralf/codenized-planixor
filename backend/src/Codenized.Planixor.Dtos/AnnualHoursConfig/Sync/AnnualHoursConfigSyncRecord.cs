// <copyright file="AnnualHoursConfigSyncRecord.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

/// <summary>
/// Represents a single annual hours config record in a sync payload (both push and pull).
/// </summary>
/// <param name="Id">The annual hours config identifier.</param>
/// <param name="Year">The calendar year this configuration applies to.</param>
/// <param name="ConfiguredHours">The total required annual working hours (whole hours).</param>
/// <param name="ModifiedAt">The last modification timestamp (UTC).</param>
/// <param name="SyncedAt">The last synchronization timestamp (UTC), or null if never synced.</param>
/// <param name="IsDeleted">Whether the record is soft-deleted.</param>
public record AnnualHoursConfigSyncRecord(
    Guid Id,
    int Year,
    int ConfiguredHours,
    DateTime ModifiedAt,
    DateTime? SyncedAt,
    bool IsDeleted);
