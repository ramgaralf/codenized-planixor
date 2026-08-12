// <copyright file="NotificationRecordSyncPullResult.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.NotificationRecord.SyncPull.Queries;

using Codenized.Planixor.Core.Entities;

/// <summary>
/// Represents the paginated result of a notification record sync pull query.
/// </summary>
public record NotificationRecordSyncPullResult
{
    /// <summary>
    /// Gets the notification records returned in this page (max 100).
    /// </summary>
    required public IReadOnlyList<NotificationRecord> NotificationRecords { get; init; }

    /// <summary>
    /// Gets the cursor to use for retrieving the next page, or null if no more pages.
    /// </summary>
    required public string? Cursor { get; init; }

    /// <summary>
    /// Gets a value indicating whether more records exist beyond this page.
    /// </summary>
    required public bool HasMore { get; init; }
}
