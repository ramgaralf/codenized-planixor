// <copyright file="IApplicationContext.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext;

using Codenized.Planixor.Core.Entities;
using Microsoft.EntityFrameworkCore;

/// <summary>Interface for the application context.</summary>
public interface IApplicationContext
{
    /// <summary>
    /// Gets shifts.
    /// </summary>
    DbSet<Shift> Shifts { get; }

    /// <summary>
    /// Gets reminders.
    /// </summary>
    DbSet<Reminder> Reminders { get; }

    /// <summary>
    /// Gets calendar events.
    /// </summary>
    DbSet<CalendarEvent> CalendarEvents { get; }
}
