// <copyright file="DependencyContainer.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.IoC;

using Codenized.CleanArchitecture.Abstractions;
using Codenized.CleanArchitecture.Persistence.MySql.HealthChecks;
using Codenized.Exceptions.GlobalExceptionStrategy;
using Codenized.HealthChecks.AspNetCore.Entities;
using Codenized.HealthChecks.AspNetCore.HealthChecks;
using Codenized.Planixor.Core.Settings;
using Codenized.Planixor.Persistence.IoC;
using Codenized.Planixor.Persistence.MySql.Efc.DataContext;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using System.Net.Mime;
using System.Runtime.InteropServices;
using System.Security.Authentication;

/// <summary>Dependency container.</summary>
public static class DependencyContainer
{
    /// <summary>Configure application.</summary>
    /// <param name="builder">Web application builder.</param>
    /// <returns>A web application builder.</returns>
    public static IHostApplicationBuilder ConfigureApplication(this IHostApplicationBuilder builder)
    {
        builder.LoadConfiguration();
        builder.Services.MapSettings(builder.Configuration);
        var appSettings = builder.Configuration.GetSection(nameof(AppSettings)).Get<AppSettings>() ?? new AppSettings();
        builder.Services.ConfigureAppHttpClient(appSettings.Product, appSettings.Service, appSettings.Version, appSettings.HttpClientTimeoutMiliseconds);
        builder.Services.AddCleanArchitecture(appSettings.Friendly);
        builder.Services.AddApplicationPersistence(appSettings.Friendly, builder.Configuration, "AppReadDb", "AppWriteDb");
        builder.Services.AddGlobalExceptionStrategy();
        return builder;
    }

    /// <summary>Add Api health checks.</summary>
    /// <param name="services">Service collection.</param>
    /// <param name="configuration">Configuration.</param>
    /// <returns>A service collection.</returns>
    public static IServiceCollection AddApiHealthChecks(this IServiceCollection services, IConfiguration configuration)
    {
        Codenized.HealthChecks.AspNetCore.DependencyContainer.AddAppHealthChecks(services, configuration);
        services.AddHealthChecks()
            .AddCheck<InternetHealthCheck>(
                "InternetConnection",
                failureStatus: HealthStatus.Unhealthy,
                tags: new[] { HealthChecksTags.HEALTH, HealthChecksTags.STATUS })
            .AddCheck<DbContextHealthCheck<ApplicationReadContext>>(
                "ApplicationReadContext",
                failureStatus: HealthStatus.Unhealthy,
                tags: new[] { HealthChecksTags.STATUS })
            .AddCheck<DbContextHealthCheck<ApplicationWriteContext>>(
                "ApplicationWriteContext",
                failureStatus: HealthStatus.Unhealthy,
                tags: new[] { HealthChecksTags.STATUS });

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            services.AddHealthChecks()
                .AddCheck(
                    @$"HardDisk (c:\)",
                    new DriveHealthCheck(@"c:\"),
                    failureStatus: HealthStatus.Unhealthy,
                    tags: new[] { HealthChecksTags.STATUS });
        }
        else
        {
            services.AddHealthChecks()
                .AddCheck(
                    $"HardDisk (/)",
                    new DriveHealthCheck("/"),
                    failureStatus: HealthStatus.Unhealthy,
                    tags: new[] { HealthChecksTags.STATUS });
        }

        return services;
    }

    private static IHostApplicationBuilder LoadConfiguration(this IHostApplicationBuilder builder)
    {
        builder.Configuration.Sources.Clear();
        builder.Configuration.SetBasePath(Directory.GetCurrentDirectory());
        builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: false);
        builder.Configuration.AddJsonFile("appsettings.localhost.json", optional: true, reloadOnChange: false);
        builder.Configuration.AddEnvironmentVariables();
        return builder;
    }

    private static IServiceCollection MapSettings(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AppSettings>(configuration.GetSection("AppSettings"));

        services.AddOptions<SecuritySettings>()
            .Bind(configuration.GetSection(nameof(SecuritySettings)))
            .Validate(
                s => s.ApiKeys != null && s.ApiKeys.Count > 0,
                "SecuritySettings must contain at least one API key entry.")
            .Validate(
                s => s.ApiKeys == null || s.ApiKeys.All(kv => !string.IsNullOrWhiteSpace(kv.Value)),
                "SecuritySettings contains an API key entry with an empty or whitespace value.")
            .ValidateOnStart();

        return services;
    }

    private static IServiceCollection ConfigureAppHttpClient(
        this IServiceCollection services,
        string productName,
        string serviceName,
        string version,
        int httpClientTimeoutMiliseconds)
    {
        services.AddHttpClient("CustomHttpClient", c =>
        {
            c.DefaultRequestHeaders.Add("Accept", MediaTypeNames.Application.Json);
            c.DefaultRequestHeaders.Add("User-Agent", $"{productName}-{serviceName}/{version}");
            c.Timeout = TimeSpan.FromMilliseconds(httpClientTimeoutMiliseconds);
        }).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler()
        {
            SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
            UseCookies = false,
        });
        return services;
    }
}
