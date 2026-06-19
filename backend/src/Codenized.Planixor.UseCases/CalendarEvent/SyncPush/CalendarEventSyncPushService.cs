// <copyright file="CalendarEventSyncPushService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.CalendarEvent.SyncPush;

using Codenized.CleanArchitecture.Abstractions.Exceptions;
using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos.CalendarEvent.Sync;
using Codenized.Planixor.UseCases.CalendarEvent.SyncPush.Commands;
using Codenized.Planixor.UseCases.CalendarEvent.SyncPush.Queries;
using Microsoft.Extensions.Logging;
using CalendarEventEntity = Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Calendar event sync push service. Receives a batch of calendar event records from the client,
/// validates each record, enforces ownership, applies last-writer-wins conflict resolution,
/// and returns acknowledged and rejected IDs.
/// </summary>
public sealed class CalendarEventSyncPushService : IInteractorService<CalendarEventSyncPushRequest, CalendarEventSyncPushResponse>
{
    private const int MaxBatchSize = 100;

    private readonly ICalendarEventSyncPushCommands commands;
    private readonly ICalendarEventSyncPushQueries queries;
    private readonly ILogger<CalendarEventSyncPushService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CalendarEventSyncPushService"/> class.
    /// </summary>
    /// <param name="commands">The calendar event sync push commands.</param>
    /// <param name="queries">The calendar event sync push queries.</param>
    /// <param name="logger">The logger.</param>
    public CalendarEventSyncPushService(
        ICalendarEventSyncPushCommands commands,
        ICalendarEventSyncPushQueries queries,
        ILogger<CalendarEventSyncPushService> logger)
    {
        this.commands = commands;
        this.queries = queries;
        this.logger = logger;
    }

    /// <summary>
    /// Processes the calendar event sync push request by validating records, enforcing ownership,
    /// applying LWW conflict resolution, and returning acknowledged/rejected IDs.
    /// </summary>
    /// <param name="request">The calendar event sync push request containing the batch of records.</param>
    /// <returns>A response with acknowledged and rejected record identifiers.</returns>
    public async Task<CalendarEventSyncPushResponse> Run(CalendarEventSyncPushRequest request)
    {
        if (request.Records.Count > MaxBatchSize)
        {
            throw new BadRequestException(
                "BATCH_SIZE_EXCEEDED",
                "Batch Size Exceeded",
                "Batch size exceeds maximum of 100.");
        }

        this.logger.LogInformation(
            "Processing calendar event sync push for user {UserId} with {Count} records.",
            request.UserId,
            request.Records.Count);

        var acknowledgedIds = new List<Guid>();
        var rejectedIds = new List<RejectedRecord>();

        // Step 1: Validate required fields for all records
        var validRecords = new List<CalendarEventSyncRecord>();

        foreach (CalendarEventSyncRecord record in request.Records)
        {
            if (!IsValid(record))
            {
                rejectedIds.Add(new RejectedRecord(record.Id, "Missing required fields"));
            }
            else
            {
                validRecords.Add(record);
            }
        }

        if (validRecords.Count == 0)
        {
            return new CalendarEventSyncPushResponse(acknowledgedIds, rejectedIds);
        }

        // Step 2: Look up which IDs exist globally (to detect ownership conflicts)
        IReadOnlyList<Guid> validIds = validRecords.Select(r => r.Id).ToList();
        IReadOnlySet<Guid> existingIds = await this.queries.GetExistingIdsAsync(validIds);

        // Step 3: Get existing records owned by the user (for LWW comparison)
        IReadOnlyList<CalendarEventEntity> ownedExisting = await this.queries.GetByIdsAsync(validIds, request.UserId);
        Dictionary<Guid, CalendarEventEntity> ownedMap = ownedExisting.ToDictionary(e => e.Id);

        // Step 4: Process each valid record
        var toUpsert = new List<CalendarEventEntity>();

        foreach (CalendarEventSyncRecord record in validRecords)
        {
            bool existsInDb = existingIds.Contains(record.Id);
            bool ownedByUser = ownedMap.ContainsKey(record.Id);

            if (existsInDb && !ownedByUser)
            {
                // Record exists but belongs to another user — reject without exposing data
                rejectedIds.Add(new RejectedRecord(record.Id, "Unauthorized"));
                continue;
            }

            if (existsInDb && ownedByUser)
            {
                // Apply LWW: if existing ModifiedAt >= incoming ModifiedAt, keep existing but still acknowledge
                CalendarEventEntity existing = ownedMap[record.Id];

                if (existing.ModifiedAt >= record.ModifiedAt)
                {
                    // Existing record is newer or same — no update needed, but acknowledge
                    acknowledgedIds.Add(record.Id);
                    continue;
                }

                // Incoming record is newer — apply sync to existing entity
                DateOnly startDay = DateOnly.Parse(record.StartDay);
                DateOnly endDay = DateOnly.Parse(record.EndDay);
                existing.ApplySync(
                    record.EventType,
                    record.EventTypeId,
                    startDay,
                    endDay,
                    record.StartTime,
                    record.EndTime,
                    record.TotalHours,
                    record.Notes,
                    existing.AlertOffsetsJson,
                    record.ModifiedAt,
                    record.IsDeleted);

                toUpsert.Add(existing);
                acknowledgedIds.Add(record.Id);
            }
            else
            {
                // New record — insert with the authenticated UserId
                DateOnly startDay = DateOnly.Parse(record.StartDay);
                DateOnly endDay = DateOnly.Parse(record.EndDay);
                CalendarEventEntity newEvent = CalendarEventEntity.CreateFromSync(
                    record.Id,
                    request.UserId,
                    record.EventType,
                    record.EventTypeId,
                    startDay,
                    endDay,
                    record.StartTime,
                    record.EndTime,
                    record.TotalHours,
                    record.Notes,
                    "[]",
                    record.ModifiedAt,
                    record.IsDeleted);

                toUpsert.Add(newEvent);
                acknowledgedIds.Add(record.Id);
            }
        }

        // Step 5: Persist all upserts in a single batch
        if (toUpsert.Count > 0)
        {
            await this.commands.UpsertBatchAsync(toUpsert);
        }

        this.logger.LogInformation(
            "Calendar event sync push completed for user {UserId}. Acknowledged: {AckCount}, Rejected: {RejCount}.",
            request.UserId,
            acknowledgedIds.Count,
            rejectedIds.Count);

        return new CalendarEventSyncPushResponse(acknowledgedIds, rejectedIds);
    }

    private static bool IsValid(CalendarEventSyncRecord record)
    {
        if (string.IsNullOrWhiteSpace(record.EventType))
        {
            return false;
        }

        if (record.EventTypeId == Guid.Empty)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(record.StartDay))
        {
            return false;
        }

        if (!DateOnly.TryParse(record.StartDay, out DateOnly startDay))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(record.EndDay))
        {
            return false;
        }

        if (!DateOnly.TryParse(record.EndDay, out DateOnly endDay))
        {
            return false;
        }

        if (endDay < startDay)
        {
            return false;
        }

        if (record.StartTime < 0 || record.StartTime > 1439)
        {
            return false;
        }

        if (record.EndTime < 0 || record.EndTime > 1439)
        {
            return false;
        }

        if (record.EventType == "reminder" && endDay == startDay && record.EndTime <= record.StartTime)
        {
            return false;
        }

        if (record.TotalHours < 0)
        {
            return false;
        }

        return true;
    }
}
