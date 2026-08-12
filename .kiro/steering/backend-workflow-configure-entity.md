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
  - **Validation rule, if any** — a max length, a format, a range, a set of allowed values. Every property that has
    one becomes a Value Object rather than a primitive.
- **Behaviour** — the state changes the task describes, and what must hold before each one is allowed. These become
  the entity's methods; a task that describes none is a task that describes a table, not an entity.
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

## Create the Value Objects

Any property carrying a validation rule becomes a Value Object before the entity is written — TIER 0 #12. A `string`
with a max length, a format, or a set of allowed values is a Value Object, not a `string`. A number with a range is a
Value Object, not an `int`.

File, one per type: `src/{Organization}.{Product}.Core/ValueObjects/{ValueObject}.cs`

```csharp
// <copyright file="{ValueObject}.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Core.ValueObjects;

using {Organization}.{Product}.Core.Exceptions;

/// <summary>
/// {What the value means, and the rule that makes it valid}.
/// </summary>
public sealed record {ValueObject}
{
    private {ValueObject}(string value) => this.Value = value;

    /// <summary>Gets the validated value.</summary>
    public string Value { get; }

    /// <summary>
    /// Creates a validated {value-lowercase}.
    /// </summary>
    /// <param name="value">The raw value.</param>
    /// <returns>The validated value object.</returns>
    /// <exception cref="DomainException">Thrown when the value breaks the rule.</exception>
    public static {ValueObject} Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DomainException("{RULE_CODE}", "{Short title}", "{What the caller has to change}.");
        }

        return new {ValueObject}(value.Trim());
    }
}
```

A Value Object is a `record` so equality is by value, with a **private constructor** and a **static `Create`** so an
invalid one cannot exist. Every failure throws `DomainException(code, title, detail)` — never a one-argument
constructor, and never `ArgumentException`.

Build `{Organization}.{Product}.Core` — verify no errors before continuing.

---

## Create the entity

File: `src/{Organization}.{Product}.Core/Entities/{Entity}.cs`

Rich model, per TIER 0 #11: private constructor, static factory, no public setters, and a method for every state
change the spec task describes. An entity with public setters and no behaviour is what `#backend-guidelines` marks as
**❌ anaemic**, and it is not what this workflow generates.

```csharp
// <copyright file="{Entity}.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Core.Entities;

using {Organization}.{Product}.Core.Exceptions;
using {Organization}.{Product}.Core.ValueObjects;

/// <summary>
/// {Description from spec task}.
/// </summary>
public sealed class {Entity}
{
    private {Entity}(Guid id, {ValueObject} {property-lowercase}, DateTime createdAt)
    {
        this.Id = id;
        this.{Property} = {property-lowercase};
        this.CreatedAt = createdAt;
        this.ModifiedAt = createdAt;
    }

    /// <summary>Gets the identifier.</summary>
    public Guid Id { get; private set; }

    /// <summary>Gets the {property-lowercase}.</summary>
    public {ValueObject} {Property} { get; private set; } = null!;

    /// <summary>Gets the moment the {entity-lowercase} was created, in UTC.</summary>
    public DateTime CreatedAt { get; private set; }

    /// <summary>Gets the moment the {entity-lowercase} last changed, in UTC.</summary>
    public DateTime ModifiedAt { get; private set; }

    /// <summary>
    /// Creates a new {entity-lowercase}.
    /// </summary>
    /// <param name="{property-lowercase}">The {property-lowercase}.</param>
    /// <returns>The new {entity-lowercase}.</returns>
    public static {Entity} Create({ValueObject} {property-lowercase}) =>
        new (Guid.NewGuid(), {property-lowercase}, DateTime.UtcNow);

    /// <summary>
    /// {What this state change means, in the language of the spec task}.
    /// </summary>
    /// <param name="{property-lowercase}">The new {property-lowercase}.</param>
    /// <exception cref="DomainException">Thrown when the change is not allowed in the current state.</exception>
    public void {BehaviourMethod}({ValueObject} {property-lowercase})
    {
        // Preconditions first, then mutate. A method that only assigns is a setter with extra steps.
        this.{Property} = {property-lowercase};
        this.ModifiedAt = DateTime.UtcNow;
    }
}
```

> **The private setters are for EF Core, not for callers.** EF materialises entities by writing the backing fields,
> so the properties cannot be get-only; `private set` keeps them closed to everyone else. The parameterless
> constructor EF needs is generated for it — do not add a public one.

