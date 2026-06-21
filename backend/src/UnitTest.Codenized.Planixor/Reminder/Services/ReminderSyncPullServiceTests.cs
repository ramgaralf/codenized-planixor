// <copyright file="ReminderSyncPullServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Services;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using global::Codenized.Planixor.Dtos.Reminder.Sync;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull.Queries;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="ReminderSyncPullService"/>.
/// </summary>
[TestFixture]
public sealed class ReminderSyncPullServiceTests
{
    private IReminderSyncPullQueries queries = null!;
    private ILogger<ReminderSyncPullService> logger = null!;
    private ReminderSyncPullService service = null!;

    /// <summary>
    /// Sets up test dependencies.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.queries = Substitute.For<IReminderSyncPullQueries>();
        this.logger = Substitute.For<ILogger<ReminderSyncPullService>>();
        this.service = new ReminderSyncPullService(this.logger, this.queries);
    }

    /// <summary>
    /// Run with valid request calls queries with correct parameters.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithValidRequest_CallsQueriesWithCorrectParameters()
    {
        // Arrange
        string userId = "testuser";
        DateTime lastSyncedAt = new DateTime(2024, 6, 15, 10, 0, 0, DateTimeKind.Utc);
        string cursor = "abc123";
        var request = new ReminderSyncPullRequest(userId, lastSyncedAt, cursor);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, cursor)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        await this.service.Run(request);

        // Assert
        await this.queries.Received(1).GetModifiedAfterAsync(userId, lastSyncedAt, cursor);
    }

    /// <summary>
    /// Run with empty result returns empty response.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithEmptyResult_ReturnsEmptyResponse()
    {
        // Arrange
        string userId = "testuser";
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        var request = new ReminderSyncPullRequest(userId, lastSyncedAt, null);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ReminderSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Records, Is.Empty);
        Assert.That(response.Cursor, Is.Null);
        Assert.That(response.HasMore, Is.False);
    }

    /// <summary>
    /// Run with reminders maps entities to sync records correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithReminders_MapsEntitiesToSyncRecordsCorrectly()
    {
        // Arrange
        string userId = "testuser";
        Guid reminderId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        DateTime createdAt = new DateTime(2024, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAt = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        Reminder reminder = Reminder.CreateFromSync(
            reminderId,
            userId,
            ReminderName.Create("Morning Reminder"),
            ReminderIcon.Create("☀️"),
            ReminderColor.Create("#EF4444"),
            true,
            createdAt,
            modifiedAt,
            false);

        var request = new ReminderSyncPullRequest(userId, lastSyncedAt, null);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [reminder],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ReminderSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Records, Has.Count.EqualTo(1));
        ReminderSyncRecord record = response.Records[0];
        Assert.That(record.Id, Is.EqualTo(reminderId));
        Assert.That(record.Name, Is.EqualTo("Morning Reminder"));
        Assert.That(record.Icon, Is.EqualTo("☀️"));
        Assert.That(record.BackgroundColor, Is.EqualTo("#EF4444"));
        Assert.That(record.IsActive, Is.True);
        Assert.That(record.CreatedAt, Is.EqualTo(createdAt));
        Assert.That(record.ModifiedAt, Is.EqualTo(modifiedAt));
        Assert.That(record.IsDeleted, Is.False);
    }

    /// <summary>
    /// Run with pagination returns cursor and has more flag.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithPagination_ReturnsCursorAndHasMoreFlag()
    {
        // Arrange
        string userId = "testuser";
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        string expectedCursor = "next-page-cursor";
        var request = new ReminderSyncPullRequest(userId, lastSyncedAt, null);

        Reminder reminder = Reminder.CreateFromSync(
            Guid.NewGuid(),
            userId,
            ReminderName.Create("Reminder"),
            ReminderIcon.Create("🔔"),
            ReminderColor.Create("#2563EB"),
            true,
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow,
            false);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [reminder],
                Cursor = expectedCursor,
                HasMore = true,
            });

        // Act
        ReminderSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Cursor, Is.EqualTo(expectedCursor));
        Assert.That(response.HasMore, Is.True);
    }

    /// <summary>
    /// Run with null last synced at passes MinValue to queries.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithNullLastSyncedAt_PassesMinValueToQueries()
    {
        // Arrange
        string userId = "testuser";
        var request = new ReminderSyncPullRequest(userId, null, null);

        this.queries.GetModifiedAfterAsync(userId, DateTime.MinValue, null)
            .Returns(new ReminderSyncPullResult
            {
                Reminders = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ReminderSyncPullResponse response = await this.service.Run(request);

        // Assert
        await this.queries.Received(1).GetModifiedAfterAsync(userId, DateTime.MinValue, null);
        Assert.That(response.Records, Is.Empty);
    }
}
