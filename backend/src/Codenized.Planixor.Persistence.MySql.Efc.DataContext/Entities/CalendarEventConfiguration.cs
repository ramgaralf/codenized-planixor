// <copyright file="CalendarEventConfiguration.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Entities;

using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

/// <summary>
/// EF Core configuration for the <see cref="CalendarEvent"/> entity.
/// </summary>
public sealed class CalendarEventConfiguration : IEntityTypeConfiguration<CalendarEvent>
{
    /// <summary>
    /// Configures the CalendarEvent entity mapping to the CalendarEvents table.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<CalendarEvent> builder)
    {
        builder.ToTable("CalendarEvents", t =>
        {
            t.HasCheckConstraint("CK_CalendarEvents_EventType", "EventType IN ('shift', 'reminder')");
            t.HasCheckConstraint("CK_CalendarEvents_StartTime", "StartTime >= 0 AND StartTime <= 1439");
            t.HasCheckConstraint("CK_CalendarEvents_EndTime", "EndTime >= 0 AND EndTime <= 1439");
        });

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(e => e.UserId)
            .HasColumnType("varchar(50)")
            .IsRequired();

        builder.Property(e => e.EventType)
            .HasColumnType("varchar(10)")
            .IsRequired();

        builder.Property(e => e.EventTypeId)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(e => e.StartDay)
            .HasColumnType("date")
            .HasConversion(
                v => v.ToDateTime(TimeOnly.MinValue),
                v => DateOnly.FromDateTime(v))
            .IsRequired();

        builder.Property(e => e.EndDay)
            .HasColumnType("date")
            .HasConversion(
                v => v.ToDateTime(TimeOnly.MinValue),
                v => DateOnly.FromDateTime(v))
            .IsRequired();

        builder.Property(e => e.StartTime)
            .HasColumnType("int")
            .IsRequired();

        builder.Property(e => e.EndTime)
            .HasColumnType("int")
            .IsRequired();

        builder.Property(e => e.TotalHours)
            .HasColumnType("int")
            .IsRequired();

        builder.Property(e => e.Notes)
            .HasColumnType("varchar(250)");

        builder.Property(e => e.AlertOffsetsJson)
            .HasColumnType("varchar(50)")
            .HasDefaultValue("[]")
            .IsRequired();

        builder.Property(e => e.SeriesId)
            .HasColumnType("varchar(36)")
            .HasDefaultValue(string.Empty)
            .IsRequired();

        builder.Property(e => e.ModifiedAt)
            .HasColumnType("datetime(6)")
            .IsRequired();

        builder.Property(e => e.SyncedAt)
            .HasColumnType("datetime(6)");

        builder.Property(e => e.IsDeleted)
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(false)
            .IsRequired();

        builder.HasIndex(e => e.UserId)
            .HasDatabaseName("IX_CalendarEvents_UserId");

        builder.HasIndex(e => e.StartDay)
            .HasDatabaseName("IX_CalendarEvents_StartDay");

        builder.HasIndex(e => e.EndDay)
            .HasDatabaseName("IX_CalendarEvents_EndDay");

        // The sync pull query filters and orders by SyncedAt, so this is the index it needs. The equivalent over
        // ModifiedAt used to be the only composite here: no query ever used it, MySQL fell back to the UserId prefix
        // and filesorted the user's whole partition on every page, and the write cost was paid for nothing.
        builder.HasIndex(e => new { e.UserId, e.SyncedAt })
            .HasDatabaseName("IX_CalendarEvents_UserId_SyncedAt");
    }
}
