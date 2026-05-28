---
inclusion: fileMatch
fileMatchPattern: "backend/**"
---

# API — Tech Stack (.NET 10 / Clean Architecture)

## Stack

- **Runtime:** .NET 10 (`net10.0`)
- **Language:** C#
- **Architecture:** Clean Architecture (hexagonal) — 5 tiers, 11 projects — DDD tactical patterns in Tier 1
- **Pipeline:** Generic `Controller<TReq,TRes>` → `Interactor<TReq>` → `ValidationInteractorBehaviour` → `{UseCase}Service` → `Presenter<TRes>` — all from NuGet, never per-use-case classes
- **Domain modeling:** Rich Entities + Value Objects (record types) + Domain Events
- **ORM:** Entity Framework Core `10.0.7` (MySQL or SQL Server) — Owned Types for Value Objects
- **DI:** Auto-registration via `AddCleanArchitecture(friendlyName)`
- **Validation:** `ValidationInteractorBehaviour` (automatic — never call `RunValidator()` manually)
- **Testing:** NUnit `4.*` + NSubstitute `5.*` — TDD mandatory for domain and application logic
- **Code style:** StyleCop `1.1.118`

## NuGet version alignment

| Package | Version |
|---|---|
| `{Organization}.*` | `10.*` (floating wildcard — never pin to minor/patch) |
| `Microsoft.EntityFrameworkCore.*` | `10.0.7` (pinned) |
| `Microsoft.EntityFrameworkCore.Tools` | `10.0.7` (pinned) |
| `MySql.EntityFrameworkCore` | `10.0.7` (pinned) |
| `Microsoft.Extensions.*` | `10.0.8` |
| `Microsoft.AspNetCore.OpenApi` | `10.0.8` |
| `StyleCop.Analyzers` | `1.1.118` |
| `NUnit` / `NUnit3TestAdapter` | `4.*` |
| `Microsoft.NET.Test.Sdk` | `17.*` |
| `NSubstitute` | `5.*` |
| `coverlet.collector` | `6.*` |

> Never add `Microsoft.EntityFrameworkCore` directly to any project other than `DataContext` — it arrives transitively.
> Never mix EF Core major/minor versions across projects in the same solution.

## Key NuGet packages

### `Codenized.CleanArchitecture.Abstractions`
Core NuGet. Provides: `Controller<TReq,TRes>`, `Interactor<TReq>`, `Presenter<TRes>`, `IInteractorService<TReq,TRes>`, `ValidationInteractorBehaviour`, `IValidator<T>`, `ValidatorBase<T>`, `IAppServiceSingleton|Scoped|Transient`, `IDomainEvent`, `IAsyncDomainEventHub<T>`, all exception types, `AddCleanArchitecture(friendlyName)`, `DomainException`.

### `Codenized.CleanArchitecture.Persistence.Abstractions`
Provides: `ContextHandler<TRead,TWrite,TOut>`, `IUnitOfWork`, `IRepository`.

### `Codenized.CleanArchitecture.Persistence.MySql` / `.SqlServer`
Provides `AddCleanArchitecturePersistence(friendlyName, config, readConn, writeConn)`.

### `Codenized.Exceptions.GlobalExceptionStrategy`
Provides `AddGlobalExceptionStrategy()`, `app.UseApiGlobalExceptionStrategy()`, `routeGroup.MapEndpoint<TProduces>(...)`.

### `Codenized.HealthChecks.AspNetCore`
Provides `services.AddAppHealthChecks(configuration)`, `app.MapHealthChecksEndpoint(configuration, apiBasePath)`, `HealthChecksTags.HEALTH`, `HealthChecksTags.STATUS`.

## DI auto-registration

`AddCleanArchitecture(friendlyName)` scans all assemblies whose name starts with `friendlyName.ToLowerInvariant()` and auto-registers:
- `IInteractorService<,>` → Scoped
- `IValidator<>` → Scoped
- `IInteractorBehaviour<,>` → Scoped
- `IAsyncDomainEventHandler<>` → Scoped
- `IDomainEventHandler<>` → Scoped
- `IMappingProfile` → Singleton
- `IAppServiceSingleton` marker → Singleton (keyed by first non-marker interface)
- `IAppServiceScoped` marker → Scoped
- `IAppServiceTransient` marker → Transient

To auto-register a service: implement its own interface first, then the marker last:
```csharp
public sealed class NotificationService : INotificationService, IAppServiceScoped
```

## Pipeline behaviour order

`[InteractorBehaviourOrderAttribute(N)]` — lower N = outermost (ASP.NET Core middleware convention).
`ValidationInteractorBehaviour` is order 100 (innermost). Custom behaviours must use N < 100.

## Common CLI commands

```bash
# Build
dotnet build ProjectPath
dotnet build SolutionPath

# Run
dotnet run
dotnet watch run

# Test
dotnet test ProjectPath

# New projects
dotnet new classlib -n ProjectName -f net10.0
dotnet new webapi -n ProjectName -f net10.0
dotnet new sln -n SolutionName

# Solution management
dotnet sln add ProjectPath --solution-folder SolutionFolderName
dotnet add ProjectPath package NugetName
dotnet add ProjectPath reference ReferenceProjectPath

# EF Core migrations
add-migration Add{Entity} -p {Organization}.{Product}.Persistence.MySql.Efc.DataContext -s {Organization}.{Product}.Persistence.MySql.Efc.DataContext -c MigrationContext -o Migrations
```

## Git commands

```bash
git checkout BranchName
git pull origin BranchName
git commit -am "Description of changes"
git push origin BranchName
```

## GitFlow rules

- Branches: `feature/<TICKET-KEY>-<summary>` from `develop` (or from the linked User Story / Parent Issue branch if one exists)
- No direct commits to `main` or `develop`
- Conventional commits
