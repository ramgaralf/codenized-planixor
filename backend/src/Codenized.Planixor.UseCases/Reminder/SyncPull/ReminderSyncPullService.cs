// <copyright file="ReminderSyncPullService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.Reminder.SyncPull;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos;
using Codenized.Planixor.Dtos.Reminder.Sync;
using Codenized.Planixor.UseCases.Reminder.SyncPull.Queries;
using Microsoft.Extensions.Logging;

/// <summary>
/// Reminder sync pull service. Retrieves reminders modified after a given timestamp
/// for the authenticated user with cursor-based pagination.
/// </summary>
public sealed class ReminderSyncPullService : IInteractorService<ReminderSyncPullRequest, ReminderSyncPullResponse>
{
    private readonly ILogger<ReminderSyncPullService> logger;
    private readonly IReminderSyncPullQueries queries;

    /// <summary>
    /// Initializes a new instance of the <see cref="ReminderSyncPullService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="queries">Reminder sync pull queries.</param>
    public ReminderSyncPullService(
        ILogger<ReminderSyncPullService> logger,
        IReminderSyncPullQueries queries)
    {
        this.logger = logger;
        this.queries = queries;
    }

    /// <summary>
    /// Executes the reminder sync pull use case.
    /// </summary>
    /// <param name="request">The reminder sync pull request containing user ID, last synced timestamp, and cursor.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A <see cref="ReminderSyncPullResponse"/> with the reminders, cursor, and pagination flag.</returns>
    public async Task<ReminderSyncPullResponse> Run(ReminderSyncPullRequest request, CancellationToken cancellationToken)
    {
        // Normalised, not taken as-is: the value is bound from the query string and compared against a UTC
        // column, so its DateTimeKind decides whether records are skipped or repeated. See SyncWatermark.
        DateTime lastSyncedAt = SyncWatermark.Normalise(request.LastSyncedAt);

        ReminderSyncPullResult result = await this.queries.GetModifiedAfterAsync(
            request.UserId,
            lastSyncedAt,
            request.Cursor,
            cancellationToken);

        List<ReminderSyncRecord> records = result.Reminders.Select(reminder => new ReminderSyncRecord(
            reminder.Id,
            reminder.Name.Value,
            reminder.Icon.Value,
            reminder.BackgroundColor.Value,
            reminder.IsActive,
            reminder.SeriesFrequency,
            reminder.SeriesEndDate,
            reminder.CreatedAt,
            reminder.ModifiedAt,
            reminder.IsDeleted)).ToList();

        this.logger.LogInformation(
            "Sync pull for user {UserId}: {Count} reminders returned, HasMore: {HasMore}.",
            request.UserId,
            records.Count,
            result.HasMore);

        return new ReminderSyncPullResponse(records, result.Cursor, result.HasMore);
    }
}
