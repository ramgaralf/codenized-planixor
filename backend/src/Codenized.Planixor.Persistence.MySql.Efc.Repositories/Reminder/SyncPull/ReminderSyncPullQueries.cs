// <copyright file="ReminderSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories.Reminder.SyncPull;

using Codenized.CleanArchitecture.Persistence.Abstractions.Interfaces;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.Planixor.UseCases.Reminder.SyncPull.Queries;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using ReminderEntity = Codenized.Planixor.Core.Entities.Reminder;

/// <summary>
/// Repository implementation for querying reminder records during sync pull.
/// Returns reminders modified after a given timestamp with cursor-based pagination.
/// </summary>
public sealed class ReminderSyncPullQueries : IReminderSyncPullQueries, IRepository
{
    private const int PageSize = 100;
    private const string CursorSeparator = "|";
    private const string DateTimeFormat = "o";

    private readonly ApplicationReadContext context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ReminderSyncPullQueries"/> class.
    /// </summary>
    /// <param name="context">The application read context.</param>
    public ReminderSyncPullQueries(ApplicationReadContext context)
    {
        this.context = context;
    }

    /// <summary>
    /// Retrieves reminders for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// The cursor is based on modifiedAt + Id for stable pagination ordering.
    /// </summary>
    /// <param name="userId">The user identifier who owns the reminders.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <returns>A paginated result containing reminders, a cursor for the next page, and a flag indicating more records exist.</returns>
    public async Task<ReminderSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor)
    {
        IQueryable<ReminderEntity> query = this.context.Reminders
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.SyncedAt > lastSyncedAt);

        if (cursor != null)
        {
            (DateTime cursorModifiedAt, Guid cursorId) = DecodeCursor(cursor);

            query = query.Where(r =>
                r.SyncedAt > cursorModifiedAt ||
                (r.SyncedAt == cursorModifiedAt && r.Id.CompareTo(cursorId) > 0));
        }

        List<ReminderEntity> results = await query
            .OrderBy(r => r.SyncedAt)
            .ThenBy(r => r.Id)
            .Take(PageSize + 1)
            .ToListAsync();

        bool hasMore = results.Count > PageSize;

        List<ReminderEntity> reminders = hasMore
            ? results.Take(PageSize).ToList()
            : results;

        string? nextCursor = null;
        if (hasMore && reminders.Count > 0)
        {
            ReminderEntity lastReminder = reminders[^1];
            nextCursor = EncodeCursor(lastReminder.SyncedAt ?? lastReminder.ModifiedAt, lastReminder.Id);
        }

        return new ReminderSyncPullResult
        {
            Reminders = reminders,
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
