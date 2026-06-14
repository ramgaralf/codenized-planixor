---
inclusion: manual
---

# Workflow: Configure Solution

**Trigger**: "configure solution for {Organization} {Product} using .NET {N}"
**Result**: `.slnx` with 11 projects in 5 tiers, Docker Compose, UnitTest project, initial README.

---

## Token replacement

| Token | Replacement |
|---|---|
| `{Organization}` | PascalCase org name, e.g. `Codenized` |
| `{Product}` | PascalCase product name, e.g. `Planixor` |
| `{organization-lowercase}` | lowercase, e.g. `codenized` |
| `{product-lowercase}` | lowercase, e.g. `planixor` |
| `{NET_VERSION}` | `net10.0` |

> Verify no `{...}` tokens remain before building.
> `stylecop.json` `company` field must be `{Organization} Group` (e.g. `Codenized Group`).

---

## Steps

1. Create `src/` and `docs/` directories
2. Create `.gitignore` and `.gitattributes`
3. Create blank solution .slnx: `dotnet new sln -n {Organization}.{Product}`
4. Create solution folders: `Enterprise Business Rules`, `Application Business Rules`, `Interface Adapters`, `Frameworks and Drivers`, `Tests`, `Solution Items`
5. Create `.editorconfig` and `stylecop.json` → add to `Solution Items`
6. Create and configure 11 projects (see project list below)
7. Create Docker Compose files
8. Create `UnitTest` project
9. Generate initial README

---

## Project list

Each project gets: `GenerateDocumentationFile=true`, `StyleCop.Analyzers` NuGet, `stylecop.json` link.

| Project | Type | Solution folder | Key NuGets | Key references |
|---|---|---|---|---|
| `{Org}.{Prod}.Core` | classlib | Enterprise Business Rules | StyleCop | — |
| `{Org}.{Prod}.Dtos` | classlib | Application Business Rules | StyleCop, Abstractions | — |
| `{Org}.{Prod}.Events` | classlib | Application Business Rules | StyleCop, Abstractions, Logging.Abstractions | Core |
| `{Org}.{Prod}.UseCases` | classlib | Application Business Rules | StyleCop, Abstractions, Persistence.Abstractions, Logging.Abstractions | Core, Dtos, Events |
| `{Org}.{Prod}.Services` | classlib | Interface Adapters | StyleCop, Abstractions | Core |
| `{Org}.{Prod}.Persistence.MySql.Efc.DataContext` | classlib | Interface Adapters | StyleCop, EFCore.Tools@10.0.7, Abstractions, Persistence.Abstractions, **Persistence.MySql** | Core |
| `{Org}.{Prod}.Persistence.MySql.Efc.Repositories` | classlib | Interface Adapters | StyleCop, Abstractions, Persistence.Abstractions | UseCases, DataContext |
| `{Org}.{Prod}.Persistence.IoC` | classlib | Interface Adapters | StyleCop, Abstractions, Hosting.Abstractions@10.0.0, **Persistence.MySql** | UseCases, DataContext, Repositories |
| `{Org}.{Prod}.IoC` | classlib | Frameworks and Drivers | StyleCop, Abstractions, GlobalExceptionStrategy, HealthChecks.AspNetCore | Core, Dtos, Events, Persistence.IoC, Services, UseCases, DataContext, Repositories |
| `{Org}.{Prod}.Api` | webapi | Frameworks and Drivers | StyleCop, OpenApi@10.0.8, GlobalExceptionStrategy, HealthChecks.AspNetCore, VisualStudio.Azure.Containers | IoC |
| `UnitTest.{Org}.{Prod}` | classlib | Tests | StyleCop, NUnit@4.*, NUnit3TestAdapter@4.*, TestSdk@17.*, NSubstitute@5.*, coverlet@6.* | IoC |

> `docker-compose.dcproj` goes directly under `<Solution>` in the `.slnx`, NOT inside any folder.

---

## Key file templates

### `.editorconfig`

```editorconfig
root = true

[*]
indent_style = space
indent_size = 4
end_of_line = crlf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{json,yml,yaml}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

### `stylecop.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/DotNetAnalyzers/StyleCopAnalyzers/master/StyleCop.Analyzers/StyleCop.Analyzers/Settings/stylecop.schema.json",
  "settings": {
    "documentationRules": {
      "companyName": "{Organization}"
    }
  }
}
```

### `AppSettings.cs` (`Core/Settings/`)

```csharp
// <copyright file="AppSettings.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Core.Settings;

