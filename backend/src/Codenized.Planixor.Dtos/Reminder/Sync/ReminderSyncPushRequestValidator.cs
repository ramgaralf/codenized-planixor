// <copyright file="ReminderSyncPushRequestValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Reminder.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates the reminder sync push request payload.
/// </summary>
public sealed class ReminderSyncPushRequestValidator : ValidatorBase<ReminderSyncPushRequest>
{
    /// <summary>The largest batch the endpoint accepts.</summary>
    public const int MaxBatchSize = 100;

    /// <summary>
    /// Initializes a new instance of the <see cref="ReminderSyncPushRequestValidator"/> class.
    /// </summary>
    /// <param name="recordValidator">The validator for individual reminder records.</param>
    public ReminderSyncPushRequestValidator(IValidator<ReminderSyncRecord> recordValidator)
    {
        this.AddRuleFor<List<ReminderSyncRecord>>(x => x.Records)
            .AddRequirement(x => x.Records != null && x.Records.Count > 0, "Records collection must contain at least one item.")
            .AddRequirement(x => x.Records != null && x.Records.Count <= MaxBatchSize, $"Batch size exceeds maximum of {MaxBatchSize}.")
            .AddItemsValidator(x => x.Records, recordValidator);
    }
}
