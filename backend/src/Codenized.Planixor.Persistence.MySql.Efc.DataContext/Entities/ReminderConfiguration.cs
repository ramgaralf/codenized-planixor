// <copyright file="ReminderConfiguration.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Entities;

using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

/// <summary>
/// EF Core configuration for the <see cref="Reminder"/> entity.
/// </summary>
public sealed class ReminderConfiguration : IEntityTypeConfiguration<Reminder>
{
    /// <summary>
    /// Configures the Reminder entity mapping to the Reminders table.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<Reminder> builder)
    {
        builder.ToTable("Reminders");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(r => r.UserId)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.OwnsOne(r => r.Name, name =>
        {
            name.Property(n => n.Value)
                .HasColumnName("Name")
                .HasColumnType("varchar(50)")
                .IsRequired();
        });

        builder.OwnsOne(r => r.Icon, icon =>
        {
            icon.Property(i => i.Value)
                .HasColumnName("Icon")
                .HasColumnType("varchar(10)")
                .IsRequired();
        });

        builder.OwnsOne(r => r.BackgroundColor, color =>
        {
            color.Property(c => c.Value)
                .HasColumnName("BackgroundColor")
                .HasColumnType("varchar(7)")
                .IsRequired();
        });

        builder.Property(r => r.IsActive)
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(r => r.CreatedAt)
            .HasColumnType("datetime(6)")
            .IsRequired();

        builder.Property(r => r.ModifiedAt)
            .HasColumnType("datetime(6)")
            .IsRequired();

        builder.Property(r => r.SyncedAt)
            .HasColumnType("datetime(6)");

        builder.Property(r => r.IsDeleted)
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(false)
            .IsRequired();

        builder.HasIndex(r => r.UserId)
            .HasDatabaseName("IX_Reminders_UserId");

        builder.HasIndex(r => new { r.UserId, r.ModifiedAt })
            .HasDatabaseName("IX_Reminders_UserId_ModifiedAt");
    }
}
