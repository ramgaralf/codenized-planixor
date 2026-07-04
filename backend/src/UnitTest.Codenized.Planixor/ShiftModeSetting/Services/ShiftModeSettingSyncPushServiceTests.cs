// <copyright file="ShiftModeSettingSyncPushServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.ShiftModeSetting.Services;

using global::Codenized.Planixor.Dtos.ShiftModeSetting.Sync;
using global::Codenized.Planixor.UseCases.ShiftModeSetting.SyncPush;
using global::Codenized.Planixor.UseCases.ShiftModeSetting.SyncPush.Commands;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;
using ShiftModeSettingEntity = global::Codenized.Planixor.Core.Entities.ShiftModeSetting;

/// <summary>
/// Unit tests for <see cref="ShiftModeSettingSyncPushService"/>.
/// </summary>
[TestFixture]
public sealed class ShiftModeSettingSyncPushServiceTests
{
    private IShiftModeSettingSyncPushCommands commands = null!;
    private ILogger<ShiftModeSettingSyncPushService> logger = null!;
    private ShiftModeSettingSyncPushService service = null!;

    /// <summary>
    /// Sets up test dependencies.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.commands = Substitute.For<IShiftModeSettingSyncPushCommands>();
        this.logger = Substitute.For<ILogger<ShiftModeSettingSyncPushService>>();
        this.service = new ShiftModeSettingSyncPushService(this.commands, this.logger);
    }

    /// <summary>
    /// Run with valid request calls UpsertAsync with correct userId and record count.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithValidRequest_CallsUpsertAsyncWithCorrectUserId()
    {
        // Arrange
        string userId = "testuser";
        var request = new ShiftModeSettingSyncPushRequest(
        [
            new ShiftModeSettingSyncRecord(
                Guid.NewGuid(),
                true,
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
            Arg.Is<IReadOnlyList<ShiftModeSettingEntity>>(records => records.Count == 1));
    }

    /// <summary>
    /// Run returns response with correct processed count.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithTwoRecords_ReturnsProcessedCountOfTwo()
    {
        // Arrange
        string userId = "testuser";
        var request = new ShiftModeSettingSyncPushRequest(
        [
            CreateSyncRecord(),
            CreateSyncRecord(),
        ])
        {
            UserId = userId,
        };

        // Act
        ShiftModeSettingSyncPushResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.ProcessedCount, Is.EqualTo(2));
    }

    /// <summary>
    /// Run maps ShiftModeSettingSyncRecord fields to entity correctly via CreateFromSync.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithSyncRecord_MapsFieldsToEntityCorrectly()
    {
        // Arrange
        string userId = "testuser";
        Guid recordId = Guid.NewGuid();
        DateTime modifiedAt = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        var request = new ShiftModeSettingSyncPushRequest(
        [
            new ShiftModeSettingSyncRecord(
                recordId,
                true,
                modifiedAt,
                false),
        ])
        {
            UserId = userId,
        };

        IReadOnlyList<ShiftModeSettingEntity> capturedRecords = null!;
        await this.commands.UpsertAsync(
            userId,
            Arg.Do<IReadOnlyList<ShiftModeSettingEntity>>(records => capturedRecords = records));

        // Act
        await this.service.Run(request);

        // Assert
        Assert.That(capturedRecords, Is.Not.Null);
        Assert.That(capturedRecords, Has.Count.EqualTo(1));

        ShiftModeSettingEntity entity = capturedRecords[0];
        Assert.That(entity.Id, Is.EqualTo(recordId));
        Assert.That(entity.UserId, Is.EqualTo(userId));
        Assert.That(entity.Enabled, Is.True);
        Assert.That(entity.ModifiedAt, Is.EqualTo(modifiedAt));
        Assert.That(entity.IsDeleted, Is.False);
    }

    /// <summary>
    /// Run with deleted record maps IsDeleted flag correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithDeletedRecord_MapsIsDeletedFlagCorrectly()
    {
        // Arrange
        string userId = "testuser";
        var request = new ShiftModeSettingSyncPushRequest(
        [
            new ShiftModeSettingSyncRecord(
                Guid.NewGuid(),
                false,
                DateTime.UtcNow,
                true),
        ])
        {
            UserId = userId,
        };

        IReadOnlyList<ShiftModeSettingEntity> capturedRecords = null!;
        await this.commands.UpsertAsync(
            userId,
            Arg.Do<IReadOnlyList<ShiftModeSettingEntity>>(records => capturedRecords = records));

        // Act
        await this.service.Run(request);

        // Assert
        Assert.That(capturedRecords[0].IsDeleted, Is.True);
        Assert.That(capturedRecords[0].Enabled, Is.False);
    }

    private static ShiftModeSettingSyncRecord CreateSyncRecord()
    {
        return new ShiftModeSettingSyncRecord(
            Guid.NewGuid(),
            true,
            DateTime.UtcNow,
            false);
    }
}
