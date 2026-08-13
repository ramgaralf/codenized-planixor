// <copyright file="CalendarEventSyncPullResult.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.CalendarEvent.SyncPull.Queries;

using Codenized.Planixor.Core.Entities;

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
