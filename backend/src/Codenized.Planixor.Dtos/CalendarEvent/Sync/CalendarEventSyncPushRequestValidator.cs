// <copyright file="CalendarEventSyncPushRequestValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.CalendarEvent.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates the shape of a calendar event sync push batch.
/// </summary>
/// <remarks>
/// Only batch-level rules live here, because this runs in the validation behaviour and its failures reject the whole
/// request. The records themselves are checked one at a time by the use case through
/// <see cref="CalendarEventSyncRecordValidator"/>, so a malformed record is rejected on its own and the rest of the
/// batch is stored.
/// </remarks>
public sealed class CalendarEventSyncPushRequestValidator : ValidatorBase<CalendarEventSyncPushRequest>
{
    /// <summary>The largest batch the endpoint accepts.</summary>
    public const int MaxBatchSize = 100;

    /// <summary>
    /// Initializes a new instance of the <see cref="CalendarEventSyncPushRequestValidator"/> class.
    /// </summary>
    public CalendarEventSyncPushRequestValidator()
    {
        this.AddRuleFor<List<CalendarEventSyncRecord>>(x => x.Records)
            .AddRequirement(x => x.Records != null && x.Records.Count > 0, "Records collection must contain at least one item.")
            .AddRequirement(x => x.Records != null && x.Records.Count <= MaxBatchSize, $"Batch size exceeds maximum of {MaxBatchSize}.");
    }
}
