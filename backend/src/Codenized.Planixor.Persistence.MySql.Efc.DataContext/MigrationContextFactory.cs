// <copyright file="MigrationContextFactory.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

/// <summary>Migration context factory.</summary>
public sealed class MigrationContextFactory : IDesignTimeDbContextFactory<MigrationContext>
{
    /// <summary>Create database context.</summary>
    /// <param name="args">Arguments.</param>
    /// <returns>A migration context.</returns>
    MigrationContext IDesignTimeDbContextFactory<MigrationContext>.CreateDbContext(string[] args)
    {
        var user = "dbuser";
        var pwd = "dbpwd";
        var db = "dbname";
        string connectionString = $"server=localhost;user id={user};password={pwd};persistsecurityinfo=True;database={db}";
        var optionsBuilder = new DbContextOptionsBuilder<MigrationContext>();
        optionsBuilder.UseMySQL(connectionString);
        return new MigrationContext(optionsBuilder.Options);
    }
}
