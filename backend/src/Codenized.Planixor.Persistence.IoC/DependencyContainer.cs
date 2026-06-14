// <copyright file="DependencyContainer.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.IoC;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Codenized.CleanArchitecture.Persistence.MySql;

/// <summary>Dependency container.</summary>
public static class DependencyContainer
{
    /// <summary>Add the application persistence.</summary>
    /// <param name="services">Service collection.</param>
    /// <param name="friendly">Friendly name.</param>
    /// <param name="configuration">Application configuration.</param>
    /// <param name="readConnectionString">Read connection string.</param>
    /// <param name="writeConnectionString">Write connection string.</param>
    /// <returns>A service collection.</returns>
    public static IServiceCollection AddApplicationPersistence(
        this IServiceCollection services,
        string friendly,
        IConfiguration configuration,
        string readConnectionString,
        string writeConnectionString)
    {
        services.AddCleanArchitecturePersistence(friendly, configuration, readConnectionString, writeConnectionString);
        return services;
    }

    /// <summary>Use application migrations.</summary>
    /// <param name="host">Host.</param>
    /// <returns>A host.</returns>
    public static IHost UseApplicationMigrations(this IHost host)
    {
        using (var scope = host.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<MigrationContext>();
            db.Database.Migrate();
        }

        return host;
    }
}
