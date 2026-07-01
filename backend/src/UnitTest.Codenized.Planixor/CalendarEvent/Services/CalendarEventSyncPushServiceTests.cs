// <copyright file="CalendarEventSyncPushServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.CalendarEvent.Services;

using global::Codenized.CleanArchitecture.Exception.Abstractions.BadRequest;
using global::Codenized.Planixor.Dtos.CalendarEvent.Sync;
using global::Codenized.Planixor.UseCases.CalendarEvent.SyncPush;
using global::Codenized.Planixor.UseCases.CalendarEvent.SyncPush.Commands;
using global::Codenized.Planixor.UseCases.CalendarEvent.SyncPush.Queries;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

using CalendarEventEntity = global::Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Unit tests for <see cref="CalendarEventSyncPushService"/>.
/// </summary>
[TestFixture]
public sealed class CalendarEventSyncPushServiceTests
{
    private ICalendarEventSyncPushCommands commands = null!;
    private ICalendarEventSyncPushQueries queries = null!;
    private ILogger<CalendarEventSyncPushService> logger = null!;
    private CalendarEventSyncPushService service = null!;

    /// <summary>
    /// Sets up test dependencies.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.commands = Substitute.For<ICalendarEventSyncPushCommands>();
        this.queries = Substitute.For<ICalendarEventSyncPushQueries>();
        this.logger = Substitute.For<ILogger<CalendarEventSyncPushService>>();
        this.service = new CalendarEventSyncPushService(this.commands, this.queries, this.logger);
    }

    /// <summary>
    /// Run with missing required fields rejects records.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithMissingRequiredFields_RejectsRecords()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        var invalidRecord = new CalendarEventSyncRecord(
            recordId,
            string.Empty,
            Guid.Empty,
            string.Empty,
            string.Empty,
            0,
            0,
            0,
            null,
            [],
            DateTime.UtcNow,
            false);

        var request = new CalendarEventSyncPushRequest([invalidRecord]) { UserId = userId };

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Is.Empty);
        Assert.That(response.RejectedIds, Has.Count.EqualTo(1));
        Assert.That(response.RejectedIds[0].Id, Is.EqualTo(recordId));
        Assert.That(response.RejectedIds[0].Reason, Is.EqualTo("Missing required fields"));
    }

    /// <summary>
    /// Run with record not owned by user rejects with unauthorized.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithRecordNotOwnedByUser_RejectsWithUnauthorized()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        CalendarEventSyncRecord record = CreateValidRecord(recordId);

        var request = new CalendarEventSyncPushRequest([record]) { UserId = userId };

        // Record exists globally but is NOT owned by this user
        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid> { recordId });
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<CalendarEventEntity>());

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Is.Empty);
        Assert.That(response.RejectedIds, Has.Count.EqualTo(1));
        Assert.That(response.RejectedIds[0].Id, Is.EqualTo(recordId));
        Assert.That(response.RejectedIds[0].Reason, Is.EqualTo("Unauthorized"));
    }

    /// <summary>
    /// Run with newer remote record updates existing record (LWW resolution).
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithNewerRemoteRecord_UpdatesExistingRecord()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        DateTime olderTimestamp = new DateTime(2024, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        DateTime newerTimestamp = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        CalendarEventSyncRecord incomingRecord = new CalendarEventSyncRecord(
            recordId,
            "shift",
            Guid.NewGuid(),
            "2024-06-15",
            "2024-06-15",
            480,
            960,
            480,
            "Updated notes",
            [],
            newerTimestamp,
            false);

        CalendarEventEntity existingEntity = CalendarEventEntity.CreateFromSync(
            recordId,
            userId,
            "shift",
            Guid.NewGuid(),
            DateOnly.Parse("2024-06-15"),
            DateOnly.Parse("2024-06-15"),
            480,
            960,
            480,
            "Old notes",
            "[]",
            olderTimestamp,
            false);

        var request = new CalendarEventSyncPushRequest([incomingRecord]) { UserId = userId };

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid> { recordId });
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<CalendarEventEntity> { existingEntity });

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Contains.Item(recordId));
        await this.commands.Received(1).UpsertBatchAsync(
            Arg.Is<IReadOnlyList<CalendarEventEntity>>(list => list.Count == 1));
    }

    /// <summary>
    /// Run with older remote record acknowledges without updating.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithOlderRemoteRecord_AcknowledgesWithoutUpdating()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        DateTime newerTimestamp = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);
        DateTime olderTimestamp = new DateTime(2024, 1, 10, 8, 0, 0, DateTimeKind.Utc);

        CalendarEventSyncRecord incomingRecord = new CalendarEventSyncRecord(
            recordId,
            "shift",
            Guid.NewGuid(),
            "2024-06-15",
            "2024-06-15",
            480,
            960,
            480,
            "Old notes",
            [],
            olderTimestamp,
            false);

        CalendarEventEntity existingEntity = CalendarEventEntity.CreateFromSync(
            recordId,
            userId,
            "shift",
            Guid.NewGuid(),
            DateOnly.Parse("2024-06-15"),
            DateOnly.Parse("2024-06-15"),
            480,
            960,
            480,
            "Current notes",
            "[]",
            newerTimestamp,
            false);

        var request = new CalendarEventSyncPushRequest([incomingRecord]) { UserId = userId };

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid> { recordId });
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<CalendarEventEntity> { existingEntity });

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Contains.Item(recordId));
        await this.commands.DidNotReceive().UpsertBatchAsync(Arg.Any<IReadOnlyList<CalendarEventEntity>>());
    }

    /// <summary>
    /// Run with new record inserts new record.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithNewRecord_InsertsNewRecord()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        CalendarEventSyncRecord record = CreateValidRecord(recordId);

        var request = new CalendarEventSyncPushRequest([record]) { UserId = userId };

        // Record does not exist in the DB at all
        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<CalendarEventEntity>());

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Contains.Item(recordId));
        await this.commands.Received(1).UpsertBatchAsync(
            Arg.Is<IReadOnlyList<CalendarEventEntity>>(list =>
                list.Count == 1 && list[0].Id == recordId && list[0].UserId == userId));
    }

    /// <summary>
    /// Run with EndDay before StartDay rejects record.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithEndDayBeforeStartDay_RejectsRecord()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        var record = new CalendarEventSyncRecord(
            recordId,
            "shift",
            Guid.NewGuid(),
            "2024-06-20",
            "2024-06-15",
            480,
            960,
            480,
            null,
            [],
            DateTime.UtcNow,
            false);

        var request = new CalendarEventSyncPushRequest([record]) { UserId = userId };

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Is.Empty);
        Assert.That(response.RejectedIds, Has.Count.EqualTo(1));
        Assert.That(response.RejectedIds[0].Id, Is.EqualTo(recordId));
        Assert.That(response.RejectedIds[0].Reason, Is.EqualTo("Missing required fields"));
    }

    /// <summary>
    /// Run with EndDay equal to StartDay accepts record for shifts regardless of times.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithShiftSameDayEndTimeLessThanStartTime_AcceptsRecord()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        var record = new CalendarEventSyncRecord(
            recordId,
            "shift",
            Guid.NewGuid(),
            "2024-06-15",
            "2024-06-15",
            960,
            480,
            480,
            null,
            [],
            DateTime.UtcNow,
            false);

        var request = new CalendarEventSyncPushRequest([record]) { UserId = userId };

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<CalendarEventEntity>());

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Contains.Item(recordId));
        Assert.That(response.RejectedIds, Is.Empty);
    }

    /// <summary>
    /// Run with reminder same day and EndTime less than or equal to StartTime rejects record.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithReminderSameDayEndTimeLessOrEqualStartTime_RejectsRecord()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        var record = new CalendarEventSyncRecord(
            recordId,
            "reminder",
            Guid.NewGuid(),
            "2024-06-15",
            "2024-06-15",
            960,
            480,
            0,
            null,
            [],
            DateTime.UtcNow,
            false);

        var request = new CalendarEventSyncPushRequest([record]) { UserId = userId };

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Is.Empty);
        Assert.That(response.RejectedIds, Has.Count.EqualTo(1));
        Assert.That(response.RejectedIds[0].Id, Is.EqualTo(recordId));
        Assert.That(response.RejectedIds[0].Reason, Is.EqualTo("Missing required fields"));
    }

    /// <summary>
    /// Run with reminder same day and EndTime equal to StartTime rejects record.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithReminderSameDayEndTimeEqualStartTime_RejectsRecord()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        var record = new CalendarEventSyncRecord(
            recordId,
            "reminder",
            Guid.NewGuid(),
            "2024-06-15",
            "2024-06-15",
            480,
            480,
            0,
            null,
            [],
            DateTime.UtcNow,
            false);

        var request = new CalendarEventSyncPushRequest([record]) { UserId = userId };

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Is.Empty);
        Assert.That(response.RejectedIds, Has.Count.EqualTo(1));
        Assert.That(response.RejectedIds[0].Id, Is.EqualTo(recordId));
        Assert.That(response.RejectedIds[0].Reason, Is.EqualTo("Missing required fields"));
    }

    /// <summary>
    /// Run with reminder different days and any time combination accepts record.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithReminderDifferentDaysEndTimeLessThanStartTime_AcceptsRecord()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        var record = new CalendarEventSyncRecord(
            recordId,
            "reminder",
            Guid.NewGuid(),
            "2024-06-15",
            "2024-06-16",
            960,
            480,
            1440,
            null,
            [],
            DateTime.UtcNow,
            false);

        var request = new CalendarEventSyncPushRequest([record]) { UserId = userId };

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<CalendarEventEntity>());

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Contains.Item(recordId));
        Assert.That(response.RejectedIds, Is.Empty);
    }

    /// <summary>
    /// Run with negative TotalHours rejects record.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithNegativeTotalHours_RejectsRecord()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        var record = new CalendarEventSyncRecord(
            recordId,
            "shift",
            Guid.NewGuid(),
            "2024-06-15",
            "2024-06-15",
            480,
            960,
            -1,
            null,
            [],
            DateTime.UtcNow,
            false);

        var request = new CalendarEventSyncPushRequest([record]) { UserId = userId };

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Is.Empty);
        Assert.That(response.RejectedIds, Has.Count.EqualTo(1));
        Assert.That(response.RejectedIds[0].Id, Is.EqualTo(recordId));
        Assert.That(response.RejectedIds[0].Reason, Is.EqualTo("Missing required fields"));
    }

    /// <summary>
    /// Run with exceeding batch size throws BadRequestException.
    /// </summary>
    [Test]
    public void Run_WithExceedingBatchSize_ThrowsBadRequestException()
    {
        // Arrange
        string userId = "testuser";
        List<CalendarEventSyncRecord> records = Enumerable.Range(0, 101)
            .Select(_ => CreateValidRecord(Guid.NewGuid()))
            .ToList();
        var request = new CalendarEventSyncPushRequest(records) { UserId = userId };

        // Act & Assert
        Assert.ThrowsAsync<BadRequestException>(
            async () => await this.service.Run(request));
    }

    /// <summary>
    /// Run with all valid records returns all acknowledged.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithAllValid_ReturnsAllAcknowledged()
    {
        // Arrange
        string userId = "testuser";
        Guid id1 = Guid.NewGuid();
        Guid id2 = Guid.NewGuid();
        Guid id3 = Guid.NewGuid();

        List<CalendarEventSyncRecord> records =
        [
            CreateValidRecord(id1),
            CreateValidRecord(id2),
            CreateValidRecord(id3),
        ];

        var request = new CalendarEventSyncPushRequest(records) { UserId = userId };

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<CalendarEventEntity>());

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Has.Count.EqualTo(3));
        Assert.That(response.AcknowledgedIds, Contains.Item(id1));
        Assert.That(response.AcknowledgedIds, Contains.Item(id2));
        Assert.That(response.AcknowledgedIds, Contains.Item(id3));
        Assert.That(response.RejectedIds, Is.Empty);
    }

    /// <summary>
    /// Run with mixed valid and invalid returns correct counts.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithMixedValidAndInvalid_ReturnsCorrectCounts()
    {
        // Arrange
        string userId = "testuser";
        Guid validId = Guid.NewGuid();
        Guid invalidId = Guid.NewGuid();

        CalendarEventSyncRecord validRecord = CreateValidRecord(validId);
        var invalidRecord = new CalendarEventSyncRecord(
            invalidId,
            string.Empty,
            Guid.Empty,
            string.Empty,
            string.Empty,
            0,
            0,
            0,
            null,
            [],
            DateTime.UtcNow,
            false);

        var request = new CalendarEventSyncPushRequest([validRecord, invalidRecord]) { UserId = userId };

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<CalendarEventEntity>());

        // Act
        CalendarEventSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Has.Count.EqualTo(1));
        Assert.That(response.AcknowledgedIds, Contains.Item(validId));
        Assert.That(response.RejectedIds, Has.Count.EqualTo(1));
        Assert.That(response.RejectedIds[0].Id, Is.EqualTo(invalidId));
    }

    private static CalendarEventSyncRecord CreateValidRecord(Guid id)
    {
        return new CalendarEventSyncRecord(
            id,
            "shift",
            Guid.NewGuid(),
            "2024-06-15",
            "2024-06-15",
            480,
            960,
            480,
            "Test notes",
            [],
            DateTime.UtcNow,
            false);
    }
}
