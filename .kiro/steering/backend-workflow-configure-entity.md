---
inclusion: manual
---

# Workflow: Configure Entity

**Trigger**: a Kiro spec task that defines a new entity, or the user says "configure entity {EntityName}" providing entity details.
**Result**: Entity class, EF Core configuration, DbSets in all contexts, EF migration, unit tests, commit + push.

---

## Procedure start

Record and display the start timestamp. Used later to calculate total duration.

---

## Pre-code mandatory gates

**Hard rule**: no code is generated until all gates are complete and reported.

1. Entity definition extracted and validated from the spec task
2. GitFlow branch setup completed
3. Stop conditions resolved (entity already exists, branch already exists, missing property data, etc.)

If any gate fails → **STOP** and return an error explaining which gate failed.

---

## Gate 1 — Extract entity definition from spec task

Read the spec task content. Extract:

- **Entity name** (PascalCase, e.g. `TaskList`, `WorkItem`)
- **Properties** — for each property:
  - Name
  - Type (`string`, `int`, `DateTime`, `bool`, …)
  - Required or optional
  - Max length (if string)
  - Auto-generated (e.g. `Id`, `CreatedAt`)
  - Description (used for XML `<summary>`)
- **Relationships** — any foreign key references to other entities

If the spec task does not contain enough information to generate the entity → **STOP** and ask the user to complete the task definition before proceeding.

**Output required before continuing:**
```
ENTITY: <EntityName>
PROPERTIES: <list with type, required/optional, constraints>
RELATIONSHIPS: <list or NONE>
```

---

## Gate 2 — GitFlow branch setup

Branch from `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<ENTITY-NAME-lowercase>-entity
```

If the branch already exists → **STOP** and return an error.

**Output required:**
```
BASE_BRANCH: develop
TICKET_BRANCH: feature/<entity-name>-entity
```

---

## Gate 3 — Relationship discovery

For each property ending in `Id` or referencing another entity:

- Search the solution for a matching entity class and DbSet
- If the referenced entity **does not exist**: generate only the scalar Id property and mark with deferred markers
- If the referenced entity **exists**: generate navigation properties, FK config, and explicit delete behavior

---

## Code generation rules

### XML documentation (required on all members)

| Member | Tags required |
|---|---|
| Class | `<summary>` |
| Constructor | `<summary>` + `<param>` per parameter |
| `void` method | `<summary>` + `<param>` — never `<returns>` |
| Property | `<summary>` |

Property summary format:
```csharp
/// <summary>
/// Gets or sets the {description}.
/// </summary>
```

### Inline comments — prohibited

- `// Configure table name` above `builder.ToTable(...)`
- `// Configure primary key` above `builder.HasKey(...)`
- `// Required` above `.IsRequired()`
- `// TODO: Implement properties`
- Any comment that repeats what the fluent API call already says

### Inline comments — allowed

- Non-obvious architectural or domain decisions
- Known EF Core workarounds
- Deferred relationship markers (structured, machine-readable only)

---

## Create the entity

File: `src/{Organization}.{Product}.Core/Entities/{Entity}.cs`

```csharp
// <copyright file="{Entity}.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Core.Entities;

/// <summary>
/// {Description from spec task}.
/// </summary>
public sealed class {Entity}
{
    /// <summary>
    /// Gets or sets the identifier.
    /// </summary>
    public int Id { get; set; }

    // Remaining properties from spec task with XML docs
}
```

Build `{Organization}.{Product}.Core` — verify no errors before continuing.

---

## Create the entity configuration

File: `src/{Organization}.{Product}.Persistence.MySql.Efc.DataContext/Entities/{Entity}Configuration.cs`

```csharp
// <copyright file="{Entity}Configuration.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using {Organization}.{Product}.Core.Entities;

/// <summary>
/// Provides configuration for the <see cref="{Entity}"/> entity.
/// </summary>
public sealed class {Entity}Configuration : IEntityTypeConfiguration<{Entity}>
{
    /// <summary>
    /// Configures the entity of type <see cref="{Entity}"/>.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<{Entity}> builder)
    {
        builder.ToTable("{entity-lowercase}");
        builder.HasKey(p => p.Id).HasName("PRIMARY");
        // Property configurations derived from spec task
        // No inline comments repeating what the fluent API already says
    }
}
```

---

## Add DbSet to all contexts

Add to `IApplicationContext`, `ApplicationReadContext`, `ApplicationWriteContext`, and `MigrationContext`:

```csharp
/// <summary>
/// Gets {entity-lowercase}s.
/// </summary>
public DbSet<{Entity}> {EntityPlural} => this.Set<{Entity}>();
```

