// <copyright file="CalendarEventSyncPullServiceTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.CalendarEvent.Services;

using global::Codenized.Planixor.Dtos.CalendarEvent.Sync;
using global::Codenized.Planixor.UseCases.CalendarEvent.SyncPull;
using global::Codenized.Planixor.UseCases.CalendarEvent.SyncPull.Queries;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NUnit.Framework;

using CalendarEventEntity = global::Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Unit tests for <see cref="CalendarEventSyncPullService"/>.
/// </summary>
[TestFixture]
public sealed class CalendarEventSyncPullServiceTests
{
    private ICalendarEventSyncPullQueries queries = null!;
    private ILogger<CalendarEventSyncPullService> logger = null!;
    private CalendarEventSyncPullService service = null!;

    /// <summary>
    /// Sets up test dependencies.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        this.queries = Substitute.For<ICalendarEventSyncPullQueries>();
        this.logger = Substitute.For<ILogger<CalendarEventSyncPullService>>();
        this.service = new CalendarEventSyncPullService(this.logger, this.queries);
    }

    /// <summary>
    /// Run with valid request returns calendar event records.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithValidRequest_ReturnsCalendarEventRecords()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = new DateTime(2024, 6, 15, 10, 0, 0, DateTimeKind.Utc);
        string cursor = "page-cursor";
        var request = new CalendarEventSyncPullRequest(userId, lastSyncedAt, cursor);

        CalendarEventEntity entity = CalendarEventEntity.CreateFromSync(
            Guid.NewGuid(),
            userId,
            "shift",
            Guid.NewGuid(),
            DateOnly.Parse("2024-06-15"),
            480,
            960,
            "Test notes",
            lastSyncedAt,
            false);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, cursor)
            .Returns(new CalendarEventSyncPullResult
            {
                CalendarEvents = [entity],
                Cursor = null,
                HasMore = false,
            });

        // Act
        CalendarEventSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Records, Has.Count.EqualTo(1));
        Assert.That(response.Cursor, Is.Null);
    }

    /// <summary>
    /// Run with null last synced at uses MinValue.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithNullLastSyncedAt_UsesMinValue()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        var request = new CalendarEventSyncPullRequest(userId, null, null);

        this.queries.GetModifiedAfterAsync(userId, DateTime.MinValue, null)
            .Returns(new CalendarEventSyncPullResult
            {
                CalendarEvents = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        CalendarEventSyncPullResponse response = await this.service.Run(request);

        // Assert
        await this.queries.Received(1).GetModifiedAfterAsync(userId, DateTime.MinValue, null);
        Assert.That(response.Records, Is.Empty);
    }

    /// <summary>
    /// Run with cursor passes cursor to queries.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_WithCursor_PassesCursorToQueries()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = new DateTime(2024, 6, 15, 10, 0, 0, DateTimeKind.Utc);
        string cursor = "abc123-next-page";
        var request = new CalendarEventSyncPullRequest(userId, lastSyncedAt, cursor);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, cursor)
            .Returns(new CalendarEventSyncPullResult
            {
                CalendarEvents = [],
                Cursor = null,
                HasMore = false,
            });

        // Act
        await this.service.Run(request);

        // Assert
        await this.queries.Received(1).GetModifiedAfterAsync(userId, lastSyncedAt, cursor);
    }

    /// <summary>
    /// Run returns null cursor when no more pages.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_ReturnsNullCursorWhenNoMorePages()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        var request = new CalendarEventSyncPullRequest(userId, lastSyncedAt, null);

        CalendarEventEntity entity = CalendarEventEntity.CreateFromSync(
            Guid.NewGuid(),
            userId,
            "reminder",
            Guid.NewGuid(),
            DateOnly.Parse("2024-06-20"),
            120,
            180,
            null,
            DateTime.UtcNow,
            false);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new CalendarEventSyncPullResult
            {
                CalendarEvents = [entity],
                Cursor = null,
                HasMore = false,
            });

        // Act
        CalendarEventSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Cursor, Is.Null);
        Assert.That(response.Records, Has.Count.EqualTo(1));
    }

    /// <summary>
    /// Run maps entities correctly to sync records.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    [Test]
    public async Task Run_MapsEntitiesCorrectlyToSyncRecords()
    {
        // Arrange
        Guid userId = Guid.NewGuid();
        Guid eventId = Guid.NewGuid();
        Guid eventTypeId = Guid.NewGuid();
        DateTime lastSyncedAt = DateTime.UtcNow.AddHours(-1);
        DateTime modifiedAt = new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        CalendarEventEntity entity = CalendarEventEntity.CreateFromSync(
            eventId,
            userId,
            "shift",
            eventTypeId,
            DateOnly.Parse("2024-06-15"),
            480,
            960,
            "Meeting notes",
            modifiedAt,
            false);

        var request = new CalendarEventSyncPullRequest(userId, lastSyncedAt, null);

        this.queries.GetModifiedAfterAsync(userId, lastSyncedAt, null)
            .Returns(new CalendarEventSyncPullResult
            {
                CalendarEvents = [entity],
                Cursor = null,
                HasMore = false,
            });

        // Act
        CalendarEventSyncPullResponse response = await this.service.Run(request);

        // Assert
        Assert.That(response.Records, Has.Count.EqualTo(1));
        CalendarEventSyncRecord record = response.Records[0];
        Assert.That(record.Id, Is.EqualTo(eventId));
        Assert.That(record.EventType, Is.EqualTo("shift"));
        Assert.That(record.EventTypeId, Is.EqualTo(eventTypeId));
        Assert.That(record.Day, Is.EqualTo("2024-06-15"));
        Assert.That(record.StartTime, Is.EqualTo(480));
        Assert.That(record.EndTime, Is.EqualTo(960));
        Assert.That(record.Notes, Is.EqualTo("Meeting notes"));
        Assert.That(record.ModifiedAt, Is.EqualTo(modifiedAt));
        Assert.That(record.IsDeleted, Is.False);
    }
}
