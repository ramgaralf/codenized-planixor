---
inclusion: fileMatch
fileMatchPattern: "backend/**"
---

# API — Project Structure (.NET 10 / Clean Architecture)

## Solution layout — 5 tiers, 11 projects

```
backend/
├── src/
│   ├── {Organization}.{Product}.Core/                              # Enterprise Business Rules (DDD)
│   │   ├── Entities/                                               # Domain entities (rich models with behavior)
│   │   │   └── {Entity}.cs
│   │   ├── ValueObjects/                                           # Value Objects (immutable, self-validating records)
│   │   │   └── {ValueObject}.cs
│   │   ├── Enums/
│   │   ├── Exceptions/                                             # Domain-specific exceptions
│   │   │   └── {Entity}DomainException.cs
│   │   ├── Services/                                               # Service interfaces (abstractions for outer layers)
│   │   │   └── {ServiceName}/I{ServiceName}.cs
│   │   └── Settings/                                               # AppSettings.cs, plus whatever your auth scheme needs
│   │
│   ├── {Organization}.{Product}.Dtos/                             # Application Business Rules
│   │   └── {Entity}/{Action}/
│   │       ├── {Entity}{Action}Request.cs
│   │       ├── {Entity}{Action}RequestValidator.cs
│   │       └── {Entity}{Action}Response.cs
│   │
│   ├── {Organization}.{Product}.Events/                           # Application Business Rules
│   │   └── On{Entity}{Action}ed/
│   │       ├── On{Entity}{Action}edEvent.cs
│   │       └── On{Entity}{Action}edEventHandler.cs
│   │
│   ├── {Organization}.{Product}.UseCases/                         # Application Business Rules
│   │   └── {Entity}/{Action}/
│   │       ├── {Entity}{Action}Service.cs
│   │       ├── Commands/I{Entity}{Action}Commands.cs              # write use cases
│   │       ├── Queries/I{Entity}{Action}Queries.cs                # read use cases
│   │       ├── Specifications/{Entity}{Action}By*Specification.cs
│   │       └── Extensions/{Entity}{Action}Extensions.cs
│   │
│   ├── {Organization}.{Product}.Services/                         # Interface Adapters
│   │   ├── Authentication/                                         # Custom authentication handlers, if the product has one
│   │   ├── Security/                                               # IRateLimitIdentityResolver implementation
│   │   └── {ServiceName}/
│   │       ├── I{ServiceName}.cs
│   │       └── {ServiceName}.cs
│   │
│   ├── {Organization}.{Product}.Persistence.MySql.Efc.DataContext/ # Interface Adapters
│   │   ├── IApplicationContext.cs
│   │   ├── ApplicationReadContext.cs
│   │   ├── ApplicationWriteContext.cs
│   │   ├── MigrationContext.cs
│   │   ├── MigrationContextFactory.cs
│   │   ├── Guards/DataContextGuards.cs
│   │   ├── Entities/{Entity}Configuration.cs
│   │   └── Migrations/
│   │
│   ├── {Organization}.{Product}.Persistence.MySql.Efc.Repositories/ # Interface Adapters
│   │   └── {Entity}/{Action}/
│   │       └── {Entity}{Action}Commands.cs / {Entity}{Action}Queries.cs
│   │
│   ├── {Organization}.{Product}.Persistence.IoC/                  # Interface Adapters
│   │   └── DependencyContainer.cs
│   │
│   ├── {Organization}.{Product}.IoC/                              # Frameworks and Drivers
│   │   └── DependencyContainer.cs
│   │
│   ├── {Organization}.{Product}.Api/                              # Frameworks and Drivers
│   │   ├── Endpoints/
│   │   │   ├── RegisterEndpoints.cs
│   │   │   └── {Entity}/{Entity}RegisterEndpoints.cs
│   │   ├── Properties/launchSettings.json
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   └── Dockerfile
│   │
│   └── UnitTest.{Organization}.{Product}/                         # Tests
│       ├── {Entity}/
│       │   ├── Domain/{Entity}Tests.cs                             # Entity behavior tests (TDD)
│       │   ├── ValueObjects/{ValueObject}Tests.cs                  # Value Object validation tests (TDD)
│       │   ├── Validators/{Entity}{Action}RequestValidatorTests.cs
│       │   ├── Services/{Entity}{Action}ServiceTests.cs
│       │   └── Endpoints/{Entity}{Action}EndpointsTests.cs
│       └── Security/                                               # Auth scheme tests, if the product has one
│
├── docs/
├── docker-compose.yml
├── docker-compose.override.yml
├── docker-compose.dcproj
├── .editorconfig
├── stylecop.json
└── {Organization}.{Product}.slnx
```

## Naming conventions

