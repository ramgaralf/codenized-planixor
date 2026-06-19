// <copyright file="MigrationContext.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext;

using System.Reflection;
using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;

/// <summary>Migration context.</summary>
public sealed class MigrationContext : DbContext, IApplicationContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="MigrationContext"/> class.
    /// </summary>
    /// <param name="options">Database context options.</param>
    public MigrationContext(DbContextOptions<MigrationContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// Gets shifts.
    /// </summary>
    public DbSet<Shift> Shifts => this.Set<Shift>();

    /// <summary>
    /// Gets reminders.
    /// </summary>
    public DbSet<Reminder> Reminders => this.Set<Reminder>();

    /// <summary>
    /// Gets calendar events.
    /// </summary>
    public DbSet<CalendarEvent> CalendarEvents => this.Set<CalendarEvent>();

    /// <summary>
    /// Gets annual hours configs.
    /// </summary>
    public DbSet<AnnualHoursConfig> AnnualHoursConfigs => this.Set<AnnualHoursConfig>();

    /// <summary>On model creating.</summary>
    /// <param name="modelBuilder">Model builder.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