using System.Reflection;

/// <summary>
/// Represents the application configuration settings.
/// </summary>
public sealed class AppSettings
{
    /// <summary>Gets or sets the friendly name.</summary>
    public string Friendly { get; set; } = string.Empty;

    /// <summary>Gets or sets the product name.</summary>
    public string Product { get; set; } = string.Empty;

    /// <summary>Gets or sets the service name.</summary>
    public string Service { get; set; } = string.Empty;

    /// <summary>Gets or sets the version.</summary>
    public string Version { get; set; } = Assembly.GetEntryAssembly()?.GetName().Version?.ToString(3) ?? "0.0.0";

    /// <summary>Gets or sets the environment name.</summary>
    public string Environment { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether Swagger UI is enabled.</summary>
    public bool AllowSwagger { get; set; }

    /// <summary>Gets or sets the base path for API endpoints.</summary>
    public string ApiBasePath { get; set; } = "/api";

    /// <summary>Gets or sets http client timeout in milliseconds.</summary>
    public int HttpClientTimeoutMiliseconds { get; set; } = 5000;
}
```

### `appsettings.json`

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Error",
      "{Organization}.Core": "Warning",
      "{Organization}.{Product}": "Information"
    }
  },
  "AllowedHosts": "*",
  "Kestrel": {
    "Endpoints": {
      "Http": { "Url": "http://*:80" }
    }
  },
  "ConnectionStrings": {
    "AppReadDb": "server=host.docker.internal;user id=dbuser;password=dbpwd;persistsecurityinfo=True;database=dbname",
    "AppWriteDb": "server=host.docker.internal;user id=dbuser;password=dbpwd;persistsecurityinfo=True;database=dbname"
  },
  "AppSettings": {
    "Product": "{product-lowercase}",
    "Service": "api",
    "Friendly": "{Organization}.{Product}",
    "Environment": "dev",
    "AllowSwagger": true
  }
}
```

### `launchSettings.json` (`Api/Properties/`)

```json
{
  "$schema": "https://json.schemastore.org/launchsettings.json",
  "profiles": {
    "http": {
      "commandName": "Project",
      "launchBrowser": true,
      "launchUrl": "api/swagger",
      "dotnetRunMessages": true,
      "applicationUrl": "http://localhost"
    },
    "Container (Dockerfile)": {
      "commandName": "Docker",
      "launchBrowser": false,
      "launchUrl": "{Scheme}://{ServiceHost}:{ServicePort}/api/swagger",
      "environmentVariables": { "ASPNETCORE_HTTP_PORTS": "80" },
      "publishAllPorts": true,
      "useSSL": false
    },
    "Docker Compose": {
      "commandName": "DockerCompose",
      "commandVersion": "1.0",
      "launchBrowser": false,
      "launchUrl": "{Scheme}://{ServiceHost}:{ServicePort}/api/swagger",
      "environmentVariables": { "ASPNETCORE_ENVIRONMENT": "Development" },
      "serviceActions": {
        "{organization-lowercase}.{product-lowercase}.api": "StartDebugging"
      },
      "useSSL": false
    }
  }
}
```

### `Dockerfile` (`Api/`)

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /srv/{product-lowercase}/api
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /
COPY ["src/{Organization}.{Product}.Api/{Organization}.{Product}.Api.csproj", "src/{Organization}.{Product}.Api/"]
COPY ["src/{Organization}.{Product}.IoC/{Organization}.{Product}.IoC.csproj", "src/{Organization}.{Product}.IoC/"]
COPY ["src/{Organization}.{Product}.Dtos/{Organization}.{Product}.Dtos.csproj", "src/{Organization}.{Product}.Dtos/"]
COPY ["src/{Organization}.{Product}.Core/{Organization}.{Product}.Core.csproj", "src/{Organization}.{Product}.Core/"]
COPY ["src/{Organization}.{Product}.Events/{Organization}.{Product}.Events.csproj", "src/{Organization}.{Product}.Events/"]
COPY ["src/{Organization}.{Product}.Persistence.IoC/{Organization}.{Product}.Persistence.IoC.csproj", "src/{Organization}.{Product}.Persistence.IoC/"]
COPY ["src/{Organization}.{Product}.Persistence.MySql.Efc.DataContext/{Organization}.{Product}.Persistence.MySql.Efc.DataContext.csproj", "src/{Organization}.{Product}.Persistence.MySql.Efc.DataContext/"]
COPY ["src/{Organization}.{Product}.Persistence.MySql.Efc.Repositories/{Organization}.{Product}.Persistence.MySql.Efc.Repositories.csproj", "src/{Organization}.{Product}.Persistence.MySql.Efc.Repositories/"]
COPY ["src/{Organization}.{Product}.UseCases/{Organization}.{Product}.UseCases.csproj", "src/{Organization}.{Product}.UseCases/"]
COPY ["src/{Organization}.{Product}.Services/{Organization}.{Product}.Services.csproj", "src/{Organization}.{Product}.Services/"]
RUN dotnet restore "./src/{Organization}.{Product}.Api/{Organization}.{Product}.Api.csproj"
COPY . .
WORKDIR "/src/{Organization}.{Product}.Api"
RUN dotnet build "./{Organization}.{Product}.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./{Organization}.{Product}.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /srv/{product-lowercase}/api
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "{product-lowercase}-api.dll"]
```

### `docker-compose.yml`

```yaml
---
services:
  {organization-lowercase}.{product-lowercase}.api:
    image: ${DOCKER_REGISTRY-}{organization-lowercase}{product-lowercase}api
    build:
      context: .
      dockerfile: src/{Organization}.{Product}.Api/Dockerfile
