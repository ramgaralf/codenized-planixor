---
inclusion: fileMatch
fileMatchPattern: "backend/**"
---

# API — Code Guidelines (.NET / C#)

Apply these rules when writing, reviewing, or refactoring any C# code in `api/`.

---

## REST API — JSON conventions

Use **camelCase** for all JSON property names (request and response):

```json
{
  "firstName": "Pepito",
  "lastName": "Grillo",
  "emailAddress": "pepito.grillo@codenized.com"
}
```

Consistent with JavaScript, frontend libraries, Swagger/OpenAPI, `System.Text.Json`, and `Newtonsoft.Json`.

---

## Naming conventions

### Types

| Element | Convention | Example |
|---|---|---|
| Class | PascalCase | `CustomerService` |
| Record (Value Object) | PascalCase | `Email`, `PhoneNumber`, `ShiftDuration` |
| Struct | PascalCase | `Coordinate` |
| Enum | PascalCase | `OrderStatus` |
| Enum member | PascalCase | `Pending`, `Completed` |
| Interface | PascalCase with `I` prefix | `IRepository`, `IDisposable` |
| Domain Event | PascalCase + `DomainEvent` suffix | `ShiftCancelledDomainEvent` |
| Domain Exception | PascalCase + `DomainException` suffix | `ShiftDomainException` |

### Members

| Element | Convention | Example |
|---|---|---|
| Method | PascalCase | `GetCustomer()`, `Save()` |
| Property | PascalCase | `FirstName`, `IsActive` |
| Public field | PascalCase | `MaxSize` |
| Private field | camelCase, **no** `_` prefix | `logger`, `count` |
| `const` / `static readonly` | PascalCase | `MaxItems`, `DefaultPort` |
| Parameter | camelCase | `userId` |
| Local variable | camelCase | `totalCount` |
| Event | PascalCase | `DataReceived` |
| Delegate | PascalCase | `EventHandler`, `Func<int>` |
| Namespace | PascalCase | `{Organization}.Services.Invoicing` |

> Use `this.` to differentiate private fields from local variables and parameters.

> Avoid generic names like `Utils`, `Helpers`. Be specific: `PdfConversionHelper`, `EmailNotificationUtils`.

> File name must match the name of the main public class it contains.

### Acronyms

Acronyms always in **ALL CAPS**: `CA`, `RA`, `API`, `URL`, `SDK`.
Never `Ca`, `Ra`, `Api`, `Url`, `Sdk`.

### Test methods

Format: `MethodName_StateUnderTest_ExpectedBehavior` or `Should_DoSomething_WhenCondition`

```
CalculatePrice_WithDiscount_ReturnsCorrectTotal
ShouldThrowException_WhenEmailIsInvalid
Create_WithEmptyValue_ThrowsDomainException
Cancel_WhenAlreadyCancelled_ThrowsDomainException
```

---

## Code style rules

### `var` usage

Only when the type is **obvious from the right-hand side**:

```csharp
✅ var customer = new Customer();
✅ var items = new List<string>();

❌ var customer = this.service.GetCustomer();   // type not obvious
❌ var result = this.repository.Find(id);       // type not obvious
```

### Tuples

**Prohibited** as input or output parameters of public methods. Use DTOs instead.

### Parameter indentation

If a method or constructor has **more than 3 parameters**, or parameter names are long, indent each on its own line:

```csharp
// ❌
private static IServiceCollection ConfigureHttpClient(this IServiceCollection services, IConfiguration configuration, string productName, string serviceName)

// ✅
private static IServiceCollection ConfigureHttpClient(
    this IServiceCollection services,
    IConfiguration configuration,
    string productName,
    string serviceName)
```

### Constructors

Use **conventional constructors** — no primary constructors:

```csharp
// ✅
public sealed class NotificationService : INotificationService, IAppServiceScoped
{
    private readonly ILogger<NotificationService> logger;

    public NotificationService(ILogger<NotificationService> logger)
    {
        this.logger = logger;
    }
}

// ❌ primary constructor
public sealed class NotificationService(ILogger<NotificationService> logger) : INotificationService
```

### End of file

Every `.cs` file (and all text files) must end with **exactly one trailing newline** after the closing `}`.
No blank lines after it. No missing newline.

---

## XML documentation

Required on all `public` and `internal` members. Must satisfy StyleCop analyzers SA1611, SA1612, SA1615, CS1591.

| Member | `<summary>` | `<param>` | `<returns>` |
|---|---|---|---|
| Class | ✅ | — | — |
| Constructor | ✅ | ✅ one per param | ❌ never |
| `void` method | ✅ | ✅ one per param | ❌ never |
| Non-void method | ✅ | ✅ one per param | ✅ |
| Property | ✅ | — | — |

Property summary format:
```csharp
/// <summary>
/// Gets or sets the {description}.
/// </summary>
public string Name { get; set; }
```

**Prohibited patterns:**
- `<returns>` on a `void` method or constructor
- `<summary>` that only repeats the member name
- Omitting `<summary>` on any public/internal member
- Omitting `<param>` for any method parameter

---

## Inline comment rules

**Prohibited** (self-documenting code — the method name already says it):

```csharp
// Configure table name        ← above builder.ToTable(...)
// Configure primary key       ← above builder.HasKey(...)
// Required                    ← above .IsRequired()
// TODO: Implement properties
// TODO: Configure other properties
```

**Allowed only when:**
- Explaining a non-obvious architectural or domain decision
- Documenting a known framework workaround or limitation
- Structured deferred-relationship markers: `// DEFERRED-RELATIONSHIP: {EntityName}`

When in doubt → **do not add the comment**.

---

