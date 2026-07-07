// <copyright file="ReminderSyncPushService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.Reminder.SyncPush;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.CleanArchitecture.Exception.Abstractions.BadRequest;
using Codenized.Planixor.Core.Entities;
using Codenized.Planixor.Core.ValueObjects;
using Codenized.Planixor.Dtos.Reminder.Sync;
using Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;
using Microsoft.Extensions.Logging;

/// <summary>
/// Reminder sync push service. Receives a batch of reminder records from the client,
/// maps them to domain entities, and upserts with last-writer-wins conflict resolution.
/// </summary>
public sealed class ReminderSyncPushService : IInteractorService<ReminderSyncPushRequest, ReminderSyncPushResponse>
{
    private const int MaxBatchSize = 100;

    private readonly IReminderSyncPushCommands commands;
    private readonly ILogger<ReminderSyncPushService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ReminderSyncPushService"/> class.
    /// </summary>
    /// <param name="commands">The reminder sync push commands.</param>
    /// <param name="logger">The logger.</param>
    public ReminderSyncPushService(
        IReminderSyncPushCommands commands,
        ILogger<ReminderSyncPushService> logger)
    {
        this.commands = commands;
        this.logger = logger;
    }

    private static readonly HashSet<string> ValidFrequencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "never",
        "weekly",
        "monthly",
        "yearly",
    };

    /// <summary>
    /// Processes the reminder sync push request by mapping DTOs to entities and upserting them.
    /// </summary>
    /// <param name="request">The reminder sync push request containing the batch of reminder records.</param>
    /// <returns>A response indicating the number of records synced.</returns>
    public async Task<ReminderSyncPushResponse> Run(ReminderSyncPushRequest request)
    {
        if (request.Records.Count > MaxBatchSize)
        {
            throw new BadRequestException(
                "BATCH_SIZE_EXCEEDED",
                "Batch Size Exceeded",
                "Batch size exceeds maximum of 100.");
        }

        this.ValidateSeriesFrequencies(request.Records);

        this.logger.LogInformation(
            "Processing reminder sync push for user {UserId} with {Count} reminders.",
            request.UserId,
            request.Records.Count);

        IReadOnlyList<Reminder> reminders = request.Records
            .Select(item => Reminder.CreateFromSync(
                item.Id,
                request.UserId,
                ReminderName.Create(item.Name),
                ReminderIcon.Create(item.Icon),
                ReminderColor.Create(item.BackgroundColor),
                item.IsActive,
                string.IsNullOrWhiteSpace(item.SeriesFrequency) ? "never" : item.SeriesFrequency,
                item.SeriesEndDate ?? string.Empty,
                item.CreatedAt,
                item.ModifiedAt,
                item.IsDeleted))
            .ToList();

        await this.commands.UpsertAsync(request.UserId, reminders);

        this.logger.LogInformation(
            "Reminder sync push completed for user {UserId}. {Count} reminders processed.",
            request.UserId,
            reminders.Count);

        return new ReminderSyncPushResponse(reminders.Count);
    }

    private void ValidateSeriesFrequencies(List<ReminderSyncRecord> records)
    {
        foreach (ReminderSyncRecord record in records)
        {
            if (!string.IsNullOrWhiteSpace(record.SeriesFrequency)
                && !ValidFrequencies.Contains(record.SeriesFrequency))
            {
                throw new BadRequestException(
                    "INVALID_SERIES_FREQUENCY",
                    "Invalid Series Frequency",
                    $"The seriesFrequency value '{record.SeriesFrequency}' is not valid. Accepted values are: never, weekly, monthly, yearly.");
            }
        }
    }
}
