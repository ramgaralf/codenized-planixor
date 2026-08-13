// <copyright file="AnnualHoursConfigSyncPullResult.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPull.Queries;

using AnnualHoursConfigEntity = Codenized.Planixor.Core.Entities.AnnualHoursConfig;

/// <summary>
/// Represents the paginated result of an annual hours config sync pull query.
/// </summary>
public record AnnualHoursConfigSyncPullResult
{
    /// <summary>
    /// Gets the annual hours configs returned in this page (max 100).
    /// </summary>
    required public IReadOnlyList<AnnualHoursConfigEntity> Records { get; init; }

    /// <summary>
    /// Gets the cursor to use for retrieving the next page, or null if no more pages.
    /// </summary>
    required public string? Cursor { get; init; }

    /// <summary>
    /// Gets a value indicating whether more records exist beyond this page.
    /// </summary>
    required public bool HasMore { get; init; }
}
