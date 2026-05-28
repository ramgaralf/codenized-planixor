// <copyright file="DataContextGuards.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Guards;

using Microsoft.EntityFrameworkCore;
using Codenized.CleanArchitecture.Abstractions.Exceptions;

/// <summary>Guard methods for database context operations.</summary>
public static class DataContextGuards
{
    /// <summary>Saves changes with exception handling.</summary>
    /// <param name="context">The database context.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    /// <exception cref="DatabaseException">Thrown when a DbUpdateException occurs.</exception>
    public static async Task SaveChanges(DbContext context)
    {
        try
        {
            await context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            throw new DatabaseException(
                "DATABASE_UPDATING_FAILS",
                "Database Updating Fails",
                ex.InnerException?.Message ?? ex.Message,
                ex.Entries.Select(e => e.Entity.GetType().Name).ToList());
        }
    }
}
