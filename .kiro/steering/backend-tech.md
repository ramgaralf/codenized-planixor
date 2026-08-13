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
| `{Organization}.*` | **exact version** (`10.3.2`) — never a wildcard |
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

> **Pin the framework packages to an exact version.** This rule used to say the opposite — `10.*`, "never pin to
> minor/patch" — and that wildcard is what broke `develop`. Two breaking changes arrived through it without anyone
> touching this repository: `Exceptions.Abstractions` 10.1.0 renamed its namespace from
> `CleanArchitecture.Exception.Abstractions` to `CleanArchitecture.Exceptions.Abstractions`, and `Abstractions`
> 10.2.0 removed `IValidationService<>`. Both landed on a branch whose last commit predated them, and the build
> failed for reasons no diff could explain.
>
> An exact version costs one edit per upgrade. That edit is the point: raising a package becomes a deliberate act,
> done after reading what changed, instead of something a restore decides on its own on whichever machine runs next.

> Never add `Microsoft.EntityFrameworkCore` directly to any project other than `DataContext` — it arrives transitively.
> Never mix EF Core major/minor versions across projects in the same solution.

## Key NuGet packages

### `Codenized.CleanArchitecture.Abstractions`
Core NuGet. Provides: `Controller<TReq,TRes>`, `Interactor<TReq>`, `Presenter<TRes>`, `IInteractorService<TReq,TRes>`, `ValidationInteractorBehaviour`, `IValidator<T>`, `ValidatorBase<T>`, `IAppServiceSingleton|Scoped|Transient`, `IDomainEvent`, `IAsyncDomainEventHub<T>`, `AddCleanArchitecture(friendlyName)`, `ExceptionBase`, `ProblemDetails`, `IExceptionHandler<T>`, `ValidationException` and its handler.

### `Codenized.CleanArchitecture.Exceptions.Abstractions`
The exception catalogue: ten `ExceptionBase` subclasses with their `IExceptionHandler<T>` implementations, one namespace per exception. See the exception table in `#backend-architecture` for the HTTP code each one maps to. No project of the framework references this package — it is discovered by assembly scan at startup.

### `Codenized.CleanArchitecture.Persistence.Abstractions`
Provides: `ContextHandler<TRead,TWrite,TOut>`, `IUnitOfWork`, `IRepository`, `modelBuilder.ApplyAllConfigurationsFrom(assembly, serviceProvider)`.

`ContextHandler` requires both context types to be assignable to `TOut`, which the compiler checks. It is always registered **scoped**, whatever lifetime the contexts were given.

`ApplyAllConfigurationsFrom` is what the three `DbContext` classes call from `OnModelCreating`, instead of EF's own `ApplyConfigurationsFromAssembly`. The difference is that it builds each `IEntityTypeConfiguration<T>` through the container, so a configuration may take its dependencies — a cryptology service backing a value converter for an encrypted column, for instance — through its constructor. If a dependency cannot be resolved it **throws**: applying the configuration without its converter would map the column as plain text and write personal data in clear. With no service provider, as at design time, every configuration is built through its parameterless constructor, and one that needs services fails there rather than producing a model that differs from the running one.

### `Codenized.CleanArchitecture.Persistence.MySql` / `.SqlServer`
Provides `AddCleanArchitecturePersistence(friendlyName, config, readConn, writeConn, lifetime = Scoped)`.

It scans the assemblies whose name starts with `friendlyName`, registers every `DbContext` it finds and every `IRepository` under all of its contracts.

> **Naming convention.** A context whose type name contains `read` is pointed at the read connection string; everything else goes to the write one. The match is a plain substring one, so `read` inside a longer word counts: `ThreadDbContext`, `SpreadsheetDbContext` and `UnreadMessagesContext` would all be sent to the replica and their writes would fail or land on stale data. **Never put `read` in the name of a write context.**

### `Codenized.Exceptions.GlobalExceptionStrategy`
Provides `AddGlobalExceptionStrategy(friendlyName)`, `app.UseApiGlobalExceptionStrategy(includeDetails)`, `routeGroup.MapEndpoint<TProduces>(...)`.

> `friendlyName` here is the **organization root** (`Codenized`), not the product name. The scan has to reach the framework's own assemblies — the exception catalogue and the package holding `ValidationExceptionHandler` — as well as any handler the application defines. Passing the product name finds nothing, and registration throws at startup rather than leaving every error as a generic 500.

> `includeDetails` controls whether the raw exception message reaches the client when no handler covers the exception. Pass `app.Environment.IsDevelopment()`: the message can carry SQL fragments, file paths and third-party provider text.

### `Codenized.HealthChecks.AspNetCore`
Provides `services.AddAppHealthChecks(configuration)`, `app.MapHealthChecksEndpoint(configuration, apiBasePath)`, `HealthChecksTags`, `IHealthCacheService`.

