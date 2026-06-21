// <copyright file="ReminderSyncPushServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Services;

using global::Codenized.CleanArchitecture.Abstractions.Exceptions;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Dtos.Reminder.Sync;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="ReminderSyncPushService"/>.
/// </summary>
[TestFixture]
public sealed class ReminderSyncPushServiceTests
{
    private IReminderSyncPushCommands commands = null!;
    private ILogger<ReminderSyncPushService> logger = null!;
    private ReminderSyncPushService service = null!;

    /// <summary>
    /// Sets up test dependencies.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.commands = Substitute.For<IReminderSyncPushCommands>();
        this.logger = Substitute.For<ILogger<ReminderSyncPushService>>();
        this.service = new ReminderSyncPushService(this.commands, this.logger);
    }

    /// <summary>
    /// Run with batch exceeding 100 records throws BadRequestException.
    /// </summary>
    [Test]
    public void Run_WithBatchExceeding100Records_ThrowsBadRequestException()
    {
        // Arrange
        string userId = "testuser";
        List<ReminderSyncRecord> records = Enumerable.Range(0, 101)
            .Select(_ => CreateValidRecord())
            .ToList();
        var request = new ReminderSyncPushRequest(records) { UserId = userId };

        // Act & Assert
        Assert.ThrowsAsync<BadRequestException>(
            async () => await this.service.Run(request));
    }

    /// <summary>
    /// Run with batch exceeding 100 records does not call UpsertAsync.
    /// </summary>
    [Test]
    public void Run_WithBatchExceeding100Records_DoesNotCallUpsertAsync()
    {
        // Arrange
        string userId = "testuser";
        List<ReminderSyncRecord> records = Enumerable.Range(0, 101)
            .Select(_ => CreateValidRecord())
            .ToList();
        var request = new ReminderSyncPushRequest(records) { UserId = userId };

        // Act
        Assert.ThrowsAsync<BadRequestException>(
            async () => await this.service.Run(request));

        // Assert
        this.commands.DidNotReceive().UpsertAsync(
            Arg.Any<string>(),
            Arg.Any<IReadOnlyList<Reminder>>());
    }

    /// <summary>
    /// Run with exactly 100 records does not throw and calls UpsertAsync.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithExactly100Records_CallsUpsertAsync()
    {
        // Arrange
        string userId = "testuser";
        List<ReminderSyncRecord> records = Enumerable.Range(0, 100)
            .Select(_ => CreateValidRecord())
            .ToList();
        var request = new ReminderSyncPushRequest(records) { UserId = userId };

        // Act
        ReminderSyncPushResponse response = await this.service.Run(request);

        // Assert
        await this.commands.Received(1).UpsertAsync(
            userId,
            Arg.Is<IReadOnlyList<Reminder>>(reminders => reminders.Count == 100));
        Assert.That(response.SyncedCount, Is.EqualTo(100));
    }

    /// <summary>
    /// Run with valid batch calls UpsertAsync with correct userId and mapped entities.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithValidBatch_CallsUpsertAsyncWithCorrectUserId()
    {
        // Arrange
        string userId = "testuser";
        var request = new ReminderSyncPushRequest(
        [
            CreateValidRecord(),
        ])
        {
            UserId = userId,
        };

        // Act
        await this.service.Run(request);

        // Assert
        await this.commands.Received(1).UpsertAsync(
            userId,
            Arg.Is<IReadOnlyList<Reminder>>(reminders => reminders.Count == 1));
    }

    /// <summary>
    /// Run returns response with correct synced count.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithThreeRecords_ReturnsSyncedCountOfThree()
    {
        // Arrange
        string userId = "testuser";
        var request = new ReminderSyncPushRequest(
        [
            CreateValidRecord(),
            CreateValidRecord(),
            CreateValidRecord(),
        ])
        {
            UserId = userId,
        };

        // Act
        ReminderSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.SyncedCount, Is.EqualTo(3));
    }

    /// <summary>
    /// Run maps ReminderSyncRecord fields to Reminder entity correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithSyncRecord_MapsFieldsToReminderEntityCorrectly()
    {
        // Arrange
        string userId = "testuser";
        Guid reminderId = Guid.NewGuid();
        DateTime createdAt = new DateTime(2024, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAt = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        var request = new ReminderSyncPushRequest(
        [
            new ReminderSyncRecord(
                reminderId,
                "Morning Reminder",
                "☀️",
                "#EF4444",
                true,
                createdAt,
                modifiedAt,
                false),
        ])
        {
            UserId = userId,
        };

        IReadOnlyList<Reminder> capturedReminders = null!;
        await this.commands.UpsertAsync(
            userId,
            Arg.Do<IReadOnlyList<Reminder>>(reminders => capturedReminders = reminders));

        // Act
        await this.service.Run(request);

        // Assert
        Assert.That(capturedReminders, Is.Not.Null);
        Assert.That(capturedReminders, Has.Count.EqualTo(1));

        Reminder reminder = capturedReminders[0];
        Assert.That(reminder.Id, Is.EqualTo(reminderId));
        Assert.That(reminder.UserId, Is.EqualTo(userId));
        Assert.That(reminder.Name.Value, Is.EqualTo("Morning Reminder"));
        Assert.That(reminder.Icon.Value, Is.EqualTo("☀️"));
        Assert.That(reminder.BackgroundColor.Value, Is.EqualTo("#EF4444"));
        Assert.That(reminder.IsActive, Is.True);
        Assert.That(reminder.CreatedAt, Is.EqualTo(createdAt));
        Assert.That(reminder.ModifiedAt, Is.EqualTo(modifiedAt));
        Assert.That(reminder.IsDeleted, Is.False);
    }

    private static ReminderSyncRecord CreateValidRecord()
    {
        return new ReminderSyncRecord(
            Guid.NewGuid(),
            "Test Reminder",
            "🔔",
            "#EF4444",
            true,
            DateTime.UtcNow.AddDays(-10),
            DateTime.UtcNow,
            false);
    }
}
