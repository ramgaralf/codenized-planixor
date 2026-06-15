// <copyright file="ShiftSyncPullService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.Shift.SyncPull;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos.Shift.Sync;
using Codenized.Planixor.UseCases.Shift.SyncPull.Queries;
using Microsoft.Extensions.Logging;

/// <summary>
/// Shift sync pull service. Retrieves shifts modified after a given timestamp
/// for the authenticated user with cursor-based pagination.
/// </summary>
public sealed class ShiftSyncPullService : IInteractorService<ShiftSyncPullRequest, ShiftSyncPullResponse>
{
    private readonly ILogger<ShiftSyncPullService> logger;
    private readonly IShiftSyncPullQueries queries;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftSyncPullService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="queries">Shift sync pull queries.</param>
    public ShiftSyncPullService(
        ILogger<ShiftSyncPullService> logger,
        IShiftSyncPullQueries queries)
    {
        this.logger = logger;
        this.queries = queries;
    }

    /// <summary>
    /// Executes the shift sync pull use case.
    /// </summary>
    /// <param name="request">The shift sync pull request containing user ID, last synced timestamp, and cursor.</param>
    /// <returns>A <see cref="ShiftSyncPullResponse"/> with the shifts, cursor, and pagination flag.</returns>
    public async Task<ShiftSyncPullResponse> Run(ShiftSyncPullRequest request)
    {
        DateTime lastSyncedAt = request.LastSyncedAt ?? DateTime.MinValue;

        ShiftSyncPullResult result = await this.queries.GetModifiedAfterAsync(
            request.UserId,
            lastSyncedAt,
            request.Cursor);

        List<ShiftSyncItem> shifts = result.Shifts.Select(shift => new ShiftSyncItem(
            shift.Id,
            shift.Name.Value,
            shift.Icon.Value,
            shift.BackgroundColor.Value,
            shift.StartTime.TotalMinutes,
            shift.EndTime.TotalMinutes,
            shift.HoursWorked.TotalMinutes,
            shift.IsActive,
            shift.CreatedAt,
            shift.ModifiedAt,
            shift.IsDeleted)).ToList();

        this.logger.LogInformation(
            "Sync pull for user {UserId}: {Count} shifts returned, HasMore: {HasMore}.",
            request.UserId,
            shifts.Count,
            result.HasMore);

        return new ShiftSyncPullResponse(shifts, result.Cursor, result.HasMore);
    }
}