The checks run on a timer and the endpoints only read the last published report, so a request never triggers a check.

`HealthChecksTags` is an **enum** (`Health`, `Status`) and `ToTag()` gives the string ASP.NET stores on a registered check:

```csharp
.AddCheck<InternetHealthCheck>("InternetConnection", tags: new[] { HealthChecksTags.Health.ToTag(), HealthChecksTags.Status.ToTag() })
```

Each endpoint reports on one fixed grouping, chosen by the endpoint: `/health` on `Health`, the instance probe; `/status` on `Status`, the service and its dependencies. There is no `?tag=` parameter — a caller cannot choose what is reported.

> **Both endpoints are anonymous and serve full diagnostic detail**: the machine name, and each check's `message` and `data`. A check's message is free-form text, and a failing database check puts the host, port and service account in it. **Keep both endpoints off the public network** — anyone who can reach them reads that without authenticating.

Read the cache through `IHealthCacheService.GetLatestSnapshot()`, never through the publisher. It returns `null` until the first run finishes — treat that as "not known", never as healthy.

```json
"HealthCheckSettings": {
  "StatusEndpoint": "/status",
  "HealthEndpoint": "/health",
  "ScanFrequency": 300000
}
```

### `Codenized.Security.RateLimit`
Provides `services.AddCodenizedRateLimit(configuration)`, `IRateLimitIdentityResolver`, `RateLimitSettings`, `RateLimitPartitioner`.

A global sliding-window limiter partitioned by **caller**, with a far tighter allowance for callers whose identity does not resolve. That asymmetry is the point: the authenticated bucket has to accommodate a full paginated sync, while the anonymous one — where every failed credential lands — stays small enough that guessing is impractical.

> **The middleware order is load-bearing.** `app.UseCors()` → `app.UseRateLimiter()` → `app.UseAuthentication()` → `app.UseAuthorization()`. After authentication, a wrong credential would be rejected before ever reaching the limiter, so guessing would be unlimited — the exact case the limiter exists for. Before CORS, a 429 would go out without CORS headers and a browser client would see `TypeError: Failed to fetch` instead of the problem document.

Because it runs before authentication, the partition **cannot read `HttpContext.User`** — nothing has populated it. Implement `IRateLimitIdentityResolver` to resolve the caller from the raw request and register it as a **singleton**; the limiter classifies requests from outside any request scope. With no resolver every request is partitioned by IP address, which works but is blunter.

A throttled request gets a `429` as a `ProblemDetails` with `code: TOO_MANY_REQUESTS`, on the same error contract as everything else, plus a `Retry-After` header.

```json
"RateLimitSettings": {
  "Enabled": true,
  "AuthenticatedPermitLimit": 600,
  "AnonymousPermitLimit": 20,
  "WindowSeconds": 60,
  "SegmentsPerWindow": 6,
  "ExemptPathPrefixes": [ "/api/status", "/api/health" ]
}
```

`ExemptPathPrefixes` keeps the health probes out of the anonymous bucket: they are anonymous and polled on a schedule, so they would consume the whole allowance on their own. CORS preflight is exempt for the same class of reason — it carries no credential.

## DI auto-registration

`AddCleanArchitecture(friendlyName)` scans all assemblies whose name starts with `friendlyName.ToLowerInvariant()` and auto-registers:
- `IInteractorService<,>` → Scoped
- `IValidator<>` → Scoped
- `IInteractorBehaviour<,>` → Scoped
- `IAsyncDomainEventHandler<>` → Scoped
- `IMappingProfile` → Singleton
- `IAppServiceSingleton` marker → Singleton
- `IAppServiceScoped` marker → Scoped
- `IAppServiceTransient` marker → Transient

To auto-register a service, implement its contracts and add the marker:
```csharp
public sealed class NotificationService : INotificationService, IAppServiceScoped
```

> A marked service is registered under **every** interface it implements, excluding the marker itself and anything from the `System` namespace. All of them resolve to the **same instance** within the lifetime, so a scoped service holding state stays coherent no matter which contract you ask for. Interface declaration order is irrelevant.

> Open generic implementations — a cross-cutting `MyBehaviour<TRequest, TResponse> : IInteractorBehaviour<TRequest, TResponse>`, for instance — are registered as open generics. Their type parameters must map one to one, in order, onto the contract's; otherwise registration throws at startup explaining why.

> The scan **excludes the `Abstractions` assembly itself**, whose types are registered explicitly. Without that guard a broad `friendlyName` would register `ValidationInteractorBehaviour` twice and run validation twice per request.

> **`friendlyName` here is the product prefix** (`Codenized.Planixor`), unlike `AddGlobalExceptionStrategy`, which takes the organization root. The two are deliberately different: this scan must reach only the application's own assemblies, while the exception scan must also reach the framework's.

