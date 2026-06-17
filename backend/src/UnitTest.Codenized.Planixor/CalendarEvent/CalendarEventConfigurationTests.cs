// <copyright file="CalendarEventConfigurationTests.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.CalendarEvent;

using global::Codenized.Planixor.Persistence.MySql.Efc.DataContext.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using NUnit.Framework;

using CalendarEventEntity = global::Codenized.Planixor.Core.Entities.CalendarEvent;

/// <summary>
/// Tests for the CalendarEvent EF Core configuration.
/// </summary>
[TestFixture]
public sealed class CalendarEventConfigurationTests
{
    private IMutableEntityType entityType = null!;

    /// <summary>
    /// Sets up the model builder and applies the configuration.
    /// </summary>
    [SetUp]
    public void SetUp()
    {
        var modelBuilder = new ModelBuilder();
        modelBuilder.ApplyConfiguration(new CalendarEventConfiguration());
        this.entityType = modelBuilder.Model.FindEntityType(typeof(CalendarEventEntity))!;
    }

    /// <summary>
    /// Verifies the table name is CalendarEvents.
    /// </summary>
    [Test]
    public void Configure_TableName_IsCalendarEvents()
        => Assert.That(this.entityType.GetTableName(), Is.EqualTo("CalendarEvents"));

    /// <summary>
    /// Verifies the primary key is Id.
    /// </summary>
    [Test]
    public void Configure_Id_IsPrimaryKey()
        => Assert.That(this.entityType.FindPrimaryKey()!.Properties[0].Name, Is.EqualTo(nameof(CalendarEventEntity.Id)));

    /// <summary>
    /// Verifies UserId is required.
    /// </summary>
    [Test]
    public void Configure_UserId_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.UserId))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies EventType is required.
    /// </summary>
    [Test]
    public void Configure_EventType_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.EventType))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies EventTypeId is required.
    /// </summary>
    [Test]
    public void Configure_EventTypeId_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.EventTypeId))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies StartDay is required.
    /// </summary>
    [Test]
    public void Configure_StartDay_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.StartDay))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies EndDay is required.
    /// </summary>
    [Test]
    public void Configure_EndDay_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.EndDay))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies TotalHours is required.
    /// </summary>
    [Test]
    public void Configure_TotalHours_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.TotalHours))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies StartTime is required.
    /// </summary>
    [Test]
    public void Configure_StartTime_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.StartTime))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies EndTime is required.
    /// </summary>
    [Test]
    public void Configure_EndTime_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.EndTime))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies Notes is optional.
    /// </summary>
    [Test]
    public void Configure_Notes_IsOptional()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.Notes))!.IsNullable, Is.True);

    /// <summary>
    /// Verifies ModifiedAt is required.
    /// </summary>
    [Test]
    public void Configure_ModifiedAt_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.ModifiedAt))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies SyncedAt is optional.
    /// </summary>
    [Test]
    public void Configure_SyncedAt_IsOptional()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.SyncedAt))!.IsNullable, Is.True);

    /// <summary>
    /// Verifies IsDeleted is required.
    /// </summary>
    [Test]
    public void Configure_IsDeleted_IsRequired()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.IsDeleted))!.IsNullable, Is.False);

    /// <summary>
    /// Verifies IsDeleted has a default value of false.
    /// </summary>
    [Test]
    public void Configure_IsDeleted_DefaultValueIsFalse()
        => Assert.That(this.entityType.FindProperty(nameof(CalendarEventEntity.IsDeleted))!.GetDefaultValue(), Is.EqualTo(false));
}
