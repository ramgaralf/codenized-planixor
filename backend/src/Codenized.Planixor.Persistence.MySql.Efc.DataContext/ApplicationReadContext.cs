// <copyright file="ApplicationReadContext.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext;

using System.Reflection;
using Codenized.CleanArchitecture.Persistence.Abstractions.Extensions;
using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;

/// <summary>Application read context.</summary>
public sealed class ApplicationReadContext : DbContext, IApplicationContext
{
    private readonly IServiceProvider? serviceProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationReadContext"/> class.
    /// </summary>
    /// <param name="options">Database context options.</param>
    /// <param name="serviceProvider">
    /// The container used to build entity configurations that need services. Optional because the design-time
    /// factory builds this context without one; see <see cref="OnModelCreating"/>.
    /// </param>
    public ApplicationReadContext(DbContextOptions<ApplicationReadContext> options, IServiceProvider? serviceProvider = null)
        : base(options)
    {
        this.serviceProvider = serviceProvider;
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

    /// <summary>
    /// Gets notification records.
    /// </summary>
    public DbSet<NotificationRecord> NotificationRecords => this.Set<NotificationRecord>();

    /// <summary>
    /// Gets shift mode settings.
    /// </summary>
    public DbSet<ShiftModeSetting> ShiftModeSettings => this.Set<ShiftModeSetting>();

    /// <summary>On model creating.</summary>
    /// <param name="modelBuilder">Model builder.</param>
    /// <remarks>
    /// Uses the framework's <c>ApplyAllConfigurationsFrom</c> rather than EF's own
    /// <c>ApplyConfigurationsFromAssembly</c>, so an entity configuration may take its dependencies through the
    /// constructor — a cryptology service backing a value converter, for instance. When no container is available,
    /// as at design time, every configuration is built through its parameterless constructor; one that needs
    /// services fails there with a message saying so, rather than producing a model that differs from the running one.
    /// </remarks>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyAllConfigurationsFrom(Assembly.GetExecutingAssembly(), this.serviceProvider);
    }
}
