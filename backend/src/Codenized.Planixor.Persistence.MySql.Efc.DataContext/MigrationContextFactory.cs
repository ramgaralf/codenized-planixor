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
    /// <remarks>
    /// Design time only: <c>dotnet ef</c> uses this to build the model when generating migrations, so there is no
    /// container and no application configuration here. The context is therefore constructed without a service
    /// provider, and every entity configuration is built through its parameterless constructor.
    /// </remarks>
    MigrationContext IDesignTimeDbContextFactory<MigrationContext>.CreateDbContext(string[] args)
    {
        var user = "dbuser";
        var pwd = "dbpwd";
        var db = "dbname";
        string connectionString = $"server=localhost;user id={user};password={pwd};database={db}";
        var optionsBuilder = new DbContextOptionsBuilder<MigrationContext>();
        optionsBuilder.UseMySQL(connectionString);
        return new MigrationContext(optionsBuilder.Options);
    }
}
