---
inclusion: fileMatch
fileMatchPattern: "api/**"
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
| Struct | PascalCase | `Coordinate` |
| Enum | PascalCase | `OrderStatus` |
| Enum member | PascalCase | `Pending`, `Completed` |
| Interface | PascalCase with `I` prefix | `IRepository`, `IDisposable` |

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
