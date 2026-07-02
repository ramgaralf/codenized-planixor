// <copyright file="NotificationRecordSyncPushServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.NotificationRecord.Services;

using global::Codenized.Planixor.Dtos.NotificationRecord.Sync;
using global::Codenized.Planixor.UseCases.NotificationRecord.SyncPush;
using global::Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Commands;
using global::Codenized.Planixor.UseCases.NotificationRecord.SyncPush.Queries;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using NUnit.Framework;

using NotificationRecordEntity = global::Codenized.Planixor.Core.Entities.NotificationRecord;

/// <summary>
/// Unit tests for <see cref="NotificationRecordSyncPushService"/> purge integration.
/// </summary>
[TestFixture]
public sealed class NotificationRecordSyncPushServiceTests
{
    private INotificationRecordSyncPushCommands commands = null!;
    private INotificationRecordSyncPushQueries queries = null!;
    private ILogger<NotificationRecordSyncPushService> logger = null!;
    private NotificationRecordSyncPushService service = null!;

    /// <summary>
    /// Sets up test dependencies before each test.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.commands = Substitute.For<INotificationRecordSyncPushCommands>();
        this.queries = Substitute.For<INotificationRecordSyncPushQueries>();
        this.logger = Substitute.For<ILogger<NotificationRecordSyncPushService>>();
        this.service = new NotificationRecordSyncPushService(this.commands, this.queries, this.logger);
    }

    /// <summary>
    /// Verifies that PurgePastRecordsAsync is called with the correct userId before processing records.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithValidRequest_CallsPurgePastRecordsWithCorrectUserId()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        NotificationRecordSyncRecord record = CreateValidRecord(recordId);
        var request = new NotificationRecordSyncPushRequest([record]) { UserId = userId };

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<NotificationRecordEntity>());

        // Act
        await this.service.Run(request);

        // Assert
        await this.commands.Received(1).PurgePastRecordsAsync(userId);
    }

    /// <summary>
    /// Verifies that when PurgePastRecordsAsync throws an exception, the service still processes
    /// the push batch and returns acknowledged records.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WhenPurgeThrows_StillProcessesPushBatch()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        NotificationRecordSyncRecord record = CreateValidRecord(recordId);
        var request = new NotificationRecordSyncPushRequest([record]) { UserId = userId };

        this.commands.PurgePastRecordsAsync(userId)
            .ThrowsAsync(new InvalidOperationException("Database connection failed"));

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<NotificationRecordEntity>());

        // Act
        NotificationRecordSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Contains.Item(recordId));
        await this.commands.Received(1).UpsertAsync(
            userId,
            Arg.Is<IReadOnlyList<NotificationRecordEntity>>(list => list.Count == 1));
    }

    /// <summary>
    /// Verifies that when there are no records to purge (PurgePastRecordsAsync completes normally),
    /// the service proceeds with push processing without any issues.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WhenNoRecordsToPurge_ProceedsNormally()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        NotificationRecordSyncRecord record = CreateValidRecord(recordId);
        var request = new NotificationRecordSyncPushRequest([record]) { UserId = userId };

        // PurgePastRecordsAsync completes without error (no records to purge)
        this.commands.PurgePastRecordsAsync(userId)
            .Returns(Task.CompletedTask);

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>())
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId)
            .Returns(new List<NotificationRecordEntity>());

        // Act
        NotificationRecordSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.AcknowledgedIds, Has.Count.EqualTo(1));
        Assert.That(response.AcknowledgedIds, Contains.Item(recordId));
        Assert.That(response.RejectedIds, Is.Empty);
        await this.commands.Received(1).PurgePastRecordsAsync(userId);
        await this.commands.Received(1).UpsertAsync(
            userId,
            Arg.Is<IReadOnlyList<NotificationRecordEntity>>(list => list.Count == 1));
    }

    private static NotificationRecordSyncRecord CreateValidRecord(Guid id)
    {
        return new NotificationRecordSyncRecord(
            id,
            Guid.NewGuid(),
            10,
            DateTime.UtcNow.AddHours(1),
            false,
            false,
            DateTime.UtcNow,
            false);
    }
}
