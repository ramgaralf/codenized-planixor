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
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A paginated result containing configs, a cursor for the next page, and a flag indicating more records exist.</returns>
    Task<AnnualHoursConfigSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor, CancellationToken cancellationToken);
}
