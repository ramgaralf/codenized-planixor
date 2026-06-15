// <copyright file="ReminderSyncIntegrationTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Integration;

using global::Codenized.CleanArchitecture.Abstractions.Exceptions;
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
/// Integration tests for the Reminder sync flow.
/// Verifies end-to-end data flow through Push and Pull services with mocked repositories.
///
/// Validates: Requirements 6.1, 6.4, 6.5.
/// </summary>
[TestFixture]
public sealed class ReminderSyncIntegrationTests
{
    private IReminderSyncPushCommands pushCommands = null!;
    private IReminderSyncPullQueries pullQueries = null!;
    private ReminderSyncPushService pushService = null!;
    private ReminderSyncPullService pullService = null!;

    /// <summary>
    /// Sets up services with mocked repositories for each test.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.pushCommands = Substitute.For<IReminderSyncPushCommands>();
        this.pullQueries = Substitute.For<IReminderSyncPullQueries>();

        this.pushService = new ReminderSyncPushService(
            this.pushCommands,
            Substitute.For<ILogger<ReminderSyncPushService>>());

        this.pullService = new ReminderSyncPullService(
            Substitute.For<ILogger<ReminderSyncPullService>>(),
            this.pullQueries);
    }

    /// <summary>
    /// Full CRUD lifecycle: create → update → soft-delete → push validates all states correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task FullLifecycle_Create_Update_SoftDelete_PushesAllStatesCorrectly()
    {
        // Arrange — simulate a client that created, updated, and deleted reminders
        Guid userId = Guid.NewGuid();
        Guid createdId = Guid.NewGuid();
        Guid updatedId = Guid.NewGuid();
        Guid deletedId = Guid.NewGuid();

        DateTime createdAt = new DateTime(2024, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAtCreated = new DateTime(2024, 6, 15, 10, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAtUpdated = new DateTime(2024, 6, 16, 14, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAtDeleted = new DateTime(2024, 6, 17, 9, 0, 0, DateTimeKind.Utc);

        var records = new List<ReminderSyncRecord>
        {
            new(createdId, "New Reminder", "🔔", "#EF4444", true, createdAt, modifiedAtCreated, false),
            new(updatedId, "Updated Name", "☀️", "#2563EB", true, createdAt, modifiedAtUpdated, false),
            new(deletedId, "Deleted Reminder", "🗑️", "#6B7280", true, createdAt, modifiedAtDeleted, true),
        };

        var request = new ReminderSyncPushRequest(records) { UserId = userId };

        // Act
        ReminderSyncPushResponse response = await this.pushService.Run(request);

        // Assert — all 3 records processed
        Assert.That(response.SyncedCount, Is.EqualTo(3));

        // Verify UpsertAsync was called with correct userId and mapped entities
        await this.pushCommands.Received(1).UpsertAsync(
            userId,
            Arg.Is<IReadOnlyList<Reminder>>(reminders =>
                reminders.Count == 3 &&
                reminders.Any(r => r.Id == createdId && r.IsDeleted == false && r.Name.Value == "New Reminder") &&
                reminders.Any(r => r.Id == updatedId && r.Name.Value == "Updated Name") &&
                reminders.Any(r => r.Id == deletedId && r.IsDeleted == true)));
    }

    /// <summary>
    /// Push service receives batch and repository upserts all records with correct field mapping.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Push_WithValidBatch_RepositoryReceivesCorrectlyMappedEntities()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        Guid reminderId = Guid.NewGuid();
        DateTime createdAt = new DateTime(2024, 3, 1, 8, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAt = new DateTime(2024, 6, 20, 15, 30, 0, DateTimeKind.Utc);

        var record = new ReminderSyncRecord(
            reminderId,
            "Morning Meeting",
            "☀️",
            "#10B981",
            true,
            createdAt,
            modifiedAt,
            false);

        var request = new ReminderSyncPushRequest([record]) { UserId = userId };

        IReadOnlyList<Reminder> capturedReminders = null!;
        await this.pushCommands.UpsertAsync(
            userId,
            Arg.Do<IReadOnlyList<Reminder>>(r => capturedReminders = r));

        // Act
        await this.pushService.Run(request);

        // Assert — verify domain entity was constructed correctly
        Assert.That(capturedReminders, Has.Count.EqualTo(1));
        Reminder entity = capturedReminders[0];
        Assert.That(entity.Id, Is.EqualTo(reminderId));
        Assert.That(entity.UserId, Is.EqualTo(userId));
        Assert.That(entity.Name.Value, Is.EqualTo("Morning Meeting"));
        Assert.That(entity.Icon.Value, Is.EqualTo("☀️"));
        Assert.That(entity.BackgroundColor.Value, Is.EqualTo("#10B981"));
        Assert.That(entity.IsActive, Is.True);
        Assert.That(entity.CreatedAt, Is.EqualTo(createdAt));
        Assert.That(entity.ModifiedAt, Is.EqualTo(modifiedAt));
        Assert.That(entity.IsDeleted, Is.False);
    }

    /// <summary>
    /// Pull service returns modified records mapped correctly from domain entities to DTOs.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Pull_WithModifiedRecords_ReturnsMappedSyncRecords()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = new DateTime(2024, 6, 10, 0, 0, 0, DateTimeKind.Utc);

        Reminder r1 = Reminder.CreateFromSync(
            Guid.NewGuid(),
            userId,
            ReminderName.Create("Reminder A"),
            ReminderIcon.Create("🔔"),
            ReminderColor.Create("#EF4444"),
            true,
            new DateTime(2024, 1, 1, 10, 0, 0, DateTimeKind.Utc),
            new DateTime(2024, 6, 12, 14, 0, 0, DateTimeKind.Utc),
            false);

        Reminder r2 = Reminder.CreateFromSync(
            Guid.NewGuid(),
            userId,
            ReminderName.Create("Reminder B"),
            ReminderIcon.Create("⭐"),
            ReminderColor.Create("#2563EB"),
            false,
            new DateTime(2024, 2, 15, 8, 0, 0, DateTimeKind.Utc),
            new DateTime(2024, 6, 18, 10, 0, 0, DateTimeKind.Utc),
            true);

        this.pullQueries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [r1, r2],
                Cursor = null,
                HasMore = false,
            });

        var request = new ReminderSyncPullRequest(userId, lastSyncedAt, null);

        // Act
        ReminderSyncPullResponse response = await this.pullService.Run(request);

        // Assert
        Assert.That(response.Records, Has.Count.EqualTo(2));
        Assert.That(response.HasMore, Is.False);
        Assert.That(response.Cursor, Is.Null);

        ReminderSyncRecord record1 = response.Records.First(r => r.Name == "Reminder A");
        Assert.That(record1.Icon, Is.EqualTo("🔔"));
        Assert.That(record1.BackgroundColor, Is.EqualTo("#EF4444"));
        Assert.That(record1.IsActive, Is.True);
        Assert.That(record1.IsDeleted, Is.False);

        ReminderSyncRecord record2 = response.Records.First(r => r.Name == "Reminder B");
        Assert.That(record2.Icon, Is.EqualTo("⭐"));
        Assert.That(record2.IsActive, Is.False);
        Assert.That(record2.IsDeleted, Is.True);
    }

    /// <summary>
    /// Push then Pull lifecycle: push records and verify pull returns updated records.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task PushThenPull_FullCycle_PullReturnsUpdatedRecords()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        Guid reminderId = Guid.NewGuid();
        DateTime createdAt = new DateTime(2024, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAt = new DateTime(2024, 6, 20, 12, 0, 0, DateTimeKind.Utc);

        // Step 1: Push a record
        var pushRecord = new ReminderSyncRecord(
            reminderId, "Push Me", "🚀", "#7C3AED", true, createdAt, modifiedAt, false);
        var pushRequest = new ReminderSyncPushRequest([pushRecord]) { UserId = userId };

        ReminderSyncPushResponse pushResponse = await this.pushService.Run(pushRequest);
        Assert.That(pushResponse.SyncedCount, Is.EqualTo(1));

        // Step 2: Pull should return the same record (simulated via mock)
        Reminder entity = Reminder.CreateFromSync(
            reminderId,
            userId,
            ReminderName.Create("Push Me"),
            ReminderIcon.Create("🚀"),
            ReminderColor.Create("#7C3AED"),
            true,
            createdAt,
            modifiedAt,
            false);

        DateTime pullSince = new DateTime(2024, 6, 19, 0, 0, 0, DateTimeKind.Utc);
        this.pullQueries.GetModifiedAfterAsync(userId, pullSince, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [entity],
                Cursor = null,
                HasMore = false,
            });

        var pullRequest = new ReminderSyncPullRequest(userId, pullSince, null);
        ReminderSyncPullResponse pullResponse = await this.pullService.Run(pullRequest);

        // Assert
        Assert.That(pullResponse.Records, Has.Count.EqualTo(1));
        Assert.That(pullResponse.Records[0].Id, Is.EqualTo(reminderId));
        Assert.That(pullResponse.Records[0].Name, Is.EqualTo("Push Me"));
    }

    /// <summary>
    /// Push service requires valid userId — batch with empty user ID still processes
    /// (authorization is handled at the endpoint layer, not the service layer).
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Push_WithUserId_PassesUserIdToRepository()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        var record = new ReminderSyncRecord(
            Guid.NewGuid(), "Test", "🔔", "#EF4444", true,
            DateTime.UtcNow.AddDays(-5), DateTime.UtcNow, false);

        var request = new ReminderSyncPushRequest([record]) { UserId = userId };

        // Act
        await this.pushService.Run(request);

        // Assert — userId is passed through to the repository
        await this.pushCommands.Received(1).UpsertAsync(
            userId,
            Arg.Any<IReadOnlyList<Reminder>>());
    }

    /// <summary>
    /// Pull service requires valid userId — queries are scoped to the user.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Pull_WithUserId_QueriesAreScopedToUser()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);

        this.pullQueries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [],
                Cursor = null,
                HasMore = false,
            });

        var request = new ReminderSyncPullRequest(userId, lastSyncedAt, null);

        // Act
        await this.pullService.Run(request);

        // Assert — query is scoped to the specific userId
        await this.pullQueries.Received(1).GetModifiedAfterAsync(userId, lastSyncedAt, null);
    }

    /// <summary>
    /// Push rejects batch exceeding 100 records with BadRequestException.
    /// </summary>
    [Test]
    public void Push_WithBatchExceeding100_ThrowsBadRequestException()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        List<ReminderSyncRecord> records = Enumerable.Range(0, 101)
            .Select(_ => new ReminderSyncRecord(
                Guid.NewGuid(), "Test", "🔔", "#EF4444", true,
                DateTime.UtcNow.AddDays(-10), DateTime.UtcNow, false))
            .ToList();

        var request = new ReminderSyncPushRequest(records) { UserId = userId };

        // Act & Assert
        Assert.ThrowsAsync<BadRequestException>(
            async () => await this.pushService.Run(request));
    }

    /// <summary>
    /// Pull with pagination cursor passes cursor correctly through to queries.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Pull_WithPaginationCursor_PassesCursorToQueries()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-2);
        string cursor = "page-2-cursor";

        this.pullQueries.GetModifiedAfterAsync(userId, lastSyncedAt, cursor)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [],
                Cursor = null,
                HasMore = false,
            });

        var request = new ReminderSyncPullRequest(userId, lastSyncedAt, cursor);

        // Act
        await this.pullService.Run(request);

        // Assert
        await this.pullQueries.Received(1).GetModifiedAfterAsync(userId, lastSyncedAt, cursor);
    }

    /// <summary>
    /// Pull with paginated result returns HasMore=true and cursor for next page.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Pull_WithMorePages_ReturnsHasMoreAndCursor()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        string nextCursor = "next-page";

        List<Reminder> reminders = Enumerable.Range(0, 100)
            .Select(i => Reminder.CreateFromSync(
                Guid.NewGuid(),
                userId,
                ReminderName.Create($"Reminder {i}"),
                ReminderIcon.Create("🔔"),
                ReminderColor.Create("#EF4444"),
                true,
                DateTime.UtcNow.AddDays(-30),
                DateTime.UtcNow.AddMinutes(-i),
                false))
            .ToList();

        this.pullQueries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = reminders,
                Cursor = nextCursor,
                HasMore = true,
            });

        var request = new ReminderSyncPullRequest(userId, lastSyncedAt, null);

        // Act
        ReminderSyncPullResponse response = await this.pullService.Run(request);

        // Assert
        Assert.That(response.Records, Has.Count.EqualTo(100));
        Assert.That(response.HasMore, Is.True);
        Assert.That(response.Cursor, Is.EqualTo(nextCursor));
    }

    /// <summary>
    /// Push with deactivated and deleted records maps all state flags correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Push_WithMixedStates_MapsAllStateFlagsCorrectly()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime now = DateTime.UtcNow;

        var records = new List<ReminderSyncRecord>
        {
            new(Guid.NewGuid(), "Active", "✅", "#10B981", true, now.AddDays(-10), now, false),
            new(Guid.NewGuid(), "Deactivated", "⏸️", "#6B7280", false, now.AddDays(-10), now, false),
            new(Guid.NewGuid(), "Deleted", "🗑️", "#EF4444", true, now.AddDays(-10), now, true),
        };

        var request = new ReminderSyncPushRequest(records) { UserId = userId };

        IReadOnlyList<Reminder> capturedReminders = null!;
        await this.pushCommands.UpsertAsync(
            userId,
            Arg.Do<IReadOnlyList<Reminder>>(r => capturedReminders = r));

        // Act
        await this.pushService.Run(request);

        // Assert
        Assert.That(capturedReminders, Has.Count.EqualTo(3));

        Reminder active = capturedReminders.First(r => r.Name.Value == "Active");
        Assert.That(active.IsActive, Is.True);
        Assert.That(active.IsDeleted, Is.False);

        Reminder deactivated = capturedReminders.First(r => r.Name.Value == "Deactivated");
        Assert.That(deactivated.IsActive, Is.False);
        Assert.That(deactivated.IsDeleted, Is.False);

        Reminder deleted = capturedReminders.First(r => r.Name.Value == "Deleted");
        Assert.That(deleted.IsActive, Is.True);
        Assert.That(deleted.IsDeleted, Is.True);
    }
}
