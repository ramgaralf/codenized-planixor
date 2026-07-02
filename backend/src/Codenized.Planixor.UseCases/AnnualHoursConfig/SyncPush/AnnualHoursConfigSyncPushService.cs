// <copyright file="AnnualHoursConfigSyncPushService.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPush;

using Codenized.CleanArchitecture.Abstractions.Interactors;
using Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;
using Codenized.Planixor.UseCases.AnnualHoursConfig.SyncPush.Commands;
using Microsoft.Extensions.Logging;
using AnnualHoursConfigEntity = Codenized.Planixor.Core.Entities.AnnualHoursConfig;

/// <summary>
/// Annual hours config sync push service. Receives a batch of annual hours config records
/// from the client, maps them to domain entities, and upserts with last-writer-wins conflict resolution.
/// </summary>
public sealed class AnnualHoursConfigSyncPushService : IInteractorService<AnnualHoursConfigSyncPushRequest, AnnualHoursConfigSyncPushResponse>
{
    private readonly IAnnualHoursConfigSyncPushCommands commands;
    private readonly ILogger<AnnualHoursConfigSyncPushService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AnnualHoursConfigSyncPushService"/> class.
    /// </summary>
    /// <param name="commands">The annual hours config sync push commands.</param>
    /// <param name="logger">The logger.</param>
    public AnnualHoursConfigSyncPushService(
        IAnnualHoursConfigSyncPushCommands commands,
        ILogger<AnnualHoursConfigSyncPushService> logger)
    {
        this.commands = commands;
        this.logger = logger;
    }

    /// <summary>
    /// Processes the annual hours config sync push request by mapping DTOs to entities and upserting them.
    /// </summary>
    /// <param name="request">The annual hours config sync push request containing the batch of records.</param>
    /// <returns>A response indicating the number of records processed.</returns>
    public async Task<AnnualHoursConfigSyncPushResponse> Run(AnnualHoursConfigSyncPushRequest request)
    {
        this.logger.LogInformation(
            "Processing annual hours config sync push for user {UserId} with {Count} records.",
            request.UserId,
            request.Records.Count);

        IReadOnlyList<AnnualHoursConfigEntity> configs = request.Records
            .Select(record => AnnualHoursConfigEntity.CreateFromSync(
                record.Id,
                request.UserId,
                record.Year,
                record.ConfiguredHours,
                record.ModifiedAt,
                record.IsDeleted))
            .ToList();

        await this.commands.UpsertAsync(request.UserId, configs);

        this.logger.LogInformation(
            "Annual hours config sync push completed for user {UserId}. {Count} records processed.",
            request.UserId,
            configs.Count);

        return new AnnualHoursConfigSyncPushResponse(configs.Count);
    }
}