## Pipeline behaviour order

`[InteractorBehaviourOrder(N)]` — lower N = outermost (ASP.NET Core middleware convention).
`ValidationInteractorBehaviour` is order 100 (innermost). Custom behaviours must use N < 100.

See `#backend-architecture` → Custom pipeline behaviours for the contract, a worked example and the four rules.

## Specifications

`Specification<T>` is the framework's named, reusable query condition. Every use case that reads by a criterion other
than "all of them" declares one instead of inlining a lambda, so the condition has a name, a home and a test.

```csharp
// <copyright file="ContactUpdateByIdSpecification.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Update.Specifications;

using System.Linq.Expressions;
using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;

/// <summary>Matches the contact with the supplied identifier.</summary>
public sealed class ContactUpdateByIdSpecification : Specification<Contact>
{
    private readonly int id;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactUpdateByIdSpecification"/> class.
    /// </summary>
    /// <param name="id">The contact identifier.</param>
    public ContactUpdateByIdSpecification(int id)
    {
        this.id = id;
    }

    /// <inheritdoc/>
    public override Expression<Func<Contact, bool>> ConditionExpression => contact => contact.Id == this.id;
}
```

### The two ways to use it, and which one you want

| Member | Runs | Use it for |
|---|---|---|
| `ConditionExpression` | **In the database** — the provider translates it to SQL | Everything that touches a repository |
| `IsSatisfiedBy(T)` | **In memory**, on one already-materialised instance | A check on an object you already hold |

Pass `ConditionExpression` to the query; **never** `IsSatisfiedBy` inside a `Where`. Doing so forces client
evaluation: the whole table is materialised and filtered in the heap. `IsSatisfiedBy` compiles the expression **once**,
lazily and cached, so testing a specification against a collection is cheap — but the collection has to be one you
already legitimately have.

### For list endpoints, specify the response type, not the entity

```csharp
public sealed class ActiveContactsSpecification : Specification<ContactGetListResponse>
```

A `Specification<Contact>` can reach any column of the table, including ones the API never exposes. Typed against the
projected response, only exposed properties are reachable, which is the same projection-first rule that governs
`?filter=`. See `#backend-sample-getlist`.

### Filtering and ordering from the query string

Alongside specifications, the package ships a query-string grammar so a list endpoint can offer ad-hoc filtering and
ordering without a new specification per query shape. Both halves parse into the same request base:

`FilterModelRequest(filter, sort, page, size, maxPageSize = 50, defaultPageSize = 10)` parses both expressions and
clamps the paging values **once, in the constructor**. `Filters` and `Sorts` are always present — empty, never null,
so a repository never has to null-check them.

- **`sort`** — `[Property::asc]` or `[Property::desc]`, chained left to right for multi-column ordering:
  `[Name::asc][CreatedAt::desc]`. At most 16 orderings per request (`QueryStringSortHelper.MaxSorts`).
- **`filter`** — terms are `(Property::operator::value)`; terms join inside a group with `[and]` / `[or]`, and
  groups join to each other with a bare `and` / `or`:
  `(Name::co::ada[and][Age::gte::18])or(City::eq::Madrid)`. At most 32 terms per request.

The repository applies them in one chain, and the **order of that chain is the rule that matters**:

```csharp
IQueryable<ContactGetListResponseItem> query = this.context.GetReadContext().Contacts
    .AsNoTracking()
    .Select(contact => new ContactGetListResponseItem { Id = contact.Id, Name = contact.Name })  // project FIRST
    .Filter(specification.ConditionExpression)
    .OrderBy(sorts);                                                                            // List<SortFilter>

int totalRecords = await query.CountAsync(cancellationToken);

List<ContactGetListResponseItem> items = await query
    .Pagination(pageNumber, pageSize)
    .ToListAsync(cancellationToken);
```

`OrderBy` resolves each property name through `ExposedProperty` and emits `OrderBy` / `ThenBy` — so the ordering is
translated to SQL and applied by the database, before paging. Ordering in memory after materialising would page over
an unordered set and return overlapping pages.

> **Ordering is exactly as sensitive as filtering, and for the same reason.** Both take a property name straight from
> the query string. Applied to an `IQueryable<Contact>`, a caller can order by a column the API never returns and read
> it back through the resulting sequence, a row at a time — the same oracle that `?filter=` would give them. Applied
> to the projected item type, the column is not a property of the type, cannot be resolved, and the request is
> rejected. **Never sort or filter an `IQueryable<{Entity}>`.**

Everything a caller can get wrong — an unknown property, an unparseable value, an operator that does not apply, a
malformed expression, more terms than the limit — raises `ValidationException`, which the exception catalogue turns
into a **400** naming the offending parameter (`sort`, `filter`, `page` or `size`) in `invalid-params`. An expression
that parses to no usable term is rejected rather than treated as "no filter", so a caller never believes they
filtered while receiving every row.

