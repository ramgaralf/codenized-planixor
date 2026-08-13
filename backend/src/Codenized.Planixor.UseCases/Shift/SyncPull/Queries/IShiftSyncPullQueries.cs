// <copyright file="IShiftSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.Shift.SyncPull.Queries;

using Codenized.Planixor.Core.Entities;

/// <summary>
/// Defines read operations for shift synchronization pull.
/// </summary>
public interface IShiftSyncPullQueries
{
    /// <summary>
    /// Retrieves shifts for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// </summary>
    /// <param name="userId">The user identifier who owns the shifts.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A paginated result containing shifts, a cursor for the next page, and a flag indicating more records exist.</returns>
    Task<ShiftSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor, CancellationToken cancellationToken);
}
