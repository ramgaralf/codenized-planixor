// <copyright file="NotificationRecordSyncPullService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.NotificationRecord.SyncPull;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos.NotificationRecord.Sync;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPull.Queries;
using Microsoft.Extensions.Logging;

/// <summary>
/// Notification record sync pull service. Retrieves notification records modified after a given timestamp
/// for the authenticated user with cursor-based pagination.
/// </summary>
public sealed class NotificationRecordSyncPullService : IInteractorService<NotificationRecordSyncPullRequest, NotificationRecordSyncPullResponse>
{
    private readonly ILogger<NotificationRecordSyncPullService> logger;
    private readonly INotificationRecordSyncPullQueries queries;

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationRecordSyncPullService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="queries">Notification record sync pull queries.</param>
    public NotificationRecordSyncPullService(
        ILogger<NotificationRecordSyncPullService> logger,
        INotificationRecordSyncPullQueries queries)
    {
        this.logger = logger;
        this.queries = queries;
    }

    /// <summary>
    /// Executes the notification record sync pull use case.
    /// </summary>
    /// <param name="request">The notification record sync pull request containing user ID, last synced timestamp, and cursor.</param>
    /// <returns>A <see cref="NotificationRecordSyncPullResponse"/> with the notification records and cursor.</returns>
    public async Task<NotificationRecordSyncPullResponse> Run(NotificationRecordSyncPullRequest request)
    {
        DateTime lastSyncedAt = request.LastSyncedAt ?? DateTime.MinValue;

        NotificationRecordSyncPullResult result = await this.queries.GetModifiedAfterAsync(
            request.UserId,
            lastSyncedAt,
            request.Cursor);

        List<NotificationRecordSyncRecord> records = result.NotificationRecords.Select(notificationRecord => new NotificationRecordSyncRecord(
            notificationRecord.Id,
            notificationRecord.CalendarEventId,
            notificationRecord.AlertOffset,
            notificationRecord.TriggerTime,
            notificationRecord.IsDelivered,
            notificationRecord.IsRead,
            notificationRecord.ModifiedAt,
            notificationRecord.IsDeleted)).ToList();

        this.logger.LogInformation(
            "Sync pull for user {UserId}: {Count} notification records returned, HasMore: {HasMore}.",
            request.UserId,
            records.Count,
            result.HasMore);

        return new NotificationRecordSyncPullResponse(records, result.Cursor);
    }
}
