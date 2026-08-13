// <copyright file="AnnualHoursConfigSyncPushRequestValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates the annual hours config sync push request payload.
/// </summary>
public sealed class AnnualHoursConfigSyncPushRequestValidator : ValidatorBase<AnnualHoursConfigSyncPushRequest>
{
    /// <summary>
    /// The most records accepted in one push.
    /// </summary>
    /// <remarks>
    /// Both clients chunk their queue to this exact number before pushing, so it is a shared constant rather than a
    /// server-side detail. <c>SyncContractTests</c> reads it back out of their source and fails if the three ever
    /// disagree.
    /// </remarks>
    public const int MaxBatchSize = 100;

    /// <summary>
    /// Initializes a new instance of the <see cref="AnnualHoursConfigSyncPushRequestValidator"/> class.
    /// </summary>
    /// <param name="itemValidator">The validator for individual annual hours config sync records.</param>
    public AnnualHoursConfigSyncPushRequestValidator(IValidator<AnnualHoursConfigSyncRecord> itemValidator)
    {
        this.AddRuleFor<List<AnnualHoursConfigSyncRecord>>(x => x.Records)
            .AddRequirement(x => x.Records != null && x.Records.Count > 0, "Records collection must contain at least one item.")
            .AddRequirement(x => x.Records != null && x.Records.Count <= MaxBatchSize, $"Batch size exceeds maximum of {MaxBatchSize}.")
            .AddItemsValidator(x => x.Records, itemValidator);
    }
}
