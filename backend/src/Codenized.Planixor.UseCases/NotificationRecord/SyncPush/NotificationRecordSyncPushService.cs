// <copyright file="NotificationRecordSyncPushService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.NotificationRecord.SyncPush;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.CleanArchitecture.Exception.Abstractions.BadRequest;
using Codenized.Planixor.Dtos.NotificationRecord.Sync;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Commands;
using Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Queries;
using Microsoft.Extensions.Logging;
using NotificationRecordEntity = Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Notification record sync push service. Receives a batch of notification records from the client,
/// validates each record, enforces ownership, applies last-writer-wins conflict resolution,
/// and returns acknowledged and rejected IDs.
/// </summary>
public sealed class NotificationRecordSyncPushService : IInteractorService<NotificationRecordSyncPushRequest, NotificationRecordSyncPushResponse>
{
    private const int MaxBatchSize = 100;

    private readonly INotificationRecordSyncPushCommands commands;
    private readonly INotificationRecordSyncPushQueries queries;
    private readonly ILogger<NotificationRecordSyncPushService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationRecordSyncPushService"/> class.
    /// </summary>
    /// <param name="commands">The notification record sync push commands.</param>
    /// <param name="queries">The notification record sync push queries.</param>
    /// <param name="logger">The logger.</param>
    public NotificationRecordSyncPushService(
        INotificationRecordSyncPushCommands commands,
        INotificationRecordSyncPushQueries queries,
        ILogger<NotificationRecordSyncPushService> logger)
    {
        this.commands = commands;
        this.queries = queries;
        this.logger = logger;
    }

    /// <summary>
    /// Processes the notification record sync push request by validating records, enforcing ownership,
    /// applying LWW conflict resolution, and returning acknowledged/rejected IDs.
    /// </summary>
    /// <param name="request">The notification record sync push request containing the batch of records.</param>
    /// <returns>A response with acknowledged and rejected record identifiers.</returns>
    public async Task<NotificationRecordSyncPushResponse> Run(NotificationRecordSyncPushRequest request)
    {
        if (request.Records.Count > MaxBatchSize)
        {
            throw new BadRequestException(
                "BATCH_SIZE_EXCEEDED",
                "Batch Size Exceeded",
                "Batch size exceeds maximum of 100.");
        }

        this.logger.LogInformation(
            "Processing notification record sync push for user {UserId} with {Count} records.",
            request.UserId,
            request.Records.Count);

        var acknowledgedIds = new List<Guid>();
        var rejectedIds = new List<NotificationRecordRejectedRecord>();

        // Step 1: Validate required fields for all records
        var validRecords = new List<NotificationRecordSyncRecord>();

        foreach (NotificationRecordSyncRecord record in request.Records)
        {
            if (!IsValid(record))
            {
                rejectedIds.Add(new NotificationRecordRejectedRecord(record.Id, "Missing required fields"));
            }
            else
            {
                validRecords.Add(record);
            }
        }

        if (validRecords.Count == 0)
        {
            return new NotificationRecordSyncPushResponse(acknowledgedIds, rejectedIds);
        }

        // Step 2: Look up which IDs exist globally (to detect ownership conflicts)
        IReadOnlyList<Guid> validIds = validRecords.Select(r => r.Id).ToList();
        IReadOnlySet<Guid> existingIds = await this.queries.GetExistingIdsAsync(validIds);

        // Step 3: Get existing records owned by the user (for LWW comparison)
        IReadOnlyList<NotificationRecordEntity> ownedExisting = await this.queries.GetByIdsAsync(validIds, request.UserId);
        Dictionary<Guid, NotificationRecordEntity> ownedMap = ownedExisting.ToDictionary(e => e.Id);

        // Step 4: Process each valid record
        var toUpsert = new List<NotificationRecordEntity>();

        foreach (NotificationRecordSyncRecord record in validRecords)
        {
            bool existsInDb = existingIds.Contains(record.Id);
            bool ownedByUser = ownedMap.ContainsKey(record.Id);

            if (existsInDb && !ownedByUser)
            {
                // Record exists but belongs to another user — reject without exposing data
                rejectedIds.Add(new NotificationRecordRejectedRecord(record.Id, "Unauthorized"));
                continue;
            }

            if (existsInDb && ownedByUser)
            {
                // Apply LWW: if existing ModifiedAt >= incoming ModifiedAt, keep existing but still acknowledge
                NotificationRecordEntity existing = ownedMap[record.Id];

                if (existing.ModifiedAt >= record.ModifiedAt)
                {
                    // Existing record is newer or same — no update needed, but acknowledge
                    acknowledgedIds.Add(record.Id);
                    continue;
                }

                // Incoming record is newer — apply sync to existing entity
                existing.ApplySync(
                    record.CalendarEventId,
                    record.AlertOffset,
                    record.TriggerTime,
                    record.IsDelivered,
                    record.IsRead,
                    record.ModifiedAt,
                    record.IsDeleted);

                toUpsert.Add(existing);
                acknowledgedIds.Add(record.Id);
            }
            else
            {
                // New record — insert with the authenticated UserId
                NotificationRecordEntity newRecord = NotificationRecordEntity.CreateFromSync(
                    record.Id,
                    request.UserId,
                    record.CalendarEventId,
                    record.AlertOffset,
                    record.TriggerTime,
                    record.IsDelivered,
                    record.IsRead,
                    record.ModifiedAt,
                    record.IsDeleted);

                toUpsert.Add(newRecord);
                acknowledgedIds.Add(record.Id);
            }
        }

        // Step 5: Persist all upserts in a single batch
        if (toUpsert.Count > 0)
        {
            await this.commands.UpsertAsync(request.UserId, toUpsert);
        }

        this.logger.LogInformation(
            "Notification record sync push completed for user {UserId}. Acknowledged: {AckCount}, Rejected: {RejCount}.",
            request.UserId,
            acknowledgedIds.Count,
            rejectedIds.Count);

        return new NotificationRecordSyncPushResponse(acknowledgedIds, rejectedIds);
    }

    private static bool IsValid(NotificationRecordSyncRecord record)
    {
        if (record.Id == Guid.Empty)
        {
            return false;
        }

        if (record.CalendarEventId == Guid.Empty)
        {
            return false;
        }

        if (record.AlertOffset != 0 && record.AlertOffset != 10 && record.AlertOffset != 60 && record.AlertOffset != 1440)
        {
            return false;
        }

        if (record.TriggerTime == default)
        {
            return false;
        }

        if (record.ModifiedAt == default)
        {
            return false;
        }

        return true;
    }
}