> **Name behaviour methods after what happens in the domain**, not after the field they touch: `Cancel(reason)`,
> `Confirm(userId)`, `Rename(name)` — never `SetStatus(...)`.

Build `{Organization}.{Product}.Core` — verify no errors before continuing.

---

## Create the entity configuration

File: `src/{Organization}.{Product}.Persistence.MySql.Efc.DataContext/Entities/{Entity}Configuration.cs`

```csharp
// <copyright file="{Entity}Configuration.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.DataContext.Entities;

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

        // A Value Object wrapping a single value is mapped with a converter, so the column stays the primitive it
        // always was and no migration is needed to introduce one.
        builder.Property(p => p.{Property})
            .HasConversion(
                value => value.Value,
                stored => {ValueObject}.Create(stored))
            .HasColumnType("varchar({length})")
            .IsRequired();

        // A Value Object with several values is an owned type, so its parts become columns of this table.
        builder.OwnsOne(p => p.{ComposedProperty});

        // Property configurations derived from spec task
        // No inline comments repeating what the fluent API already says
    }
}
```

> The converter calls `Create()` on the way back, so a row that breaks the rule fails loudly when it is read rather
> than producing an entity that could never have been constructed. If legacy rows may break it, fix the data — do
> not weaken the Value Object.

---

## Add DbSet to all contexts

Add the member to `IApplicationContext` and to the three contexts. They are not the same declaration:

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
dotnet ef migrations add Add{Entity} \
    --project {Organization}.{Product}.Persistence.MySql.Efc.DataContext \
    --startup-project {Organization}.{Product}.Persistence.MySql.Efc.DataContext \
    --context MigrationContext \
    --output-dir Migrations
```
Add //<auto-generated> to the files generated by the migration to avoid warnings during build.

Post-check — verify all of:
- `Migrations/XXXXXXXXXXXXXX_Add{Entity}.cs` created
- `Migrations/XXXXXXXXXXXXXX_Add{Entity}.Designer.cs` created
- `Migrations/MigrationContextModelSnapshot.cs` updated
- Designer file contains `[DbContext(typeof(MigrationContext))]`

Build `{Organization}.{Product}.Persistence.MySql.Efc.DataContext`.

---

## Create domain tests — written first

TDD is mandatory for domain logic. These tests are written **before** the entity and the Value Objects, and they are
what proves the rules exist rather than the properties.

**`UnitTest/{Entity}/ValueObjects/{ValueObject}Tests.cs`** — one per Value Object:

- `Create` with a valid value returns it normalised
- `Create` with each way of breaking the rule throws `DomainException`
- Two instances built from the same value are equal (that is why it is a `record`)

**`UnitTest/{Entity}/Domain/{Entity}Tests.cs`** — one per entity:

- `Create` produces an entity whose invariants hold
- Each behaviour method changes what it says it changes, and moves `ModifiedAt`
- Each behaviour method **refuses** the states the spec task says are not allowed, with `DomainException`

```csharp
/// <summary>Verifies that a cancelled shift cannot be cancelled again.</summary>
[Test]
public void Cancel_WhenAlreadyCancelled_ThrowsDomainException()
{
    Shift shift = Shift.Create(ShiftName.Create("Morning"));
    shift.Cancel("Duplicate booking");

    Assert.Throws<DomainException>(() => shift.Cancel("Again"));
}
```

> If an entity has no test that refuses something, it has no invariants — and if it genuinely has none, it is a
> table, and the spec task should say so before this workflow generates a domain type for it.

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

1. Entity definition extracted from spec task, including validation rules and behaviour ✅/❌
2. Branch created from develop ✅/❌
3. Value Objects created for every property with a rule, each with `Create()` and tests ✅/❌
4. Entity class created with private constructor, factory and behaviour methods — no public setters ✅/❌
5. Entity and Value Object tests written first and passing (TDD) ✅/❌
6. Entity configuration created, with Value Objects mapped as owned types or converted ✅/❌
7. DbSets added: `{ get; }` on the interface, `=> this.Set<T>()` on the three contexts ✅/❌
8. Deferred relationships handled ✅/❌
9. StyleCop migration suppressions configured ✅/❌
10. EF Core migration created and verified ✅/❌
11. Configuration tests created and passing ✅/❌
12. Committed and pushed ✅/❌
