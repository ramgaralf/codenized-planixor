// <copyright file="ReminderSyncRecordValidator.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Reminder.Sync;

using Codenized.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// Validates a single reminder record inside a sync push batch.
/// </summary>
/// <remarks>
/// Unlike calendar events and notification records, the reminder push is all-or-nothing — its response carries only
/// a count and has no rejected list — so this is applied through <c>AddItemsValidator</c> from
/// <see cref="ReminderSyncPushRequestValidator"/> and a bad record rejects the request. That matches the semantics
/// the endpoint already had, where an invalid frequency threw for the whole batch.
/// </remarks>
public sealed class ReminderSyncRecordValidator : ValidatorBase<ReminderSyncRecord>
{
    /// <summary>The repetition frequencies the product supports.</summary>
    private static readonly string[] SupportedFrequencies = ["never", "weekly", "monthly", "yearly"];

    /// <summary>
    /// Initializes a new instance of the <see cref="ReminderSyncRecordValidator"/> class.
    /// </summary>
    public ReminderSyncRecordValidator()
    {
        this.AddRuleFor<Guid>(x => x.Id)
            .AddRequirement(x => x.Id != Guid.Empty, "Id is required.");

        this.AddRuleFor<string>(x => x.Name)
            .AddRequirement(x => !string.IsNullOrWhiteSpace(x.Name), "Name is required.");

        this.AddRuleFor<string>(x => x.Icon)
            .AddRequirement(x => !string.IsNullOrWhiteSpace(x.Icon), "Icon is required.");

        this.AddRuleFor<string>(x => x.BackgroundColor)
            .AddRequirement(x => !string.IsNullOrWhiteSpace(x.BackgroundColor), "BackgroundColor is required.");

        this.AddRuleFor<string?>(x => x.SeriesFrequency)
            .AddRequirement(
                HasSupportedFrequency,
                $"SeriesFrequency is not valid. Accepted values are: {string.Join(", ", SupportedFrequencies)}.");

        this.AddRuleFor<string?>(x => x.SeriesEndDate)
            .AddRequirement(HasParsableEndDate, $"SeriesEndDate must be a date in {SyncDate.Format} format.");

        this.AddRuleFor<DateTime>(x => x.ModifiedAt)
            .AddRequirement(x => x.ModifiedAt != default, "ModifiedAt is required.");
    }

    private static bool HasSupportedFrequency(ReminderSyncRecord record)
    {
        // Absent means "never", which the use case substitutes; only a value that is present has to be one we know.
        return string.IsNullOrWhiteSpace(record.SeriesFrequency)
            || SupportedFrequencies.Contains(record.SeriesFrequency, StringComparer.OrdinalIgnoreCase);
    }

    private static bool HasParsableEndDate(ReminderSyncRecord record)
    {
        return string.IsNullOrWhiteSpace(record.SeriesEndDate) || SyncDate.TryParse(record.SeriesEndDate, out _);
    }
}
