// <copyright file="ApplicationWriteContext.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext;

using System.Reflection;
using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;

/// <summary>Application write context.</summary>
public sealed class ApplicationWriteContext : DbContext, IApplicationContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationWriteContext"/> class.
    /// </summary>
    /// <param name="options">Database context options.</param>
    public ApplicationWriteContext(DbContextOptions<ApplicationWriteContext> options)
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

    /// <summary>On model creating.</summary>
    /// <param name="modelBuilder">Model builder.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
