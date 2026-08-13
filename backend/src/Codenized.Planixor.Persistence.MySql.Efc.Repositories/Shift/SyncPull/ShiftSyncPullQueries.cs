// <copyright file="ShiftSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.Shift.SyncPull;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.Shift.SyncPull.Queries;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using ShiftEntity = Codenized.Planixor.Core.Entities.Shift;

/// <summary>
/// Repository implementation for querying shift records during sync pull.
/// Returns shifts modified after a given timestamp with cursor-based pagination.
/// </summary>
public sealed class ShiftSyncPullQueries : IShiftSyncPullQueries, IRepository
{
    private const int PageSize = 100;
    private readonly ApplicationReadContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftSyncPullQueries"/> class.
    /// </summary>
    /// <param name="context">The application read context.</param>
    public ShiftSyncPullQueries(ApplicationReadContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Retrieves shifts for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// The cursor is based on modifiedAt + Id for stable pagination ordering.
    /// </summary>
    /// <param name="userId">The user identifier who owns the shifts.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A paginated result containing shifts, a cursor for the next page, and a flag indicating more records exist.</returns>
    public async Task<ShiftSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor, CancellationToken cancellationToken)
    {
        IQueryable<ShiftEntity> query = this.context.Shifts
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.SyncedAt > lastSyncedAt);

        if (cursor != null)
        {
            (DateTime cursorModifiedAt, Guid cursorId) = SyncCursor.Decode(cursor);

            query = query.Where(s =>
                s.SyncedAt > cursorModifiedAt ||
                (s.SyncedAt == cursorModifiedAt && s.Id.CompareTo(cursorId) > 0));
        }

        List<ShiftEntity> results = await query
            .OrderBy(s => s.SyncedAt)
            .ThenBy(s => s.Id)
            .Take(PageSize + 1)
            .ToListAsync(cancellationToken);

        bool hasMore = results.Count > PageSize;

        List<ShiftEntity> shifts = hasMore
            ? results.Take(PageSize).ToList()
            : results;

        string? nextCursor = null;
        if (hasMore && shifts.Count > 0)
        {
            ShiftEntity lastShift = shifts[^1];
            nextCursor = SyncCursor.Encode(lastShift.SyncedAt ?? lastShift.ModifiedAt, lastShift.Id);
        }

        return new ShiftSyncPullResult
        {
            Shifts = shifts,
            Cursor = nextCursor,
            HasMore = hasMore,
        };
    }
}
