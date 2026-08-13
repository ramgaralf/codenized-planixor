// <copyright file="ShiftSyncPushService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.Shift.SyncPush;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;
using Codenized.Planixor.Core.Entities;
using Codenized.Planixor.Core.ValueObjects;
using Codenized.Planixor.Dtos.Shift.Sync;
using Codenized.Planixor.UseCases.Shift.SyncPush.Commands;
using Microsoft.Extensions.Logging;

/// <summary>
/// Shift sync push service. Receives a batch of shift records from the client,
/// maps them to domain entities, and upserts with last-writer-wins conflict resolution.
/// </summary>
public sealed class ShiftSyncPushService : IInteractorService<ShiftSyncPushRequest, ShiftSyncPushResponse>
{
    /// <summary>The largest batch the use case will process.</summary>
    private const int MaxBatchSize = 100;

    private readonly IShiftSyncPushCommands commands;
    private readonly ILogger<ShiftSyncPushService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftSyncPushService"/> class.
    /// </summary>
    /// <param name="commands">The shift sync push commands.</param>
    /// <param name="logger">The logger.</param>
    public ShiftSyncPushService(
        IShiftSyncPushCommands commands,
        ILogger<ShiftSyncPushService> logger)
    {
        this.commands = commands;
        this.logger = logger;
    }

    /// <summary>
    /// Processes the shift sync push request by mapping DTOs to entities and upserting them.
    /// </summary>
    /// <param name="request">The shift sync push request containing the batch of shift records.</param>
    /// <param name="cancellationToken">Token used to observe cancellation of the originating request.</param>
    /// <returns>A response indicating the number of records synced.</returns>
    public async Task<ShiftSyncPushResponse> Run(ShiftSyncPushRequest request, CancellationToken cancellationToken)
    {
        // The request validator enforces this too, and it is what produces the 400 with the offending
        // field. Repeated here as an invariant: a regression in the validator must not leave the route
        // unbounded, which is exactly the state this entity was in.
        if (request.Shifts.Count > MaxBatchSize)
        {
            throw new BadRequestException(
                "BATCH_SIZE_EXCEEDED",
                "Batch Size Exceeded",
                $"Batch size exceeds maximum of {MaxBatchSize}.");
        }

        this.logger.LogInformation(
            "Processing shift sync push for user {UserId} with {Count} shifts.",
            request.UserId,
            request.Shifts.Count);

        IReadOnlyList<Shift> shifts = request.Shifts
            .Select(item => Shift.CreateFromSync(
                item.Id,
                request.UserId,
                ShiftName.Create(item.Name),
                ShiftIcon.Create(item.Icon),
                ShiftColor.Create(item.BackgroundColor),
                ShiftTime.FromTotalMinutes(item.StartTime),
                ShiftTime.FromTotalMinutes(item.EndTime),
                HoursWorked.Create(item.HoursWorked),
                item.IsActive,
                item.CreatedAt,
                item.ModifiedAt,
                item.IsDeleted))
            .ToList();

        // The count comes back from the repository rather than from the batch size: a record whose identifier
        // already belongs to another account is skipped, so the two are not always the same number.
        int persisted = await this.commands.UpsertAsync(request.UserId, shifts, cancellationToken);

        this.logger.LogInformation(
            "Shift sync push completed for user {UserId}. {Count} shifts processed.",
            request.UserId,
            shifts.Count);

        return new ShiftSyncPushResponse(persisted);
    }
}