See `#backend-sample-getlist` for the full worked endpoint.

## Object mapping

`IMapper` is the framework's mapping service — no AutoMapper, no reflection, no convention magic. Maps are plain
functions you write, registered in an `IMappingProfile`:

```csharp
// <copyright file="ContactMappingProfile.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Mappings;

using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Dtos.Contact.Get;
using {Organization}.CleanArchitecture.Abstractions.Mappers;

/// <summary>Registers the contact mappings.</summary>
public sealed class ContactMappingProfile : IMappingProfile
{
    /// <summary>Configures the contact mappings.</summary>
    /// <param name="config">The mapper configuration.</param>
    public void Configure(IMappingConfiguration config)
    {
        config.CreateMap<Contact, ContactGetResponse>(contact => new ContactGetResponse
        {
            Id = contact.Id,
            Name = contact.Name.Value,
            Email = contact.Email.Value,
        });
    }
}
```

Profiles are discovered by the assembly scan and registered as **Singleton**; inject `IMapper` and call
`Map<TSource, TDestination>(source)`. The single-argument `Map<TDestination>(object)` resolves the source type at
runtime — prefer the two-argument form, which fails at compile time when a map is missing rather than at request time.

> **A profile is not a place for logic.** The mapping function is a projection: no I/O, no repository, no branching on
> state the source does not carry. Anything more is a use case.

> **Mapping is optional.** A one-off conversion is clearer as an extension method in the use case's `Extensions`
> folder — that is what the Add sample does. Reach for a profile when the same conversion is needed by several use
> cases; the framework does not require one, and an empty profile per entity is noise.

> **Never map an entity from a request.** Value Objects are built through their own `Create`, and the entity through
> its factory — a mapper cannot enforce an invariant. Requests map *out* of the domain, never into it. See TIER 0 #11.

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
dotnet ef migrations add Add{Entity} \
    --project {Organization}.{Product}.Persistence.MySql.Efc.DataContext \
    --startup-project {Organization}.{Product}.Persistence.MySql.Efc.DataContext \
    --context MigrationContext \
    --output-dir Migrations
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

## Known issues

### EF Core 10 + MySQL provider: `Contains()` on Guid collections

The `MySql.EntityFrameworkCore` provider cannot translate `.Contains()` on `List<Guid>` or `IReadOnlyList<Guid>` collections in LINQ expressions. This produces:
```
Expression '@ids' in the SQL tree does not have a type mapping assigned.
```

**Do not** work around it by querying one identifier at a time, or by loading the user's records and filtering in
memory. The first is a round trip per element of the batch with the connection held for all of them; the second turns
every push into a full partition scan materialised on the heap — tens of thousands of rows to resolve at most a
hundred identifiers.

**Build the predicate instead.** Emit each identifier as its own constant and chain them with `OR`: EF's optimiser
recognises the shape and collapses it back into a real `IN (...)`, so the database does the filtering.

```csharp
// Repositories/EntityIdFilter.cs
public static Expression<Func<TEntity, bool>> IdIn<TEntity>(IReadOnlyList<Guid> ids)
    where TEntity : class
{
    ParameterExpression parameter = Expression.Parameter(typeof(TEntity), "e");
    MemberExpression property = Expression.Property(parameter, "Id");

    Expression? body = null;

    foreach (Guid id in ids)
    {
        BinaryExpression equals = Expression.Equal(property, Expression.Constant(id));
        body = body is null ? equals : Expression.OrElse(body, equals);
    }

    // No identifiers must match nothing. A match-all predicate here would hand back the whole table.
    body ??= Expression.Constant(false);

    return Expression.Lambda<Func<TEntity, bool>>(body, parameter);
}
```

```csharp
await this.context.Contacts
    .AsNoTracking()
    .Where(c => c.UserId == userId)
    .Where(EntityIdFilter.IdIn<Contact>(ids))
    .ToListAsync(cancellationToken);

// WHERE (`c`.`UserId` = 'alice') AND `c`.`Id` IN ('1111…', '2222…', '3333…')
```

> Values are emitted as constants, not parameters, so each distinct batch produces its own query plan. That is
> acceptable here for two reasons: batches are capped at 100 identifiers, and the values are `Guid` — already parsed
> by the model binder, so no caller text reaches the SQL. **Do not copy this shape for a free-text column.**

### DateOnly columns require explicit ValueConverter

The MySQL provider does not auto-convert `DATE` columns to `DateOnly` properties. Add explicit `HasConversion()` in entity configuration:
```csharp
builder.Property(e => e.StartDay)
    .HasColumnType("date")
    .HasConversion(
        v => v.ToDateTime(TimeOnly.MinValue),
        v => DateOnly.FromDateTime(v))
    .IsRequired();
```
