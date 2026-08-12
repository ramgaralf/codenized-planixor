// <copyright file="ReminderSyncPullResult.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.Reminder.SyncPull.Queries;

using Codenized.Planixor.Core.Entities;

/// <summary>
/// Represents the paginated result of a reminder sync pull query.
/// </summary>
public record ReminderSyncPullResult
{
    /// <summary>
    /// Gets the reminders returned in this page (max 100).
    /// </summary>
    required public IReadOnlyList<Reminder> Reminders { get; init; }

    /// <summary>
    /// Gets the cursor to use for retrieving the next page, or null if no more pages.
    /// </summary>
    required public string? Cursor { get; init; }

    /// <summary>
    /// Gets a value indicating whether more records exist beyond this page.
    /// </summary>
    required public bool HasMore { get; init; }
}
