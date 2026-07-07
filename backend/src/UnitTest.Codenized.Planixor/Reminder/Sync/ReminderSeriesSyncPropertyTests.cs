// <copyright file="ReminderSeriesSyncPropertyTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Sync;

using FsCheck;
using FsCheck.Fluent;
using FsCheck.NUnit;
using global::Codenized.CleanArchitecture.Exception.Abstractions.BadRequest;
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
    private static readonly string[] ValidFrequencies = ["never", "weekly", "monthly", "yearly"];

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
        Assert.DoesNotThrowAsync(async () => await service.Run(request));
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
        Assert.ThrowsAsync<BadRequestException>(async () => await service.Run(request));
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
        Assert.DoesNotThrowAsync(async () => await service.Run(request));
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

        queries.GetModifiedAfterAsync("testuser", DateTime.MinValue, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [reminder],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ReminderSyncPullResponse response = service.Run(request).GetAwaiter().GetResult();

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
            Arg.Do<IReadOnlyList<Reminder>>(r => capturedReminders = r));

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
        pushService.Run(pushRequest).GetAwaiter().GetResult();

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
            Arg.Do<IReadOnlyList<Reminder>>(r => capturedReminders = r));

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
        pushService.Run(pushRequest).GetAwaiter().GetResult();

        // Assert — The mapped entity preserves the frequency
        Assert.That(capturedReminders, Is.Not.Null);
        Assert.That(capturedReminders[0].SeriesFrequency, Is.EqualTo(input.Frequency));
    }

    /// <summary>
    /// Provides FsCheck arbitrary generators for series frequency property tests.
    /// </summary>
    public sealed class SeriesFrequencyArbitraries
    {
        /// <summary>Generates valid frequency push inputs.</summary>
        /// <returns>An arbitrary for <see cref="ValidFrequencyPushInput"/>.</returns>
        public static Arbitrary<ValidFrequencyPushInput> GenerateValidFrequencyPushInput()
        {
            Gen<ValidFrequencyPushInput> gen =
                from frequencyIndex in Gen.Choose(0, ValidFrequencies.Length - 1)
                select new ValidFrequencyPushInput(ValidFrequencies[frequencyIndex]);

            return gen.ToArbitrary();
        }

        /// <summary>Generates invalid frequency push inputs (non-null, non-whitespace strings not in the valid set).</summary>
        /// <returns>An arbitrary for <see cref="InvalidFrequencyPushInput"/>.</returns>
        public static Arbitrary<InvalidFrequencyPushInput> GenerateInvalidFrequencyPushInput()
        {
            Gen<char> alphanumChar = Gen.Elements(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
                'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
                'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
                '8', '9', '-', '_', '!', '@', '#');

            // Generate strings that are guaranteed not to match any valid frequency (case-insensitive)
            Gen<string> invalidStringGen =
                from length in Gen.Choose(1, 20)
                from chars in alphanumChar.ArrayOf(length)
                let candidate = new string(chars)
                where !ValidFrequencies.Contains(candidate, StringComparer.OrdinalIgnoreCase)
                select candidate;

            Gen<InvalidFrequencyPushInput> gen =
                from value in invalidStringGen
                select new InvalidFrequencyPushInput(value);

            return gen.ToArbitrary();
        }

        /// <summary>Generates null or whitespace frequency inputs.</summary>
        /// <returns>An arbitrary for <see cref="NullOrWhitespaceFrequencyInput"/>.</returns>
        public static Arbitrary<NullOrWhitespaceFrequencyInput> GenerateNullOrWhitespaceFrequencyInput()
        {
            Gen<NullOrWhitespaceFrequencyInput> gen = Gen.Elements(
                new NullOrWhitespaceFrequencyInput(null),
                new NullOrWhitespaceFrequencyInput(string.Empty),
                new NullOrWhitespaceFrequencyInput(" "),
                new NullOrWhitespaceFrequencyInput("  "));

            return gen.ToArbitrary();
        }

        /// <summary>Generates pull mapping inputs with valid frequencies.</summary>
        /// <returns>An arbitrary for <see cref="PullMappingInput"/>.</returns>
        public static Arbitrary<PullMappingInput> GeneratePullMappingInput()
        {
            Gen<PullMappingInput> gen =
                from frequencyIndex in Gen.Choose(0, ValidFrequencies.Length - 1)
                select new PullMappingInput(ValidFrequencies[frequencyIndex]);

            return gen.ToArbitrary();
        }
    }

    /// <summary>
    /// Input record for valid frequency push property tests.
    /// </summary>
#pragma warning disable SA1313 // Parameter names should begin with lower-case letter
    public record ValidFrequencyPushInput(string Frequency);

    /// <summary>
    /// Input record for invalid frequency push property tests.
    /// </summary>
    public record InvalidFrequencyPushInput(string Frequency);

    /// <summary>
    /// Input record for null or whitespace frequency property tests.
    /// </summary>
    public record NullOrWhitespaceFrequencyInput(string? Frequency);

    /// <summary>
    /// Input record for pull mapping property tests.
    /// </summary>
    public record PullMappingInput(string Frequency);
#pragma warning restore SA1313 // Parameter names should begin with lower-case letter
}