```

### `docker-compose.override.yml`

```yaml
---
services:
  {organization-lowercase}.{product-lowercase}.api:
    ports:
      - "80:80"
```

### `Persistence-DependencyContainer.cs`

```csharp
// <copyright file="DependencyContainer.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.IoC;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using {Organization}.{Product}.Persistence.MySql.Efc.DataContext;
using {Organization}.CleanArchitecture.Persistence.MySql;

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
```

### `Application-DependencyContainer.cs` (`IoC/`)

```csharp
// <copyright file="DependencyContainer.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.IoC;

using System.Net.Mime;
using System.Runtime.InteropServices;
using System.Security.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using {Organization}.{Product}.Core.Settings;
using {Organization}.{Product}.Persistence.IoC;
using {Organization}.CleanArchitecture.Abstractions;
using {Organization}.Exceptions.GlobalExceptionStrategy;
using {Organization}.HealthChecks.AspNetCore;
using {Organization}.HealthChecks.AspNetCore.Entities;
using {Organization}.HealthChecks.AspNetCore.HealthChecks;

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
        {Organization}.HealthChecks.AspNetCore.DependencyContainer.AddAppHealthChecks(services, configuration);
        services.AddHealthChecks()
            .AddCheck<InternetHealthCheck>("InternetConnection", failureStatus: HealthStatus.Unhealthy, tags: new[] { HealthChecksTags.HEALTH, HealthChecksTags.STATUS });

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            services.AddHealthChecks()
                .AddCheck(@$"HardDisk (c:\)", new DriveHealthCheck(@"c:\"), failureStatus: HealthStatus.Unhealthy, tags: new[] { HealthChecksTags.STATUS });
        }
        else
        {
            services.AddHealthChecks()
                .AddCheck($"HardDisk (/)", new DriveHealthCheck("/"), failureStatus: HealthStatus.Unhealthy, tags: new[] { HealthChecksTags.STATUS });
        }

        return services;
    }

    private static IHostApplicationBuilder LoadConfiguration(this IHostApplicationBuilder builder)
    {
        builder.Configuration.Sources.Clear();
        builder.Configuration.SetBasePath(Directory.GetCurrentDirectory());
        builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: false);
        builder.Configuration.AddJsonFile("appsettings.localhost.json", optional: true, reloadOnChange: false);
        return builder;
    }

    private static IServiceCollection MapSettings(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AppSettings>(configuration.GetSection("AppSettings"));
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
```

### `Program.cs` (`Api/`)

```csharp
// <copyright file="Program.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

// <auto-generated> 

using Microsoft.Extensions.Options;
using {Organization}.{Product}.Api.Endpoints;
using {Organization}.{Product}.Core.Settings;
using {Organization}.{Product}.IoC;
using {Organization}.{Product}.Persistence.IoC;
using {Organization}.Exceptions.GlobalExceptionStrategy;

var builder = WebApplication.CreateBuilder(args);
builder.ConfigureApplication();
builder.Services.AddApiHealthChecks(builder.Configuration);
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyMethod().AllowAnyHeader()
            .SetIsOriginAllowed(origin => true)
            .AllowCredentials()
            .SetPreflightMaxAge(TimeSpan.FromHours(1));
    });
});
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    options.SerializerOptions.WriteIndented = false;
    options.SerializerOptions.MaxDepth = 32;
    options.SerializerOptions.AllowTrailingCommas = true;
    options.SerializerOptions.ReadCommentHandling = System.Text.Json.JsonCommentHandling.Skip;
});

