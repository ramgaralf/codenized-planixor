// <copyright file="ReminderSeriesSyncPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Sync;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using global::Codenized.Planixor.Dtos.Reminder.Sync;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull.Queries;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

/// <summary>
/// Property-based tests for SeriesFrequency validation and sync round-trip.
/// Feature: gh38-reminder-series.
/// Validates: Requirements 1.4, 6.1, 6.3.
/// </summary>
[TestFixture]
[Category("Feature: gh38-reminder-series")]
public sealed class ReminderSeriesSyncPropertyTests
{
    internal static readonly string[] ValidFrequencies = ["never", "weekly", "monthly", "yearly"];

    /// <summary>
    /// Property 2: For any string that is one of the 4 valid frequency values, the push service
    /// SHALL accept the record without throwing a validation error.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.4, 6.3</strong>
    /// </remarks>
    /// <param name="input">A valid frequency push input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SeriesFrequencyArbitraries) })]
    [Category("Property 2: Frequency Value Validation")]
    public void FrequencyValidation_ValidValue_AcceptedByPushService(ValidFrequencyPushInput input)
    {
        // Arrange
        IReminderSyncPushCommands commands = Substitute.For<IReminderSyncPushCommands>();
        ILogger<ReminderSyncPushService> logger = Substitute.For<ILogger<ReminderSyncPushService>>();
        ReminderSyncPushService service = new ReminderSyncPushService(commands, logger);

        ReminderSyncRecord record = new ReminderSyncRecord(
            Guid.NewGuid(),
            "Test Reminder",
            "\U0001F514",
            "#EF4444",
            true,
            input.Frequency,
            null,
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow,
            false);

        ReminderSyncPushRequest request = new ReminderSyncPushRequest([record]) { UserId = "testuser" };

        // Act & Assert — should NOT throw
        Assert.DoesNotThrowAsync(async () => await service.Run(request, CancellationToken.None));
    }

    /// <summary>
    /// Property 2: For any string that is NOT one of the 4 valid frequency values and is not
    /// null/whitespace, the push service SHALL reject the batch with a BadRequestException.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.4, 6.3</strong>
    /// </remarks>
    /// <param name="input">An invalid frequency push input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SeriesFrequencyArbitraries) })]
    [Category("Property 2: Frequency Value Validation")]
    public void FrequencyValidation_InvalidValue_RejectedByPushService(InvalidFrequencyPushInput input)
    {
        // Arrange
        IReminderSyncPushCommands commands = Substitute.For<IReminderSyncPushCommands>();
        ILogger<ReminderSyncPushService> logger = Substitute.For<ILogger<ReminderSyncPushService>>();
        ReminderSyncPushService service = new ReminderSyncPushService(commands, logger);

        ReminderSyncRecord record = new ReminderSyncRecord(
            Guid.NewGuid(),
            "Test Reminder",
            "\U0001F514",
            "#EF4444",
            true,
            input.Frequency,
            null,
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow,
            false);

        ReminderSyncPushRequest request = new ReminderSyncPushRequest([record]) { UserId = "testuser" };

        // Act & Assert — should throw BadRequestException
        Assert.ThrowsAsync<BadRequestException>(async () => await service.Run(request, CancellationToken.None));
    }

    /// <summary>
    /// Property 2: Null or whitespace SeriesFrequency values are accepted by the push service
    /// (they default to "never" internally).
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 1.4, 6.3</strong>
    /// </remarks>
    /// <param name="input">A null or whitespace frequency input.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SeriesFrequencyArbitraries) })]
    [Category("Property 2: Frequency Value Validation")]
    public void FrequencyValidation_NullOrWhitespace_AcceptedByPushService(NullOrWhitespaceFrequencyInput input)
    {
        // Arrange
        IReminderSyncPushCommands commands = Substitute.For<IReminderSyncPushCommands>();
        ILogger<ReminderSyncPushService> logger = Substitute.For<ILogger<ReminderSyncPushService>>();
        ReminderSyncPushService service = new ReminderSyncPushService(commands, logger);

        ReminderSyncRecord record = new ReminderSyncRecord(
            Guid.NewGuid(),
            "Test Reminder",
            "\U0001F514",
            "#EF4444",
            true,
            input.Frequency,
            null,
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow,
            false);

        ReminderSyncPushRequest request = new ReminderSyncPushRequest([record]) { UserId = "testuser" };

        // Act & Assert — should NOT throw (null/whitespace defaults to "never")
        Assert.DoesNotThrowAsync(async () => await service.Run(request, CancellationToken.None));
    }

