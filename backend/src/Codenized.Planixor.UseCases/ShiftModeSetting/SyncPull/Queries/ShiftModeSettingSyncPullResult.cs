// <copyright file="ShiftModeSettingSyncPullResult.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.ShiftModeSetting.SyncPull.Queries;

using Codenized.Planixor.Core.Entities;

/// <summary>
/// Represents the paginated result of a shift mode setting sync pull query.
/// </summary>
public record ShiftModeSettingSyncPullResult
{
    /// <summary>
    /// Gets the shift mode settings returned in this page (max 100).
    /// </summary>
    required public IReadOnlyList<ShiftModeSetting> Records { get; init; }

    /// <summary>
    /// Gets the cursor to use for retrieving the next page, or null if no more pages.
    /// </summary>
    required public string? Cursor { get; init; }

    /// <summary>
    /// Gets a value indicating whether more records exist beyond this page.
    /// </summary>
    required public bool HasMore { get; init; }
}
