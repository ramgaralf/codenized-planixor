// <copyright file="ShiftModeSettingSyncPullService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.ShiftModeSetting.SyncPull;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos.ShiftModeSetting.Sync;
using Codenized.Planixor.UseCases.ShiftModeSetting.SyncPull.Queries;
using Microsoft.Extensions.Logging;

/// <summary>
/// Shift mode setting sync pull service. Retrieves shift mode settings modified after a given timestamp
/// for the authenticated user with cursor-based pagination.
/// </summary>
public sealed class ShiftModeSettingSyncPullService : IInteractorService<ShiftModeSettingSyncPullRequest, ShiftModeSettingSyncPullResponse>
{
    private readonly ILogger<ShiftModeSettingSyncPullService> logger;
    private readonly IShiftModeSettingSyncPullQueries queries;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftModeSettingSyncPullService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="queries">Shift mode setting sync pull queries.</param>
    public ShiftModeSettingSyncPullService(
        ILogger<ShiftModeSettingSyncPullService> logger,
        IShiftModeSettingSyncPullQueries queries)
    {
        this.logger = logger;
        this.queries = queries;
    }

    /// <summary>
    /// Executes the shift mode setting sync pull use case.
    /// </summary>
    /// <param name="request">The shift mode setting sync pull request containing user ID, last synced timestamp, and cursor.</param>
    /// <returns>A <see cref="ShiftModeSettingSyncPullResponse"/> with the records, cursor, and pagination flag.</returns>
    public async Task<ShiftModeSettingSyncPullResponse> Run(ShiftModeSettingSyncPullRequest request)
    {
        DateTime lastSyncedAt = request.LastSyncedAt ?? DateTime.MinValue;

        ShiftModeSettingSyncPullResult result = await this.queries.GetModifiedAfterAsync(
            request.UserId,
            lastSyncedAt,
            request.Cursor);

        List<ShiftModeSettingSyncRecord> records = result.Records.Select(setting => new ShiftModeSettingSyncRecord(
            setting.Id,
            setting.Enabled,
            setting.ModifiedAt,
            setting.IsDeleted)).ToList();

        this.logger.LogInformation(
            "Sync pull for user {UserId}: {Count} shift mode settings returned, HasMore: {HasMore}.",
            request.UserId,
            records.Count,
            result.HasMore);

        return new ShiftModeSettingSyncPullResponse(records, result.Cursor, result.HasMore);
    }
}