    /// <summary>
    /// Property 3: For any reminder entity with a valid SeriesFrequency, the sync pull service
    /// SHALL include the SeriesFrequency field in the response record.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.1</strong>
    /// </remarks>
    /// <param name="input">A reminder with a valid frequency for pull mapping.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SeriesFrequencyArbitraries) })]
    [Category("Property 3: Sync Serialization Round-Trip")]
    public void SyncPullMapping_ValidFrequency_IncludedInResponse(PullMappingInput input)
    {
        // Arrange
        IReminderSyncPullQueries queries = Substitute.For<IReminderSyncPullQueries>();
        ILogger<ReminderSyncPullService> logger = Substitute.For<ILogger<ReminderSyncPullService>>();
        ReminderSyncPullService service = new ReminderSyncPullService(logger, queries);

        Reminder reminder = Reminder.CreateFromSync(
            Guid.NewGuid(),
            "testuser",
            ReminderName.Create("Test"),
            ReminderIcon.Create("\U0001F514"),
            ReminderColor.Create("#EF4444"),
            true,
            input.Frequency,
            string.Empty,
            DateTime.UtcNow.AddDays(-10),
            DateTime.UtcNow,
            false);

        ReminderSyncPullRequest request = new ReminderSyncPullRequest("testuser", DateTime.MinValue, null);

        queries.GetModifiedAfterAsync("testuser", DateTime.MinValue, null, CancellationToken.None)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [reminder],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ReminderSyncPullResponse response = service.Run(request, CancellationToken.None).GetAwaiter().GetResult();

        // Assert
        Assert.That(response.Records, Has.Count.EqualTo(1));
        Assert.That(response.Records[0].SeriesFrequency, Is.EqualTo(input.Frequency));
    }

    /// <summary>
    /// Property 3: For any reminder with null or whitespace SeriesFrequency pushed via the service,
    /// the entity SHALL store "never" as the SeriesFrequency value, and pulling it back SHALL
    /// return "never" in the response.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.1</strong>
    /// </remarks>
    /// <param name="input">A null or whitespace frequency input for round-trip testing.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SeriesFrequencyArbitraries) })]
    [Category("Property 3: Sync Serialization Round-Trip")]
    public void SyncRoundTrip_NullOrMissingFrequency_DefaultsToNever(NullOrWhitespaceFrequencyInput input)
    {
        // Arrange
        IReminderSyncPushCommands commands = Substitute.For<IReminderSyncPushCommands>();
        ILogger<ReminderSyncPushService> pushLogger = Substitute.For<ILogger<ReminderSyncPushService>>();
        ReminderSyncPushService pushService = new ReminderSyncPushService(commands, pushLogger);

        IReadOnlyList<Reminder> capturedReminders = null!;
        commands.UpsertAsync(
            Arg.Any<string>(),
            Arg.Do<IReadOnlyList<Reminder>>(r => capturedReminders = r),
            Arg.Any<CancellationToken>());

        ReminderSyncRecord record = new ReminderSyncRecord(
            Guid.NewGuid(),
            "Test Reminder",
            "\U0001F514",
            "#EF4444",
            true,
            input.Frequency,
            null,
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow,
            false);

        ReminderSyncPushRequest pushRequest = new ReminderSyncPushRequest([record]) { UserId = "testuser" };

        // Act — Push with null/whitespace frequency
        pushService.Run(pushRequest, CancellationToken.None).GetAwaiter().GetResult();

        // Assert — The mapped entity has "never" as SeriesFrequency
        Assert.That(capturedReminders, Is.Not.Null);
        Assert.That(capturedReminders[0].SeriesFrequency, Is.EqualTo("never"));
    }

    /// <summary>
    /// Property 3: For any valid SeriesFrequency value pushed through the service, the mapped
    /// entity SHALL preserve that exact frequency value.
    /// </summary>
    /// <remarks>
    /// <strong>Validates: Requirements 6.1</strong>
    /// </remarks>
    /// <param name="input">A valid frequency push input for round-trip testing.</param>
    [FsCheck.NUnit.Property(MaxTest = 100, Arbitrary = new[] { typeof(SeriesFrequencyArbitraries) })]
    [Category("Property 3: Sync Serialization Round-Trip")]
    public void SyncRoundTrip_ValidFrequency_PreservedInMappedEntity(ValidFrequencyPushInput input)
    {
        // Arrange
        IReminderSyncPushCommands commands = Substitute.For<IReminderSyncPushCommands>();
        ILogger<ReminderSyncPushService> pushLogger = Substitute.For<ILogger<ReminderSyncPushService>>();
        ReminderSyncPushService pushService = new ReminderSyncPushService(commands, pushLogger);

        IReadOnlyList<Reminder> capturedReminders = null!;
        commands.UpsertAsync(
            Arg.Any<string>(),
            Arg.Do<IReadOnlyList<Reminder>>(r => capturedReminders = r),
            Arg.Any<CancellationToken>());

        ReminderSyncRecord record = new ReminderSyncRecord(
            Guid.NewGuid(),
            "Test Reminder",
            "\U0001F514",
            "#EF4444",
            true,
            input.Frequency,
            null,
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow,
            false);

        ReminderSyncPushRequest pushRequest = new ReminderSyncPushRequest([record]) { UserId = "testuser" };

        // Act
        pushService.Run(pushRequest, CancellationToken.None).GetAwaiter().GetResult();

        // Assert — The mapped entity preserves the frequency
        Assert.That(capturedReminders, Is.Not.Null);
        Assert.That(capturedReminders[0].SeriesFrequency, Is.EqualTo(input.Frequency));
    }
}
