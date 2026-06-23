// <copyright file="AnnualHoursConfigSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.AnnualHoursConfig.SyncPull;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPull.Queries;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using AnnualHoursConfigEntity = Codenized.Planixor.Core.Entities.AnnualHoursConfig;

/// <summary>
/// Repository implementation for querying annual hours configs during sync pull.
/// Returns configs modified after a given timestamp with cursor-based pagination.
/// </summary>
public sealed class AnnualHoursConfigSyncPullQueries : IAnnualHoursConfigSyncPullQueries, IRepository
{
    private const int PageSize = 100;
    private const string CursorSeparator = "|";
    private const string DateTimeFormat = "o";

    private readonly ApplicationReadContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="AnnualHoursConfigSyncPullQueries"/> class.
    /// </summary>
    /// <param name="context">The application read context.</param>
    public AnnualHoursConfigSyncPullQueries(ApplicationReadContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Retrieves annual hours configs for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// </summary>
    /// <param name="userId">The user identifier who owns the configs.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <returns>A paginated result containing configs, a cursor for the next page, and a flag indicating more records exist.</returns>
    public async Task<AnnualHoursConfigSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor)
    {
        IQueryable<AnnualHoursConfigEntity> query = this.context.AnnualHoursConfigs
            .AsNoTracking()
            .Where(c => c.UserId == userId && c.SyncedAt > lastSyncedAt);

        if (cursor != null)
        {
            (DateTime cursorModifiedAt, Guid cursorId) = DecodeCursor(cursor);

            query = query.Where(c =>
                c.SyncedAt > cursorModifiedAt ||
                (c.SyncedAt == cursorModifiedAt && c.Id.CompareTo(cursorId) > 0));
        }

        List<AnnualHoursConfigEntity> results = await query
            .OrderBy(c => c.SyncedAt)
            .ThenBy(c => c.Id)
            .Take(PageSize + 1)
            .ToListAsync();

        bool hasMore = results.Count > PageSize;

        List<AnnualHoursConfigEntity> records = hasMore
            ? results.Take(PageSize).ToList()
            : results;

        string? nextCursor = null;
        if (hasMore && records.Count > 0)
        {
            AnnualHoursConfigEntity lastRecord = records[^1];
            nextCursor = EncodeCursor(lastRecord.SyncedAt ?? lastRecord.ModifiedAt, lastRecord.Id);
        }

        return new AnnualHoursConfigSyncPullResult
        {
            Records = records,
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
