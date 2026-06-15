// <copyright file="ShiftSyncPullServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Services;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using global::Codenized.Planixor.Dtos.Shift.Sync;
using global::Codenized.Planixor.UseCases.Shift.SyncPull;
using global::Codenized.Planixor.UseCases.Shift.SyncPull.Queries;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

/// <summary>
/// Unit tests for <see cref="ShiftSyncPullService"/>.
/// </summary>
[TestFixture]
public sealed class ShiftSyncPullServiceTests
{
    private IShiftSyncPullQueries queries = null!;
    private ILogger<ShiftSyncPullService> logger = null!;
    private ShiftSyncPullService service = null!;

    /// <summary>
    /// Sets up test dependencies.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.queries = Substitute.For<IShiftSyncPullQueries>();
        this.logger = Substitute.For<ILogger<ShiftSyncPullService>>();
        this.service = new ShiftSyncPullService(this.logger, this.queries);
    }

    /// <summary>
    /// Run with valid request calls queries with correct parameters.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithValidRequest_CallsQueriesWithCorrectParameters()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = new DateTime(2024, 6, 15, 10, 0, 0, DateTimeKind.Utc);
        string cursor = "abc123";
        var request = new ShiftSyncPullRequest(userId, lastSyncedAt, cursor);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, cursor)
            .Returns(new ShiftSyncPullResult
            {
                Shifts = [],
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
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        var request = new ShiftSyncPullRequest(userId, lastSyncedAt, null);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ShiftSyncPullResult
            {
                Shifts = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ShiftSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Shifts, Is.Empty);
        Assert.That(response.Cursor, Is.Null);
        Assert.That(response.HasMore, Is.False);
    }

    /// <summary>
    /// Run with shifts maps entities to sync items correctly.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithShifts_MapsEntitiesToSyncItemsCorrectly()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        Guid shiftId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        DateTime createdAt = new DateTime(2024, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        DateTime modifiedAt = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        global::Codenized.Planixor.Core.Entities.Shift shift = global::Codenized.Planixor.Core.Entities.Shift.CreateFromSync(
            shiftId,
            userId,
            ShiftName.Create("Morning Shift"),
            ShiftIcon.Create("☀️"),
            ShiftColor.Create("#EF4444"),
            ShiftTime.Create(8, 0),
            ShiftTime.Create(16, 0),
            HoursWorked.Create(480),
            true,
            createdAt,
            modifiedAt,
            false);

        var request = new ShiftSyncPullRequest(userId, lastSyncedAt, null);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ShiftSyncPullResult
            {
                Shifts = [shift],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ShiftSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Shifts, Has.Count.EqualTo(1));
        ShiftSyncItem item = response.Shifts[0];
        Assert.That(item.Id, Is.EqualTo(shiftId));
        Assert.That(item.Name, Is.EqualTo("Morning Shift"));
        Assert.That(item.Icon, Is.EqualTo("☀️"));
        Assert.That(item.BackgroundColor, Is.EqualTo("#EF4444"));
        Assert.That(item.StartTime, Is.EqualTo(480));
        Assert.That(item.EndTime, Is.EqualTo(960));
        Assert.That(item.HoursWorked, Is.EqualTo(480));
        Assert.That(item.IsActive, Is.True);
        Assert.That(item.CreatedAt, Is.EqualTo(createdAt));
        Assert.That(item.ModifiedAt, Is.EqualTo(modifiedAt));
        Assert.That(item.IsDeleted, Is.False);
    }

    /// <summary>
    /// Run with pagination returns cursor and has more flag.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithPagination_ReturnsCursorAndHasMoreFlag()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        string expectedCursor = "next-page-cursor";
        var request = new ShiftSyncPullRequest(userId, lastSyncedAt, null);

        global::Codenized.Planixor.Core.Entities.Shift shift = global::Codenized.Planixor.Core.Entities.Shift.CreateFromSync(
            Guid.NewGuid(),
            userId,
            ShiftName.Create("Shift"),
            ShiftIcon.Create("🌙"),
            ShiftColor.Create("#2563EB"),
            ShiftTime.Create(22, 0),
            ShiftTime.Create(6, 0),
            HoursWorked.Create(480),
            true,
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow,
            false);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new ShiftSyncPullResult
            {
                Shifts = [shift],
                Cursor = expectedCursor,
                HasMore = true,
            });

        // Act
        ShiftSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Cursor, Is.EqualTo(expectedCursor));
        Assert.That(response.HasMore, Is.True);
    }

    /// <summary>
    /// Run with null last synced at passes null to queries.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithNullLastSyncedAt_PassesMinValueToQueries()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        var request = new ShiftSyncPullRequest(userId, null, null);

        this.queries.GetModifiedAfterAsync(userId, DateTime.MinValue, null)
            .Returns(new ShiftSyncPullResult
            {
                Shifts = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        ShiftSyncPullResponse response = await this.service.Run(request);

        // Assert
        await this.queries.Received(1).GetModifiedAfterAsync(userId, DateTime.MinValue, null);
        Assert.That(response.Shifts, Is.Empty);
    }
}