var app = builder.Build();
var settings = app.Services.GetService<IOptions<AppSettings>>()?.Value ?? throw new InvalidOperationException($"{nameof(AppSettings)} not found");
app.UseApiGlobalExceptionStrategy();
app.UseApplicationMigrations();
app.UseHttpsRedirection();
app.UseCors();

if (settings.AllowSwagger)
{
    var openApiEndpoint = $"{settings.ApiBasePath}/openapi.json";
    app.MapOpenApi(openApiEndpoint);
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint($"../../{openApiEndpoint.TrimStart('/')}", $"{settings.Product}-{settings.Service}");
        options.RoutePrefix = settings.ApiBasePath.TrimStart('/') + "/swagger";
    });
}

app.UseAppEndpoints(app.Configuration, settings.ApiBasePath);
await app.RunAsync();
```

### `RegisterEndpoints.cs` (`Api/Endpoints/`)

```csharp
// <copyright file="RegisterEndpoints.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Api.Endpoints;

using {Organization}.HealthChecks.AspNetCore;

/// <summary>Register endpoints.</summary>
internal static class RegisterEndpoints
{
    /// <summary>Use application endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="configuration">Configuration.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder UseAppEndpoints(
        this IEndpointRouteBuilder app,
        IConfiguration configuration,
        string apiBasePath)
    {
        app.MapHealthChecksEndpoint(configuration, apiBasePath);
        return app;
    }
}
```

### DbContext files (`Persistence.MySql.Efc.DataContext/`)

#### `IApplicationContext.cs`
```csharp
// <copyright file="IApplicationContext.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.DataContext;

/// <summary>Interface for the application context.</summary>
public interface IApplicationContext
{
    // DbSet properties added here as entities are created
}
```

#### `ApplicationReadContext.cs`
```csharp
// <copyright file="ApplicationReadContext.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.DataContext;

using System.Reflection;
using Microsoft.EntityFrameworkCore;

/// <summary>Application read context.</summary>
public sealed class ApplicationReadContext : DbContext, IApplicationContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationReadContext"/> class.
    /// </summary>
    /// <param name="options">Database context options.</param>
    public ApplicationReadContext(DbContextOptions<ApplicationReadContext> options)
        : base(options)
    {
    }

    /// <summary>On model creating.</summary>
    /// <param name="modelBuilder">Model builder.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
```

#### `ApplicationWriteContext.cs`
```csharp
// <copyright file="ApplicationWriteContext.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.DataContext;

using System.Reflection;
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

    /// <summary>On model creating.</summary>
    /// <param name="modelBuilder">Model builder.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
```

#### `MigrationContext.cs`
```csharp
// <copyright file="MigrationContext.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.DataContext;

using System.Reflection;
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

    /// <summary>On model creating.</summary>
    /// <param name="modelBuilder">Model builder.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
```

#### `MigrationContextFactory.cs`
```csharp
// <copyright file="MigrationContextFactory.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.DataContext;

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
```

#### `DataContextGuards.cs` (`Guards/`)
```csharp
// <copyright file="DataContextGuards.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.DataContext.Guards;

using Microsoft.EntityFrameworkCore;
using {Organization}.CleanArchitecture.Abstractions.Exceptions;
using System.Linq;
using System.Threading.Tasks;

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
```
