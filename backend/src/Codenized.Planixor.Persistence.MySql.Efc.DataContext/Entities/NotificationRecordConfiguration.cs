// <copyright file="NotificationRecordConfiguration.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Entities;

using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

/// <summary>
/// EF Core configuration for the <see cref="NotificationRecord"/> entity.
/// </summary>
public sealed class NotificationRecordConfiguration : IEntityTypeConfiguration<NotificationRecord>
{
    /// <summary>
    /// Configures the NotificationRecord entity mapping to the NotificationRecords table.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<NotificationRecord> builder)
    {
        builder.ToTable("NotificationRecords");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.Id)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(n => n.UserId)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(n => n.CalendarEventId)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(n => n.AlertOffset)
            .HasColumnType("int")
            .IsRequired();

        builder.Property(n => n.TriggerTime)
            .HasColumnType("datetime(6)")
            .IsRequired();

        builder.Property(n => n.IsDelivered)
            .HasColumnType("tinyint(1)")
            .IsRequired();

        builder.Property(n => n.IsRead)
            .HasColumnType("tinyint(1)")
            .IsRequired();

        builder.Property(n => n.ModifiedAt)
            .HasColumnType("datetime(6)")
            .IsRequired();

        builder.Property(n => n.SyncedAt)
            .HasColumnType("datetime(6)");

        builder.Property(n => n.IsDeleted)
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(false)
            .IsRequired();

        builder.HasIndex(n => new { n.UserId, n.ModifiedAt })
            .HasDatabaseName("IX_NotificationRecords_UserId_ModifiedAt");

        builder.HasIndex(n => new { n.UserId, n.IsDeleted })
            .HasDatabaseName("IX_NotificationRecords_UserId_IsDeleted");

        builder.HasIndex(n => new { n.CalendarEventId, n.AlertOffset, n.IsDeleted })
            .HasDatabaseName("IX_NotificationRecords_CalendarEventId_AlertOffset_IsDeleted");
    }
}
