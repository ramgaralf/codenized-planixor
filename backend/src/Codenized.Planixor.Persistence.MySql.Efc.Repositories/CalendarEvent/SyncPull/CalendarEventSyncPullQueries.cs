// <copyright file="CalendarEventSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.CalendarEvent.SyncPull;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.CalendarEvent.SyncPull.Queries;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using CalendarEventEntity = Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Repository implementation for querying calendar events during sync pull.
/// Returns calendar events modified after a given timestamp with cursor-based pagination.
/// </summary>
public sealed class CalendarEventSyncPullQueries : ICalendarEventSyncPullQueries, IRepository
{
    private const int PageSize = 100;
    private readonly ApplicationReadContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="CalendarEventSyncPullQueries"/> class.
    /// </summary>
    /// <param name="context">The application read context.</param>
    public CalendarEventSyncPullQueries(ApplicationReadContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Retrieves calendar events for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// The cursor is based on modifiedAt + Id for stable pagination ordering.
    /// </summary>
    /// <param name="userId">The user identifier who owns the calendar events.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A paginated result containing calendar events, a cursor for the next page, and a flag indicating more records exist.</returns>
    public async Task<CalendarEventSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor, CancellationToken cancellationToken)
    {
        IQueryable<CalendarEventEntity> query = this.context.CalendarEvents
            .AsNoTracking()
            .Where(e => e.UserId == userId && e.SyncedAt > lastSyncedAt);

        if (cursor != null)
        {
            (DateTime cursorModifiedAt, Guid cursorId) = SyncCursor.Decode(cursor);

            query = query.Where(e =>
                e.SyncedAt > cursorModifiedAt ||
                (e.SyncedAt == cursorModifiedAt && e.Id.CompareTo(cursorId) > 0));
        }

        List<CalendarEventEntity> results = await query
            .OrderBy(e => e.SyncedAt)
            .ThenBy(e => e.Id)
            .Take(PageSize + 1)
            .ToListAsync(cancellationToken);

        bool hasMore = results.Count > PageSize;

        List<CalendarEventEntity> records = hasMore
            ? results.Take(PageSize).ToList()
            : results;

        string? nextCursor = null;
        if (hasMore && records.Count > 0)
        {
            CalendarEventEntity lastRecord = records[^1];
            nextCursor = SyncCursor.Encode(lastRecord.SyncedAt ?? lastRecord.ModifiedAt, lastRecord.Id);
        }

        return new CalendarEventSyncPullResult
        {
            CalendarEvents = records,
            Cursor = nextCursor,
            HasMore = hasMore,
        };
    }
}
