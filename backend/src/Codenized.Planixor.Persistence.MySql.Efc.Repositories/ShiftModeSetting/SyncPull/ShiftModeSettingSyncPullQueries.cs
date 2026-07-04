// <copyright file="ShiftModeSettingSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.ShiftModeSetting.SyncPull;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.ShiftModeSetting.SyncPull.Queries;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using ShiftModeSettingEntity = Codenized.Planixor.Core.Entities.ShiftModeSetting;

/// <summary>
/// Repository implementation for querying shift mode setting records during sync pull.
/// Returns shift mode settings modified after a given timestamp with cursor-based pagination.
/// </summary>
public sealed class ShiftModeSettingSyncPullQueries : IShiftModeSettingSyncPullQueries, IRepository
{
    private const int PageSize = 100;
    private const string CursorSeparator = "|";
    private const string DateTimeFormat = "o";

    private readonly ApplicationReadContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftModeSettingSyncPullQueries"/> class.
    /// </summary>
    /// <param name="context">The application read context.</param>
    public ShiftModeSettingSyncPullQueries(ApplicationReadContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Retrieves shift mode settings for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// The cursor is based on syncedAt + Id for stable pagination ordering.
    /// </summary>
    /// <param name="userId">The user identifier who owns the settings.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <returns>A paginated result containing shift mode settings, a cursor for the next page, and a flag indicating more records exist.</returns>
    public async Task<ShiftModeSettingSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor)
    {
        IQueryable<ShiftModeSettingEntity> query = this.context.ShiftModeSettings
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.SyncedAt > lastSyncedAt);

        if (cursor != null)
        {
            (DateTime cursorModifiedAt, Guid cursorId) = DecodeCursor(cursor);

            query = query.Where(s =>
                s.SyncedAt > cursorModifiedAt ||
                (s.SyncedAt == cursorModifiedAt && s.Id.CompareTo(cursorId) > 0));
        }

        List<ShiftModeSettingEntity> results = await query
            .OrderBy(s => s.SyncedAt)
            .ThenBy(s => s.Id)
            .Take(PageSize + 1)
            .ToListAsync();

        bool hasMore = results.Count > PageSize;

        List<ShiftModeSettingEntity> records = hasMore
            ? results.Take(PageSize).ToList()
            : results;

        string? nextCursor = null;
        if (hasMore && records.Count > 0)
        {
            ShiftModeSettingEntity lastRecord = records[^1];
            nextCursor = EncodeCursor(lastRecord.SyncedAt ?? lastRecord.ModifiedAt, lastRecord.Id);
        }

        return new ShiftModeSettingSyncPullResult
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
