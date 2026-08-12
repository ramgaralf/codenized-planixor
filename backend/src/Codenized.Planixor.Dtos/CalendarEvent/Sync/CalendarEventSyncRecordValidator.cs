// <copyright file="CalendarEventSyncRecordValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.CalendarEvent.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates a single calendar event record inside a sync push batch.
/// </summary>
/// <remarks>
/// Applied by the use case one record at a time, not through <c>AddItemsValidator</c>. Sync is a partial-acceptance
/// protocol: a malformed record is reported in <c>RejectedIds</c> and the rest of the batch is stored, so the client
/// can retry only what failed. Validating the collection as a whole would turn one bad record out of a hundred into
/// a 400 that rejects the other ninety-nine.
/// </remarks>
public sealed class CalendarEventSyncRecordValidator : ValidatorBase<CalendarEventSyncRecord>
{
    /// <summary>The event type that represents a reminder, which has a stricter same-day rule.</summary>
    private const string ReminderEventType = "reminder";

    /// <summary>
    /// Initializes a new instance of the <see cref="CalendarEventSyncRecordValidator"/> class.
    /// </summary>
    public CalendarEventSyncRecordValidator()
    {
        this.AddRuleFor<Guid>(x => x.Id)
            .AddRequirement(x => x.Id != Guid.Empty, "Id is required.");

        this.AddRuleFor<string>(x => x.EventType)
            .AddRequirement(x => !string.IsNullOrWhiteSpace(x.EventType), "EventType is required.");

        this.AddRuleFor<Guid>(x => x.EventTypeId)
            .AddRequirement(x => x.EventTypeId != Guid.Empty, "EventTypeId is required.");

        this.AddRuleFor<string>(x => x.StartDay)
            .AddRequirement(x => SyncDate.TryParse(x.StartDay, out _), $"StartDay must be a date in {SyncDate.Format} format.");

        this.AddRuleFor<string>(x => x.EndDay)
            .AddRequirement(x => SyncDate.TryParse(x.EndDay, out _), $"EndDay must be a date in {SyncDate.Format} format.")
            .AddRequirement(EndsOnOrAfterItStarts, "EndDay must not be before StartDay.");

        this.AddRuleFor<int>(x => x.StartTime)
            .AddRequirement(x => x.StartTime >= 0 && x.StartTime <= 1439, "StartTime must be between 0 and 1439.");

        this.AddRuleFor<int>(x => x.EndTime)
            .AddRequirement(x => x.EndTime >= 0 && x.EndTime <= 1439, "EndTime must be between 0 and 1439.")
            .AddRequirement(ReminderEndsAfterItStarts, "A same-day reminder must end after it starts.");

        this.AddRuleFor<int>(x => x.TotalHours)
            .AddRequirement(x => x.TotalHours >= 0, "TotalHours must not be negative.");
    }

    private static bool EndsOnOrAfterItStarts(CalendarEventSyncRecord record)
    {
        // Only meaningful once both days parse; the format requirement above reports that case on its own.
        if (!SyncDate.TryParse(record.StartDay, out DateOnly startDay) || !SyncDate.TryParse(record.EndDay, out DateOnly endDay))
        {
            return true;
        }

        return endDay >= startDay;
    }

    private static bool ReminderEndsAfterItStarts(CalendarEventSyncRecord record)
    {
        if (!string.Equals(record.EventType, ReminderEventType, StringComparison.Ordinal))
        {
            return true;
        }

        if (!SyncDate.TryParse(record.StartDay, out DateOnly startDay) || !SyncDate.TryParse(record.EndDay, out DateOnly endDay))
        {
            return true;
        }

        return endDay != startDay || record.EndTime > record.StartTime;
    }
}
