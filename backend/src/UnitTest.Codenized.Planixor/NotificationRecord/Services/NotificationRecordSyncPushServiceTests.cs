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

        // The real validator, not a substitute: these tests assert on which records get rejected, so the
        // actual rules are what is under test.
        this.service = new NotificationRecordSyncPushService(
            this.commands,
            this.queries,
            new NotificationRecordSyncRecordValidator(),
            this.logger);
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

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), CancellationToken.None)
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId, CancellationToken.None)
            .Returns(new List<NotificationRecordEntity>());

        // Act
        await this.service.Run(request, CancellationToken.None);

        // Assert
        await this.commands.Received(1).PurgePastRecordsAsync(userId, CancellationToken.None);
    }

    /// <summary>
    /// Verifies that a failing purge aborts the push instead of being swallowed.
    /// </summary>
    /// <remarks>
    /// The purge used to be best-effort: its failure was caught and logged so the push carried on. That only made
    /// sense while the purge committed on its own — which is precisely the defect. The deletions were already
    /// permanent by the time the upsert could fail, so the client retried a push whose purged rows existed on
    /// neither side. Purge and upsert now share one commit, so a failure in either must leave both unapplied.
    /// </remarks>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WhenPurgeFails_AbortsWithoutCommitting()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        NotificationRecordSyncRecord record = CreateValidRecord(recordId);
        var request = new NotificationRecordSyncPushRequest([record]) { UserId = userId };

        this.commands.PurgePastRecordsAsync(userId, CancellationToken.None)
            .ThrowsAsync(new InvalidOperationException("Database connection failed"));

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), CancellationToken.None)
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId, CancellationToken.None)
            .Returns(new List<NotificationRecordEntity>());

        // Act, Assert
        Assert.ThrowsAsync<InvalidOperationException>(() => this.service.Run(request, CancellationToken.None));

        await this.commands.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// Verifies that the push commits exactly once even when the batch had nothing to insert.
    /// </summary>
    /// <remarks>
    /// The purge stages its deletions and no longer writes them itself, so a push whose records were all rejected
    /// would leave those deletions uncommitted if the commit were conditional on there being something to upsert.
    /// </remarks>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithNothingToUpsert_StillCommits()
    {
        // Arrange
        string userId = "testuser";
        NotificationRecordSyncRecord invalidRecord = CreateValidRecord(Guid.Empty);
        var request = new NotificationRecordSyncPushRequest([invalidRecord]) { UserId = userId };

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), CancellationToken.None)
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId, CancellationToken.None)
            .Returns(new List<NotificationRecordEntity>());

        // Act
        NotificationRecordSyncPushResponse response = await this.service.Run(request, CancellationToken.None);

        // Assert
        Assert.That(response.AcknowledgedIds, Is.Empty);
        await this.commands.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
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
        this.commands.PurgePastRecordsAsync(userId, CancellationToken.None)
            .Returns(Task.CompletedTask);

        this.queries.GetExistingIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), CancellationToken.None)
            .Returns(new HashSet<Guid>());
        this.queries.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), userId, CancellationToken.None)
            .Returns(new List<NotificationRecordEntity>());

        // Act
        NotificationRecordSyncPushResponse response = await this.service.Run(request, CancellationToken.None);

        // Assert
        Assert.That(response.AcknowledgedIds, Has.Count.EqualTo(1));
        Assert.That(response.AcknowledgedIds, Contains.Item(recordId));
        Assert.That(response.RejectedIds, Is.Empty);
        await this.commands.Received(1).PurgePastRecordsAsync(userId, CancellationToken.None);
        await this.commands.Received(1).UpsertAsync(
            userId,
            Arg.Is<IReadOnlyList<NotificationRecordEntity>>(list => list.Count == 1),
            CancellationToken.None);
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
