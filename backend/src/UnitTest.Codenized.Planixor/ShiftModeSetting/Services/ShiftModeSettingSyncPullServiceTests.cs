// <copyright file="ShiftModeSettingSyncPullServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.ShiftModeSetting.Services;

using global::Codenized.Planixor.Dtos.ShiftModeSetting.Sync;
using global::Codenized.Planixor.UseCases.ShiftModeSetting.SyncPull;
using global::Codenized.Planixor.UseCases.ShiftModeSetting.SyncPull.Queries;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;
using ShiftModeSettingEntity = global::Codenized.Planixor.Core.Entities.ShiftModeSetting;

/// <summary>
/// Unit tests for <see cref="ShiftModeSettingSyncPullService"/>.
/// </summary>
[TestFixture]
public sealed class ShiftModeSettingSyncPullServiceTests
{
    private IShiftModeSettingSyncPullQueries queries = null!;
    private ILogger<ShiftModeSettingSyncPullService> logger = null!;
    private ShiftModeSettingSyncPullService service = null!;

    /// <summary>
    /// Sets up test dependencies.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.queries = Substitute.For<IShiftModeSettingSyncPullQueries>();
        this.logger = Substitute.For<ILogger<ShiftModeSettingSyncPullService>>();
        this.service = new ShiftModeSettingSyncPullService(this.logger, this.queries);
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
        var request = new ShiftModeSettingSyncPullRequest(userId, lastSyncedAt, cursor);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, cursor)
            .Returns(new ShiftModeSettingSyncPullResult
            {
                Records = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        await this.service.Run(request);

        // Assert
        await this.queries.Received(1).GetModifiedAfterAsync(userId, lastSyncedAt, cursor);
    }

    /// <summary>
    /// Run with null last synced at passes DateTime.MinValue to queries.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithNullLastSyncedAt_PassesMinValueToQueries()
    {
        // Arrange
        string userId = "testuser";
        var request = new ShiftModeSettingSyncPullRequest(userId, null, null);

        this.queries.GetModifiedAfterAsync(userId, DateTime.MinValue, null)
            .Returns(new ShiftModeSettingSyncPullResult
            {
                Records = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ShiftModeSettingSyncPullResponse response = await this.service.Run(request);

        // Assert
        await this.queries.Received(1).GetModifiedAfterAsync(userId, DateTime.MinValue, null);
        Assert.That(response.Records, Is.Empty);
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
        var request = new ShiftModeSettingSyncPullRequest(userId, lastSyncedAt, null);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ShiftModeSettingSyncPullResult
            {
                Records = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ShiftModeSettingSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Records, Is.Empty);
        Assert.That(response.Cursor, Is.Null);
        Assert.That(response.HasMore, Is.False);
    }

    /// <summary>
    /// Run with records maps entities to DTOs correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithRecords_MapsEntitiesToDtosCorrectly()
    {
        // Arrange
        string userId = "testuser";
        Guid settingId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        DateTime modifiedAt = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        ShiftModeSettingEntity entity = ShiftModeSettingEntity.CreateFromSync(
            settingId,
            userId,
            true,
            modifiedAt,
            false);

        var request = new ShiftModeSettingSyncPullRequest(userId, lastSyncedAt, null);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ShiftModeSettingSyncPullResult
            {
                Records = [entity],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ShiftModeSettingSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Records, Has.Count.EqualTo(1));
        ShiftModeSettingSyncRecord record = response.Records[0];
        Assert.That(record.Id, Is.EqualTo(settingId));
        Assert.That(record.Enabled, Is.True);
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
        var request = new ShiftModeSettingSyncPullRequest(userId, lastSyncedAt, null);

        ShiftModeSettingEntity entity = ShiftModeSettingEntity.CreateFromSync(
            Guid.NewGuid(),
            userId,
            false,
            DateTime.UtcNow,
            false);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ShiftModeSettingSyncPullResult
            {
                Records = [entity],
                Cursor = expectedCursor,
                HasMore = true,
            });

        // Act
        ShiftModeSettingSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Cursor, Is.EqualTo(expectedCursor));
        Assert.That(response.HasMore, Is.True);
    }
}
