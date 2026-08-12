// <copyright file="NotificationRecordSyncRecordValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.NotificationRecord.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates a single notification record inside a sync push batch.
/// </summary>
/// <remarks>
/// Applied by the use case one record at a time, not through <c>AddItemsValidator</c>: sync is a partial-acceptance
/// protocol, so a malformed record is reported in <c>RejectedIds</c> and the rest of the batch is stored.
/// </remarks>
public sealed class NotificationRecordSyncRecordValidator : ValidatorBase<NotificationRecordSyncRecord>
{
    /// <summary>The alert offsets, in minutes before the event, that the product supports.</summary>
    private static readonly int[] SupportedAlertOffsets = [0, 10, 60, 1440];

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationRecordSyncRecordValidator"/> class.
    /// </summary>
    public NotificationRecordSyncRecordValidator()
    {
        this.AddRuleFor<Guid>(x => x.Id)
            .AddRequirement(x => x.Id != Guid.Empty, "Id is required.");

        this.AddRuleFor<Guid>(x => x.CalendarEventId)
            .AddRequirement(x => x.CalendarEventId != Guid.Empty, "CalendarEventId is required.");

        this.AddRuleFor<int>(x => x.AlertOffset)
            .AddRequirement(
                x => Array.IndexOf(SupportedAlertOffsets, x.AlertOffset) >= 0,
                $"AlertOffset must be one of {string.Join(", ", SupportedAlertOffsets)}.");

        this.AddRuleFor<DateTime>(x => x.TriggerTime)
            .AddRequirement(x => x.TriggerTime != default, "TriggerTime is required.");

        this.AddRuleFor<DateTime>(x => x.ModifiedAt)
            .AddRequirement(x => x.ModifiedAt != default, "ModifiedAt is required.");
    }
}
