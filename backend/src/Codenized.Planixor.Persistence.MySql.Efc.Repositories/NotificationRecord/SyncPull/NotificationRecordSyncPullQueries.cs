// <copyright file="NotificationRecordSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.NotificationRecord.SyncPull;

using System.Globalization;
using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPull.Queries;
using Microsoft.EntityFrameworkCore;
using NotificationRecordEntity = Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Repository implementation for querying notification records during sync pull.
/// Returns notification records modified after a given timestamp with cursor-based pagination.
/// </summary>
public sealed class NotificationRecordSyncPullQueries : INotificationRecordSyncPullQueries, IAppServiceScoped
{
    private const int PageSize = 100;
    private const string CursorSeparator = "|";
    private const string DateTimeFormat = "o";

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
    /// <returns>A paginated result containing notification records, a cursor for the next page, and a flag indicating more records exist.</returns>
    public async Task<NotificationRecordSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor)
    {
        IQueryable<NotificationRecordEntity> query = this.context.NotificationRecords
            .AsNoTracking()
            .Where(n => n.UserId == userId && n.ModifiedAt > lastSyncedAt);

        if (cursor != null)
        {
            (DateTime cursorModifiedAt, Guid cursorId) = DecodeCursor(cursor);

            query = query.Where(n =>
                n.ModifiedAt > cursorModifiedAt ||
                (n.ModifiedAt == cursorModifiedAt && n.Id.CompareTo(cursorId) > 0));
        }

        List<NotificationRecordEntity> results = await query
            .OrderBy(n => n.ModifiedAt)
            .ThenBy(n => n.Id)
            .Take(PageSize + 1)
            .ToListAsync();

        bool hasMore = results.Count > PageSize;

        List<NotificationRecordEntity> records = hasMore
            ? results.Take(PageSize).ToList()
            : results;

        string? nextCursor = null;
        if (hasMore && records.Count > 0)
        {
            NotificationRecordEntity lastRecord = records[^1];
            nextCursor = EncodeCursor(lastRecord.ModifiedAt, lastRecord.Id);
        }

        return new NotificationRecordSyncPullResult
        {
            NotificationRecords = records,
            Cursor = nextCursor,
            HasMore = hasMore,
        };
    }

    private static string EncodeCursor(DateTime modifiedAt, Guid id)
    {
        string dateString = modifiedAt.ToString(DateTimeFormat, CultureInfo.InvariantCulture);
        return Convert.ToBase64String(
            System.Text.Encoding.UTF8.GetBytes($"{dateString}{CursorSeparator}{id}"));
    }

    private static (DateTime ModifiedAt, Guid Id) DecodeCursor(string cursor)
    {
        string decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
        string[] parts = decoded.Split(CursorSeparator, 2);

        DateTime modifiedAt = DateTime.Parse(parts[0], CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
        Guid id = Guid.Parse(parts[1]);

        return (modifiedAt, id);
    }
}
