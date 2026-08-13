// <copyright file="NotificationRecordSyncPushRequestValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.NotificationRecord.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates the shape of a notification record sync push batch.
/// </summary>
/// <remarks>
/// Batch-level rules only: this runs in the validation behaviour and its failures reject the whole request. The
/// records are checked individually by the use case through <see cref="NotificationRecordSyncRecordValidator"/>.
/// </remarks>
public sealed class NotificationRecordSyncPushRequestValidator : ValidatorBase<NotificationRecordSyncPushRequest>
{
    /// <summary>The largest batch the endpoint accepts.</summary>
    public const int MaxBatchSize = 100;

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationRecordSyncPushRequestValidator"/> class.
    /// </summary>
    public NotificationRecordSyncPushRequestValidator()
    {
        this.AddRuleFor<List<NotificationRecordSyncRecord>>(x => x.Records)
            .AddRequirement(x => x.Records != null && x.Records.Count > 0, "Records collection must contain at least one item.")
            .AddRequirement(x => x.Records != null && x.Records.Count <= MaxBatchSize, $"Batch size exceeds maximum of {MaxBatchSize}.");
    }
}
