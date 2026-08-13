// <copyright file="ShiftModeSettingConfiguration.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Entities;

using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

/// <summary>
/// EF Core configuration for the <see cref="ShiftModeSetting"/> entity.
/// </summary>
public sealed class ShiftModeSettingConfiguration : IEntityTypeConfiguration<ShiftModeSetting>
{
    /// <summary>
    /// Configures the ShiftModeSetting entity mapping to the ShiftModeSettings table.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<ShiftModeSetting> builder)
    {
        builder.ToTable("ShiftModeSettings");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(s => s.UserId)
            .HasColumnType("varchar(50)")
            .IsRequired();

        builder.Property(s => s.Enabled)
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(false)
            .IsRequired();

        builder.Property(s => s.ModifiedAt)
            .HasColumnType("datetime(6)")
            .IsRequired();

        builder.Property(s => s.SyncedAt)
            .HasColumnType("datetime(6)");

        builder.Property(s => s.IsDeleted)
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(false)
            .IsRequired();

        builder.HasIndex(s => s.UserId)
            .HasDatabaseName("IX_ShiftModeSettings_UserId");

        // The sync pull query filters and orders by SyncedAt, so this is the index it needs. The equivalent over
        // ModifiedAt used to be the only composite here: no query ever used it, MySQL fell back to the UserId prefix
        // and filesorted the user's whole partition on every page, and the write cost was paid for nothing.
        builder.HasIndex(s => new { s.UserId, s.SyncedAt })
            .HasDatabaseName("IX_ShiftModeSettings_UserId_SyncedAt");
    }
}
