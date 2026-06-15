// <copyright file="ShiftSyncPushServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Services;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Dtos.Shift.Sync;
using global::Codenized.Planixor.UseCases.Shift.SyncPush;
using global::Codenized.Planixor.UseCases.Shift.SyncPush.Commands;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="ShiftSyncPushService"/>.
/// </summary>
[TestFixture]
public sealed class ShiftSyncPushServiceTests
{
    private IShiftSyncPushCommands commands = null!;
    private ILogger<ShiftSyncPushService> logger = null!;
    private ShiftSyncPushService service = null!;

    /// <summary>
    /// Sets up test dependencies.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.commands = Substitute.For<IShiftSyncPushCommands>();
        this.logger = Substitute.For<ILogger<ShiftSyncPushService>>();
        this.service = new ShiftSyncPushService(this.commands, this.logger);
    }

    /// <summary>
    /// Run with valid request calls UpsertAsync with correct userId and shift count.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithValidRequest_CallsUpsertAsyncWithCorrectUserId()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        var request = new ShiftSyncPushRequest(
        [
            new ShiftSyncItem(
                Guid.NewGuid(),
                "Morning Shift",
                "☀️",
                "#EF4444",
                480,
                960,
                480,
                true,
                DateTime.UtcNow.AddDays(-10),
                DateTime.UtcNow,
                false),
        ])
        {
            UserId = userId,
        };

        // Act
        await this.service.Run(request);

        // Assert
        await this.commands.Received(1).UpsertAsync(
            userId,
            Arg.Is<IReadOnlyList<Shift>>(shifts => shifts.Count == 1));
    }

    /// <summary>
    /// Run with multiple shifts passes all mapped entities to UpsertAsync.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithMultipleShifts_PassesAllMappedEntitiesToUpsert()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        var request = new ShiftSyncPushRequest(
        [
            new ShiftSyncItem(
                Guid.NewGuid(),
                "Morning",
                "☀️",
                "#EF4444",
                480,
                960,
                480,
                true,
                DateTime.UtcNow.AddDays(-10),
                DateTime.UtcNow,
                false),
            new ShiftSyncItem(
                Guid.NewGuid(),
                "Night",
                "🌙",
                "#2563EB",
                1320,
                360,
                480,
                true,
                DateTime.UtcNow.AddDays(-5),
                DateTime.UtcNow,
                false),
        ])
        {
            UserId = userId,
        };

        // Act
        await this.service.Run(request);

        // Assert
        await this.commands.Received(1).UpsertAsync(
            userId,
            Arg.Is<IReadOnlyList<Shift>>(shifts => shifts.Count == 2));
    }

    /// <summary>
    /// Run returns response with correct synced count.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithThreeShifts_ReturnsSyncedCountOfThree()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        var request = new ShiftSyncPushRequest(
        [
            CreateSyncItem(),
            CreateSyncItem(),
            CreateSyncItem(),
        ])
        {
            UserId = userId,
        };

        // Act
        ShiftSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.SyncedCount, Is.EqualTo(3));
    }

    /// <summary>
    /// Run maps ShiftSyncItem fields to Shift entity correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithSyncItem_MapsFieldsToShiftEntityCorrectly()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        Guid shiftId = Guid.NewGuid();
        DateTime createdAt = new DateTime(2024, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAt = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        var request = new ShiftSyncPushRequest(
        [
            new ShiftSyncItem(
                shiftId,
                "Morning Shift",
                "☀️",
                "#EF4444",
                480,
                960,
                480,
                true,
                createdAt,
                modifiedAt,
                false),
        ])
        {
            UserId = userId,
        };

        IReadOnlyList<Shift> capturedShifts = null!;
        await this.commands.UpsertAsync(
            userId,
            Arg.Do<IReadOnlyList<Shift>>(shifts => capturedShifts = shifts));

        // Act
        await this.service.Run(request);

        // Assert
        Assert.That(capturedShifts, Is.Not.Null);
        Assert.That(capturedShifts, Has.Count.EqualTo(1));

        Shift shift = capturedShifts[0];
        Assert.That(shift.Id, Is.EqualTo(shiftId));
        Assert.That(shift.UserId, Is.EqualTo(userId));
        Assert.That(shift.Name.Value, Is.EqualTo("Morning Shift"));
        Assert.That(shift.Icon.Value, Is.EqualTo("☀️"));
        Assert.That(shift.BackgroundColor.Value, Is.EqualTo("#EF4444"));
        Assert.That(shift.StartTime.TotalMinutes, Is.EqualTo(480));
        Assert.That(shift.EndTime.TotalMinutes, Is.EqualTo(960));
        Assert.That(shift.HoursWorked.TotalMinutes, Is.EqualTo(480));
        Assert.That(shift.IsActive, Is.True);
        Assert.That(shift.CreatedAt, Is.EqualTo(createdAt));
        Assert.That(shift.ModifiedAt, Is.EqualTo(modifiedAt));
        Assert.That(shift.IsDeleted, Is.False);
    }

    /// <summary>
    /// Run with deleted shift maps IsDeleted flag correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithDeletedShift_MapsIsDeletedFlagCorrectly()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        var request = new ShiftSyncPushRequest(
        [
            new ShiftSyncItem(
                Guid.NewGuid(),
                "Deleted Shift",
                "🗑️",
                "#6B7280",
                0,
                480,
                480,
                false,
                DateTime.UtcNow.AddDays(-30),
                DateTime.UtcNow,
                true),
        ])
        {
            UserId = userId,
        };

        IReadOnlyList<Shift> capturedShifts = null!;
        await this.commands.UpsertAsync(
            userId,
            Arg.Do<IReadOnlyList<Shift>>(shifts => capturedShifts = shifts));

        // Act
        await this.service.Run(request);

        // Assert
        Assert.That(capturedShifts[0].IsDeleted, Is.True);
        Assert.That(capturedShifts[0].IsActive, Is.False);
    }

    private static ShiftSyncItem CreateSyncItem()
    {
        return new ShiftSyncItem(
            Guid.NewGuid(),
            "Shift",
            "☀️",
            "#EF4444",
            480,
            960,
            480,
            true,
            DateTime.UtcNow.AddDays(-10),
            DateTime.UtcNow,
            false);
    }
}
