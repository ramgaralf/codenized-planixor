// <copyright file="AnnualHoursConfigConfiguration.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Entities;

using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

/// <summary>
/// EF Core configuration for the <see cref="AnnualHoursConfig"/> entity.
/// </summary>
public sealed class AnnualHoursConfigConfiguration : IEntityTypeConfiguration<AnnualHoursConfig>
{
    /// <summary>
    /// Configures the AnnualHoursConfig entity mapping to the AnnualHoursConfigs table.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<AnnualHoursConfig> builder)
    {
        builder.ToTable("AnnualHoursConfigs");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(a => a.UserId)
            .HasColumnType("varchar(50)")
            .IsRequired();

        builder.Property(a => a.Year)
            .HasColumnType("int")
            .IsRequired();

        builder.Property(a => a.ConfiguredHours)
            .HasColumnType("int")
            .IsRequired();

        builder.Property(a => a.ModifiedAt)
            .HasColumnType("datetime(6)")
            .IsRequired();

        builder.Property(a => a.SyncedAt)
            .HasColumnType("datetime(6)");

        builder.Property(a => a.IsDeleted)
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(false)
            .IsRequired();

        builder.HasIndex(a => a.UserId)
            .HasDatabaseName("IX_AnnualHoursConfigs_UserId");

        builder.HasIndex(a => new { a.UserId, a.Year })
            .IsUnique()
            .HasDatabaseName("IX_AnnualHoursConfigs_UserId_Year")
            .HasFilter("IsDeleted = 0");

        builder.HasIndex(a => new { a.UserId, a.ModifiedAt })
            .HasDatabaseName("IX_AnnualHoursConfigs_UserId_ModifiedAt");
    }
}
