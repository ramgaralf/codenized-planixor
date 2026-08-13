// <copyright file="NotificationRecordSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.NotificationRecord.SyncPull;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPull.Queries;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using NotificationRecordEntity = Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Repository implementation for querying notification records during sync pull.
/// Returns notification records modified after a given timestamp with cursor-based pagination.
/// </summary>
public sealed class NotificationRecordSyncPullQueries : INotificationRecordSyncPullQueries, IRepository
{
    private const int PageSize = 100;
    private readonly ApplicationReadContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationRecordSyncPullQueries"/> class.
    /// </summary>
    /// <param name="context">The application read context.</param>
    public NotificationRecordSyncPullQueries(ApplicationReadContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Retrieves notification records for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// The cursor is based on modifiedAt + Id for stable pagination ordering.
    /// </summary>
    /// <param name="userId">The user identifier who owns the notification records.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A paginated result containing notification records, a cursor for the next page, and a flag indicating more records exist.</returns>
    public async Task<NotificationRecordSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor, CancellationToken cancellationToken)
    {
        IQueryable<NotificationRecordEntity> query = this.context.NotificationRecords
            .AsNoTracking()
            .Where(n => n.UserId == userId && n.SyncedAt > lastSyncedAt);

        if (cursor != null)
        {
            (DateTime cursorModifiedAt, Guid cursorId) = SyncCursor.Decode(cursor);

            query = query.Where(n =>
                n.SyncedAt > cursorModifiedAt ||
                (n.SyncedAt == cursorModifiedAt && n.Id.CompareTo(cursorId) > 0));
        }

        List<NotificationRecordEntity> results = await query
            .OrderBy(n => n.SyncedAt)
            .ThenBy(n => n.Id)
            .Take(PageSize + 1)
            .ToListAsync(cancellationToken);

        bool hasMore = results.Count > PageSize;

        List<NotificationRecordEntity> records = hasMore
            ? results.Take(PageSize).ToList()
            : results;

        string? nextCursor = null;
        if (hasMore && records.Count > 0)
        {
            NotificationRecordEntity lastRecord = records[^1];
            nextCursor = SyncCursor.Encode(lastRecord.SyncedAt ?? lastRecord.ModifiedAt, lastRecord.Id);
        }

        return new NotificationRecordSyncPullResult
        {
            NotificationRecords = records,
            Cursor = nextCursor,
            HasMore = hasMore,
        };
    }
}