| Element | Convention | Example |
|---|---|---|
| Classes / files | PascalCase | `ContactAddService` |
| Interfaces | PascalCase with `I` prefix | `IContactAddCommands` |
| Private fields | camelCase, no `_` prefix, use `this.` | `this.logger` |
| Parameters / locals | camelCase | `userId` |
| Constants | PascalCase | `MaxItems` |
| Namespaces | PascalCase | `{Organization}.{Product}.UseCases.Contact.Add` |
| API endpoint paths | kebab-case | `/api/v1/task-lists` |
| JSON properties | camelCase | `"firstName"` |
| Acronyms | ALL CAPS | `API`, `URL`, `SDK` — never `Api`, `Url` |
| Value Objects | PascalCase (record) | `Email`, `PhoneNumber`, `ShiftDuration` |
| Domain Events | `On` + PascalCase past tense + `Event` suffix | `OnShiftCancelledEvent` |
| Factory methods | PascalCase verb | `Entity.Create(...)`, `Email.Create(...)` |

## Key structural rules

- **No `Common` project** — shared abstractions come from `{Organization}.CleanArchitecture.Abstractions` NuGet
- **No per-use-case Controller/Interactor/Presenter classes** — these are generic and come from NuGet
- **One type per file, and the file is named after it.** Every type: class, interface, enum, struct, record — and
  **nested types count**. A helper declared inside the class that uses it is still a second type in the file, so it
  gets its own file too, widened from `private` to `internal`.
  - Enforced by `OneTypePerFileTests` in the test project, which parses every source file with Roslyn.
  - `SA1402` and `SA1649` are on as well but only catch part of it: StyleCop 1.1.118 predates C# 10 and its walk
    does not descend into a **file-scoped** namespace, so on `namespace X;` it sees nothing. They also never inspect
    nested types. **Do not rely on the build alone for this rule** — the test is what actually checks it.
  - When you move a nested type out, it loses access to the parent's `private` members. Widen the member it needs to
    `internal` and qualify it (`ShiftPropertyTests.PaletteColors`); do not duplicate the data.
- **Use cases** live in `UseCases/{Entity}/{Action}/` — one folder per action
- **Tests** mirror the source structure: `UnitTest/{Entity}/Domain|ValueObjects|Validators|Services|Endpoints` — never a per-use-case `Controllers` folder, since TIER 0 #2 forbids the class it would be testing
- **Endpoints** live in `Api/Endpoints/{Entity}/`
- **No `Common` project** — types like `IInteractorBehaviour<,>` come from the NuGet
- **Entities** are rich domain models with behavior — never anemic data containers
- **Value Objects** are self-validating `record` types with private constructors and static factory methods
- **Domain Events** live in the `Events` project next to their handler, in `Events/On{Entity}{Action}ed/`, and are raised by the Use Case Service after persisting
- All files end with **exactly one trailing newline** — no more, no less

## Code style rules

- `var` only when the type is obvious from the right-hand side: `var x = new Customer()` ✅ — `var x = service.Get()` ❌
- No tuples as public method parameters or return types — use DTOs
- Conventional constructors only — no primary constructors
- If a method/constructor has more than 3 parameters or long names, indent each on its own line
- `this.` prefix to distinguish fields from locals
- XML docs required on all public/internal members (`<summary>`, `<param>`, `<returns>` where applicable — never `<returns>` on void)

## .csproj configuration snippets

### Enable XML documentation
```xml
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
</PropertyGroup>
```

### Link stylecop.json
```xml
<ItemGroup>
  <AdditionalFiles Include="..\..\stylecop.json" Link="stylecop.json" />
</ItemGroup>
```

### Docker support (Api project only)
```xml
<PropertyGroup>
  <DockerDefaultTargetOS>Linux</DockerDefaultTargetOS>
  <DockerfileContext>..\..</DockerfileContext>
  <DockerComposeProjectPath>..\..\docker-compose.dcproj</DockerComposeProjectPath>
</PropertyGroup>
```

### EF Core migration StyleCop suppressions (append to .editorconfig)
```editorconfig
# EF Core auto-generated migration files — do not edit manually
[**/Migrations/**]
dotnet_diagnostic.SA1633.severity = none
dotnet_diagnostic.SA1200.severity = none
dotnet_diagnostic.SA1413.severity = none
dotnet_diagnostic.SA1400.severity = none
```

## Add DbSet to contexts

When adding a new entity, add the member to `IApplicationContext` and to the three contexts. They are not the same declaration:

**In `IApplicationContext`** — it is an interface, so the member is declared, not implemented. A `public` member with an expression body calling `this.Set<T>()` does not compile there:

```csharp
/// <summary>
/// Gets {entity-lowercase}s.
/// </summary>
DbSet<{Entity}> {EntityPlural} { get; }
```

**In `ApplicationReadContext`, `ApplicationWriteContext` and `MigrationContext`** — the implementation:

```csharp
/// <summary>
/// Gets {entity-lowercase}s.
/// </summary>
public DbSet<{Entity}> {EntityPlural} => this.Set<{Entity}>();
```

> The interface member is what the read layer rests on: `ContextHandler.GetReadContext()` hands back `TOutContext`, which is `IApplicationContext`, and every Queries sample writes `this.context.GetReadContext().{EntityPlural}`. Miss it and nothing in the read path resolves.
