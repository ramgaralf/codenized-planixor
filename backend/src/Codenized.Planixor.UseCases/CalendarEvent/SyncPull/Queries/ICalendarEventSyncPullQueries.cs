// <copyright file="ICalendarEventSyncPullQueries.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.CalendarEvent.SyncPull.Queries;

using Codenized.Planixor.Core.Entities;

/// <summary>
/// Defines read operations for calendar event synchronization pull.
/// </summary>
public interface ICalendarEventSyncPullQueries
{
    /// <summary>
    /// Retrieves calendar events for a user that have been modified after the specified timestamp,
    /// using cursor-based pagination with a maximum of 100 records per page.
    /// </summary>
    /// <param name="userId">The user identifier who owns the calendar events.</param>
    /// <param name="lastSyncedAt">The timestamp after which modifications should be returned.</param>
    /// <param name="cursor">The pagination cursor from a previous response, or null for the first page.</param>
    /// <returns>A paginated result containing calendar events, a cursor for the next page, and a flag indicating more records exist.</returns>
    Task<CalendarEventSyncPullResult> GetModifiedAfterAsync(string userId, DateTime lastSyncedAt, string? cursor);
}

/// <summary>
/// Represents the paginated result of a calendar event sync pull query.
/// </summary>
public record CalendarEventSyncPullResult
{
    /// <summary>
    /// Gets the calendar events returned in this page (max 100).
    /// </summary>
    required public IReadOnlyList<CalendarEvent> CalendarEvents { get; init; }

    /// <summary>
    /// Gets the cursor to use for retrieving the next page, or null if no more pages.
    /// </summary>
    required public string? Cursor { get; init; }

    /// <summary>
    /// Gets a value indicating whether more records exist beyond this page.
    /// </summary>
    required public bool HasMore { get; init; }
}
