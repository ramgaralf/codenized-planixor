---
inclusion: fileMatch
fileMatchPattern: "api/**"
---

# API — Project Structure (.NET 10 / Clean Architecture)

## Solution layout — 5 tiers, 11 projects

```
api/
├── src/
│   ├── {Organization}.{Product}.Core/                              # Enterprise Business Rules
│   │   ├── Entities/                                               # DB entities
│   │   ├── Enums/
│   │   ├── ValueObjects/
│   │   └── Settings/                                               # AppSettings.cs
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
│       └── {Entity}/
│           ├── Validators/{Entity}{Action}RequestValidatorTests.cs
│           ├── Services/{Entity}{Action}ServiceTests.cs
│           └── Controllers/{Entity}{Action}ControllerTests.cs
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

## Key structural rules

- **No `Common` project** — shared abstractions come from `{Organization}.CleanArchitecture.Abstractions` NuGet
- **No per-use-case Controller/Interactor/Presenter classes** — these are generic and come from NuGet
- **One class per file** — file name matches class name
- **Use cases** live in `UseCases/{Entity}/{Action}/` — one folder per action
- **Tests** mirror the source structure: `UnitTest/{Entity}/{Action}/Validators|Services|Controllers`
- **Endpoints** live in `Api/Endpoints/{Entity}/`
- **No `Common` project** — types like `IInteractorBehaviour<,>` come from the NuGet
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

When adding a new entity, add to `IApplicationContext`, `ApplicationReadContext`, `ApplicationWriteContext`, and `MigrationContext`:

```csharp
/// <summary>
/// Gets {entity-lowercase}s.
/// </summary>
public DbSet<{Entity}> {EntityPlural} => this.Set<{Entity}>();
```
