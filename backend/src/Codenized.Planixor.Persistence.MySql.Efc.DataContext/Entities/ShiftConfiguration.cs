// <copyright file="ShiftConfiguration.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Entities;

using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

/// <summary>
/// EF Core configuration for the <see cref="Shift"/> entity.
/// </summary>
public sealed class ShiftConfiguration : IEntityTypeConfiguration<Shift>
{
    /// <summary>
    /// Configures the Shift entity mapping to the Shifts table.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<Shift> builder)
    {
        builder.ToTable("Shifts");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id)
            .HasColumnType("char(36)")
            .IsRequired();

        builder.Property(s => s.UserId)
            .HasColumnType("varchar(50)")
            .IsRequired();

        builder.OwnsOne(s => s.Name, name =>
        {
            name.Property(n => n.Value)
                .HasColumnName("Name")
                .HasColumnType("varchar(50)")
                .IsRequired();
        });

        builder.OwnsOne(s => s.Icon, icon =>
        {
            icon.Property(i => i.Value)
                .HasColumnName("Icon")
                .HasColumnType("varchar(10)")
                .IsRequired();
        });

        builder.OwnsOne(s => s.BackgroundColor, color =>
        {
            color.Property(c => c.Value)
                .HasColumnName("BackgroundColor")
                .HasColumnType("varchar(7)")
                .IsRequired();
        });

        builder.OwnsOne(s => s.StartTime, startTime =>
        {
            startTime.Property(st => st.TotalMinutes)
                .HasColumnName("StartTime")
                .HasColumnType("int")
                .IsRequired();
        });

        builder.OwnsOne(s => s.EndTime, endTime =>
        {
            endTime.Property(et => et.TotalMinutes)
                .HasColumnName("EndTime")
                .HasColumnType("int")
                .IsRequired();
        });

        builder.OwnsOne(s => s.HoursWorked, hoursWorked =>
        {
            hoursWorked.Property(hw => hw.TotalMinutes)
                .HasColumnName("HoursWorked")
                .HasColumnType("int")
                .IsRequired();
        });

        builder.Property(s => s.IsActive)
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(s => s.CreatedAt)
            .HasColumnType("datetime(6)")
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
            .HasDatabaseName("IX_Shifts_UserId");

        // The sync pull query filters and orders by SyncedAt, so this is the index it needs. The equivalent over
        // ModifiedAt used to be the only composite here: no query ever used it, MySQL fell back to the UserId prefix
        // and filesorted the user's whole partition on every page, and the write cost was paid for nothing.
        builder.HasIndex(s => new { s.UserId, s.SyncedAt })
            .HasDatabaseName("IX_Shifts_UserId_SyncedAt");

        builder.Ignore("DomainEvents");
    }
}