## Domain-Driven Design — Coding Rules

### Value Object coding rules

```csharp
// ✅ Correct Value Object pattern
public record Email
{
    public string Value { get; }

    private Email(string value)
    {
        this.Value = value;
    }

    public static Email Create(string value)
    {
        // Validate domain invariants
        // Throw DomainException on violation
        // Return new instance
    }
}

// ❌ Public constructor
public record Email(string Value);

// ❌ No validation
public record Email
{
    public static Email Create(string value) => new Email(value);
}

// ❌ Using class instead of record
public class Email { ... }
```

Rules:
- Always `record` (value equality)
- Always private constructor
- Always static `Create()` factory method with validation
- Throw `DomainException` for invariant violations — never return null or use Result types
- Can have multiple factory methods if semantically different: `Money.FromCents(int)`, `Money.FromDecimal(decimal)`
- Can have pure behavior methods: `Email.GetDomain()`, `Money.Add(Money other)`
- No dependencies — no injected services

### Entity coding rules

```csharp
// ✅ Correct Entity pattern
public class Shift
{
    private readonly List<IDomainEvent> domainEvents = new();

    public Guid Id { get; private set; }
    public Email EmployeeEmail { get; private set; }    // Value Object, not string
    public ShiftStatus Status { get; private set; }

    public IReadOnlyCollection<IDomainEvent> DomainEvents => this.domainEvents.AsReadOnly();

    private Shift() { }    // EF Core

    public static Shift Create(Email employeeEmail, ShiftDuration duration)
    {
        // Validate, set state, raise event, return
    }

    public void Cancel(string reason)
    {
        // Validate preconditions
        // Mutate state
        // Raise domain event
    }
}

// ❌ Anemic entity (no behavior)
public class Shift
{
    public Guid Id { get; set; }
    public string EmployeeEmail { get; set; }    // raw primitive
    public string Status { get; set; }
}

// ❌ Public setters
public Email EmployeeEmail { get; set; }

// ❌ Logic in service instead of entity
public class ShiftService
{
    public void Cancel(Shift shift, string reason)
    {
        shift.Status = ShiftStatus.Cancelled;  // ❌ external mutation
    }
}
```

Rules:
- Private parameterless constructor for EF Core
- Static `Create()` factory method — only way to create new instances
- All setters are `private set`
- State changes only through named domain methods (`Cancel()`, `Confirm()`, `Reassign()`)
- Use Value Objects for properties with domain meaning — avoid primitive obsession
- Domain methods validate preconditions before mutating state
- Domain methods raise events via `AddDomainEvent()`
- No infrastructure dependencies — entities are pure domain logic

### When to use Value Objects vs. primitives

| Use Value Object | Use primitive |
|---|---|
| Has validation rules (email format, phone format) | Simple identifier with no rules (Guid Id) |
| Has domain meaning beyond the type (Money ≠ decimal) | Configuration values (string connectionString) |
| Combines multiple values (DateRange = start + end) | Flags or counters (int retryCount) |
| Has behavior (Money.Add, Email.GetDomain) | Raw data with no behavior |

### Domain method design

```csharp
// ✅ Good domain method — validates, mutates, raises event
public void Confirm(Guid confirmedBy)
{
    if (this.Status != ShiftStatus.Pending)
    {
        throw new DomainException("Only pending shifts can be confirmed.");
    }

    this.Status = ShiftStatus.Confirmed;
    this.ConfirmedBy = confirmedBy;
    this.ConfirmedAt = DateTime.UtcNow;
    this.AddDomainEvent(new ShiftConfirmedDomainEvent(this.Id, confirmedBy));
}

// ❌ Bad — no precondition check
public void Confirm(Guid confirmedBy)
{
    this.Status = ShiftStatus.Confirmed;
}

// ❌ Bad — returns instead of throwing (inconsistent with Value Object pattern)
public bool TryConfirm(Guid confirmedBy) { ... }
```

---

## TDD — Coding Rules

### Mandatory TDD scope

| Code type | TDD required | Reason |
|---|---|---|
| Value Objects | ✅ Yes | Pure logic, trivial to test, high value |
| Entity domain methods | ✅ Yes | Business rules must be verified |
| Entity factory methods | ✅ Yes | Creation invariants must be verified |
| Use Case Services | ✅ Yes | Orchestration logic |
| Application Services | ✅ Yes | Infrastructure-facing logic |
| Request Validators | ✅ Yes | Input validation rules |
| EF Core configurations | ❌ No | Declarative, no logic |
| Endpoint registrations | ❌ No | Declarative, no logic |
| DTOs | ❌ No | Data containers, no logic |
| DI registrations | ❌ No | Declarative, no logic |

### TDD workflow

```
1. RED    — Write ONE failing test (compile error counts as red)
2. GREEN  — Write the MINIMUM code to pass (no more)
3. REFACTOR — Improve structure, remove duplication, keep tests green
4. REPEAT — Next test case
```

### Implementation order for a new feature

1. Value Object tests → Value Object implementation
2. Entity tests → Entity implementation
3. Use Case Service tests → Service implementation
4. Request Validator tests → Validator implementation

### Test file organization

```
UnitTest.{Organization}.{Product}/
└── {Entity}/
    ├── Domain/
    │   └── {Entity}Tests.cs              # Entity factory + behavior tests
    ├── ValueObjects/
    │   └── {ValueObject}Tests.cs         # Value Object Create() tests
    ├── Validators/
    │   └── {Entity}{Action}RequestValidatorTests.cs
    ├── Services/
    │   └── {Entity}{Action}ServiceTests.cs
    └── Controllers/
        └── {Entity}{Action}ControllerTests.cs
```