Build `{Organization}.{Product}.Persistence.MySql.Efc.DataContext` — verify no errors.

---

## Deferred relationships

If a referenced entity does not exist yet:

```csharp
// DEFERRED-RELATIONSHIP: {EntityName}   ← in entity class
// DEFERRED-FK: {EntityName}             ← in configuration class
```

When the referenced entity is later created, resolve all deferred markers:
- Add navigation property (if not already present)
- Add inverse collection navigation (if applicable)
- Add EF Core FK config and explicit delete behavior
- Remove the deferred markers

**Idempotency rule**: running this resolution multiple times must never duplicate properties, navigations, or FK configs.

---

## Configure StyleCop for migration files

Check `.editorconfig` for a `[**/Migrations/**]` section. If missing, append:

```editorconfig
# EF Core auto-generated migration files — do not edit manually
[**/Migrations/**]
dotnet_diagnostic.SA1633.severity = none
dotnet_diagnostic.SA1200.severity = none
dotnet_diagnostic.SA1413.severity = none
dotnet_diagnostic.SA1400.severity = none
```

---

## Create EF Core migration

Pre-check: verify no `*_Add{Entity}.cs` already exists in `Migrations/`.

```bash
add-migration Add{Entity} -p {Organization}.{Product}.Persistence.MySql.Efc.DataContext -s {Organization}.{Product}.Persistence.MySql.Efc.DataContext -c MigrationContext -o Migrations
```
Add //<auto-generated> to the files generated by the migration to avoid warnings during build.

Post-check — verify all of:
- `Migrations/XXXXXXXXXXXXXX_Add{Entity}.cs` created
- `Migrations/XXXXXXXXXXXXXX_Add{Entity}.Designer.cs` created
- `Migrations/MigrationContextModelSnapshot.cs` updated
- Designer file contains `[DbContext(typeof(MigrationContext))]`

Build `{Organization}.{Product}.Persistence.MySql.Efc.DataContext`.

---

## Create entity configuration tests

File: `src/UnitTest.{Organization}.{Product}/{Entity}/{Entity}ConfigurationTests.cs`

```csharp
// <copyright file="{Entity}ConfigurationTests.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace UnitTest.{Organization}.{Product}.{Entity};

using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Persistence.MySql.Efc.DataContext.Entities;

[TestFixture]
public sealed class {Entity}ConfigurationTests
{
    private Microsoft.EntityFrameworkCore.Metadata.IEntityType entityType = null!;

    [SetUp]
    public void SetUp()
    {
        var modelBuilder = new ModelBuilder();
        modelBuilder.ApplyConfiguration(new {Entity}Configuration());
        this.entityType = modelBuilder.Model.FindEntityType(typeof({Entity}))!;
    }

    [Test]
    public void Configure_TableName_IsExpected()
        => Assert.That(this.entityType.GetTableName(), Is.EqualTo("{table_name}"));

    [Test]
    public void Configure_Id_IsPrimaryKey()
        => Assert.That(this.entityType.FindPrimaryKey()!.Properties[0].Name, Is.EqualTo(nameof({Entity}.Id)));

    // One test per property: IsRequired/IsOptional and MaxLength
    // [Test]
    // public void Configure_Name_IsRequired()
    //     => Assert.That(this.entityType.FindProperty(nameof({Entity}.Name))!.IsNullable, Is.False);
    //
    // [Test]
    // public void Configure_Name_MaxLengthIs50()
    //     => Assert.That(this.entityType.FindProperty(nameof({Entity}.Name))!.GetMaxLength(), Is.EqualTo(50));
}
```

> Use `ModelBuilder` directly — **never** `InMemory` provider or real DB.

Minimum coverage: table name, primary key, `IsRequired`/`IsOptional` per property, `HasMaxLength` per string property, `ValueGeneratedOnAdd` per auto-generated property.

Run tests — all must pass before continuing.

---

## Commit and push

```bash
git add -A
git commit -m "feat({entity-lowercase}): add {Entity} entity and EF Core configuration"
git push origin feature/<entity-name>-entity
```

---

## Execution checklist

1. Entity definition extracted from spec task ✅/❌
2. Branch created from develop ✅/❌
3. Entity class created and builds ✅/❌
4. Entity configuration created ✅/❌
5. DbSets added to all contexts ✅/❌
6. Deferred relationships handled ✅/❌
7. StyleCop migration suppressions configured ✅/❌
8. EF Core migration created and verified ✅/❌
9. Configuration tests created and passing ✅/❌
10. Committed and pushed ✅/❌
