// <copyright file="IAnnualHoursConfigSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPull.Queries;

using AnnualHoursConfigEntity = Codenized.Planixor.Core.Entities.AnnualHoursConfig;

/// <summary>
/// Defines read operations for annual hours config synchronization pull.
/// </summary>
public interface IAnnualHoursConfigSyncPullQueries
{
    /// <summary>
    /// Retrieves annual hours configs for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// </summary>
    /// <param name="userId">The user identifier who owns the configs.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <returns>A paginated result containing configs, a cursor for the next page, and a flag indicating more records exist.</returns>
    Task<AnnualHoursConfigSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor);
}

/// <summary>
/// Represents the paginated result of an annual hours config sync pull query.
/// </summary>
public record AnnualHoursConfigSyncPullResult
{
    /// <summary>
    /// Gets the annual hours configs returned in this page (max 100).
    /// </summary>
    required public IReadOnlyList<AnnualHoursConfigEntity> Records { get; init; }

    /// <summary>
    /// Gets the cursor to use for retrieving the next page, or null if no more pages.
    /// </summary>
    required public string? Cursor { get; init; }

    /// <summary>
    /// Gets a value indicating whether more records exist beyond this page.
    /// </summary>
    required public bool HasMore { get; init; }
}
