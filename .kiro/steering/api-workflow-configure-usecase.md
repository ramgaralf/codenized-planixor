---
inclusion: manual
---

# Workflow: Configure Use Case

**Trigger**: a Kiro spec task that defines a new use case, or the user says "configure use case {Entity} {Action}" providing the details.
**Result**: DTOs + Validator + Service + optional Event + optional Endpoint + Tests, committed and pushed.

---

## Procedure start

Record and display the start timestamp. Used later to calculate total duration.

---

## Pre-code mandatory gates

**Hard rule**: no code is generated until all gates are complete and reported.

1. Use case definition extracted and validated from the spec task
2. GitFlow branch setup completed
3. Stop conditions resolved (use case already exists, branch already exists, missing data, etc.)

If any gate fails → **STOP** and return an error explaining which gate failed.

---

## Gate 1 — Extract use case definition from spec task

Read the spec task content. Extract:

- **Entity** (PascalCase, e.g. `TaskList`, `WorkItem`)
- **Action** (Add, Update, Delete, Get, GetList)
- **Request properties** — for each: name, type, required/optional, max length, description
- **Response properties** — what the use case returns
- **Validation rules** — per property
- **Business rules** — logic the service must enforce
- **Events** — whether a domain event should be emitted
- **Endpoint** — whether an HTTP endpoint is needed, and its URL/method

If the spec task does not contain enough information → **STOP** and ask the user to complete the task definition before proceeding.

**Output required before continuing:**
```
ENTITY: <EntityName>
ACTION: <Add|Update|Delete|Get|GetList>
REQUEST_PROPERTIES: <list>
RESPONSE_PROPERTIES: <list>
HAS_EVENT: true|false
HAS_ENDPOINT: true|false
```

---

## Gate 2 — GitFlow branch setup

Branch from `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/{entity-lowercase}-{action-lowercase}
```

If the branch already exists → **STOP** and return an error.

**Output required:**
```
BASE_BRANCH: develop
TICKET_BRANCH: feature/{entity-lowercase}-{action-lowercase}
```

---

## What the NuGet already provides — never create these per use case

- ❌ No `{Entity}{Action}Controller` — `Controller<TReq,TRes>` is generic, from NuGet
- ❌ No `{Entity}{Action}Interactor` — `Interactor<TReq>` is generic, from NuGet
- ❌ No `{Entity}{Action}Presenter` — `Presenter<TRes>` is generic, from NuGet
- ❌ No `RunValidator()` call — `ValidationInteractorBehaviour` handles it automatically
- ❌ No manual DI registration — `AddCleanArchitecture()` scans automatically

---

## Use case type reference

Load the sample document for the action being implemented — it contains complete code for all files.

| Action | Sample to load | HTTP | URL | Commands | Queries | Specs | Extensions | Events | Response |
|---|---|---|---|---|---|---|---|---|---|
| Add | `#api-sample-add` | POST | `/` | ✅ | ❌ | ❌ | ✅ ToEntity | optional | ID |
| Get | `#api-sample-get` | GET | `/{id}` | ❌ | ✅ | ✅ | ✅ ToResponse | ❌ | Full entity |
| GetList | `#api-sample-getlist` | GET | `/` + query | ❌ | ✅ | ✅ | ✅ ToResponseItem | ❌ | List + metadata |
| Update | `#api-sample-update` | PUT | `/{id}` | ✅ | ❌ | ✅ | ✅ UpdateEntity | optional | ID |
| Delete | `#api-sample-delete` | DELETE | `/{id}` | ✅ | ❌ | ✅ | ❌ | optional | ID |

---

## Step 1 — Create DTOs

### `{Entity}{Action}Request.cs` — `Dtos/{Entity}/{Action}/`

```csharp
// <copyright file="{Entity}{Action}Request.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.{Entity}.{Action};

/// <summary>
/// {Entity} {action-lowercase} request.
/// </summary>
public sealed class {Entity}{Action}Request
{
    // Properties from spec task with XML docs
    // Update action: add [JsonIgnore] on Id (set from route param)
}
```

### `{Entity}{Action}RequestValidator.cs` — same folder

```csharp
// <copyright file="{Entity}{Action}RequestValidator.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.{Entity}.{Action};

using {Organization}.CleanArchitecture.Abstractions.Validations;

/// <summary>
/// {Entity} {action-lowercase} request validator.
/// </summary>
public sealed class {Entity}{Action}RequestValidator : ValidatorBase<{Entity}{Action}Request>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="{Entity}{Action}RequestValidator"/> class.
    /// </summary>
    /// <param name="service">Validation service.</param>
    public {Entity}{Action}RequestValidator(IValidationService<{Entity}{Action}Request> service)
        : base(service)
    {
        // Validation rules from spec task
        // this.AddRuleFor(p => p.Property)
        //     .AddRequirement(p => condition, "message.");
    }
}
```

### `{Entity}{Action}Response.cs` — same folder

```csharp
// <copyright file="{Entity}{Action}Response.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.{Entity}.{Action};

/// <summary>
/// {Entity} {action-lowercase} response.
/// </summary>
public sealed class {Entity}{Action}Response
{
    // Add:     Id only
    // Get:     full entity properties from spec task
    // GetList: inherits FilterModelResponse<{Entity}GetListResponseItem>
    // Update:  Id only
    // Delete:  Id only
}
```

Build `{Organization}.{Product}.Dtos` — verify no errors.

---

## Step 2 — Create event (conditional — skip if HAS_EVENT is false)

### `On{Entity}{Action}edEvent.cs` — `Events/On{Entity}{Action}ed/`

```csharp
// <copyright file="On{Entity}{Action}edEvent.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Events.On{Entity}{Action}ed;

using {Organization}.CleanArchitecture.Abstractions.Events;

/// <summary>
/// {Entity} {action-lowercase}ed event.
/// </summary>
public sealed class On{Entity}{Action}edEvent : IDomainEvent
{
    /// <summary>
    /// Initializes a new instance of the <see cref="On{Entity}{Action}edEvent"/> class.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    public On{Entity}{Action}edEvent(int id /*, other relevant data from spec task */)
    {
        this.Id = id;
    }

    /// <summary>Gets the entity identifier.</summary>
    public int Id { get; }
}
```

### `On{Entity}{Action}edEventHandler.cs` — same folder

```csharp
// <copyright file="On{Entity}{Action}edEventHandler.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Events.On{Entity}{Action}ed;

using Microsoft.Extensions.Logging;
using {Organization}.CleanArchitecture.Abstractions.Events;

/// <summary>
/// {Entity} {action-lowercase}ed event handler.
/// </summary>
public sealed class On{Entity}{Action}edEventHandler : IAsyncDomainEventHandler<On{Entity}{Action}edEvent>
{
    private readonly ILogger<On{Entity}{Action}edEventHandler> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="On{Entity}{Action}edEventHandler"/> class.
    /// </summary>
    /// <param name="logger">Application logger.</param>
    public On{Entity}{Action}edEventHandler(ILogger<On{Entity}{Action}edEventHandler> logger)
    {
        this.logger = logger;
    }

    /// <summary>Handle event asynchronously.</summary>
    /// <param name="data">On {entity-lowercase} {action-lowercase}ed event data.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public async Task HandleAsync(On{Entity}{Action}edEvent data)
    {
        this.logger.LogInformation("{Entity} {action-lowercase}ed: {Id}", data.Id);
        await Task.CompletedTask;
    }
}
```

Build `{Organization}.{Product}.Events`.

---

## Step 3 — Create use case (Service + Commands/Queries + Extensions)

### `{Entity}{Action}Service.cs` — `UseCases/{Entity}/{Action}/`

```csharp
// <copyright file="{Entity}{Action}Service.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.{Entity}.{Action};

using Microsoft.Extensions.Logging;
using {Organization}.{Product}.Dtos.{Entity}.{Action};
using {Organization}.CleanArchitecture.Abstractions.Interactors;

/// <summary>
/// {Entity} {action-lowercase} service.
/// </summary>
public sealed class {Entity}{Action}Service : IInteractorService<{Entity}{Action}Request, {Entity}{Action}Response>
{
    private readonly ILogger<{Entity}{Action}Service> logger;
    // Inject: I{Entity}{Action}Commands or I{Entity}{Action}Queries
    // Inject: IAsyncDomainEventHub<On{Entity}{Action}edEvent> if HAS_EVENT is true
    // DO NOT inject IValidator<> — handled automatically by the pipeline

    /// <summary>
    /// Initializes a new instance of the <see cref="{Entity}{Action}Service"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    public {Entity}{Action}Service(ILogger<{Entity}{Action}Service> logger)
    {
        this.logger = logger;
    }

    /// <summary>Run.</summary>
    /// <param name="request">{Entity} {action-lowercase} request.</param>
    /// <returns>{Entity} {action-lowercase} response.</returns>
    public async Task<{Entity}{Action}Response> Run({Entity}{Action}Request request)
    {
        // request is pre-validated — implement business rules from spec task here
        // DO NOT call RunValidator()
        // Delete: store entity data BEFORE deletion for event payload
        // Get/Update/Delete: throw NotFoundException if entity not found
    }
}
```

### Commands interface (Add, Update, Delete) — `UseCases/{Entity}/{Action}/Commands/`

```csharp
public interface I{Entity}{Action}Commands : IUnitOfWork
{
    // Add:    Task Add({Entity} entity);
    // Update: Task Update({Entity} entity);
    // Delete: Task<{Entity}> Delete(Specification<{Entity}> specification);
}
```

### Queries interface (Get, GetList) — `UseCases/{Entity}/{Action}/Queries/`

```csharp
public interface I{Entity}{Action}Queries
{
    // Get:     Task<{Entity}> Get(Specification<{Entity}> specification);
    // GetList: Task<FilterModelResponse<{Entity}>> GetList(Specification<{Entity}> specification, List<SortFilter> sorts, int pageNumber, int pageSize);
}
```

### Repository implementation — `Repositories/{Entity}/{Action}/`

Implements the Commands or Queries interface + `IRepository`.
Uses `ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext>`.
Write operations use `GetWriteContext()`, read operations use `GetReadContext()`.
All write operations call `DataContextGuards.SaveChanges(context)`.

### Extensions (if needed) — `UseCases/{Entity}/{Action}/Extensions/`

```csharp
internal static class {Entity}{Action}Extensions
{
    // Add:     internal static {Entity} To{Entity}(this {Entity}AddRequest request)
    // Get:     internal static {Entity}GetResponse To{Entity}GetResponse(this {Entity} entity)
    // GetList: internal static {Entity}GetListResponseItem To{Entity}GetListResponseItem(this {Entity} entity)
    // Update:  internal static {Entity} To{Entity}(this {Entity}UpdateRequest request)  // includes Id
}
```

Build `{Organization}.{Product}.UseCases`.

---

## Step 4 — Create endpoint (conditional — skip if HAS_ENDPOINT is false)

### `{Entity}RegisterEndpoints.cs` — `Api/Endpoints/{Entity}/`

If the file does not exist, create it:

```csharp
// <copyright file="{Entity}RegisterEndpoints.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Api.Endpoints.{Entity};

using Microsoft.AspNetCore.Builder;
using {Organization}.CleanArchitecture.Abstractions.Controllers;
using {Organization}.CleanArchitecture.Abstractions.Presenters;
using {Organization}.Exceptions.GlobalExceptionStrategy.Extensions;

/// <summary>
/// {Entity} register endpoints.
/// </summary>
internal static class {Entity}RegisterEndpoints
{
    /// <summary>
    /// Use {entity-lowercase} endpoints.
    /// </summary>
    /// <param name="endpoints">Endpoint route builder.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder Use{Entity}Endpoints(
        this IEndpointRouteBuilder endpoints,
        string apiBasePath)
    {
        var group = endpoints.MapGroup($"{apiBasePath}/{entity-lowercase-plural}")
            .WithTags("{EntityPlural}");

        // Add endpoint registrations here
        return endpoints;
    }
}
```

Register the use case endpoint inside `Use{Entity}Endpoints` using the pattern matching the action:

```csharp
// Add:
group.MapEndpoint<GenericResponse<{Entity}AddResponse>>(
    HttpMethods.Post, "/",
    async ({Entity}AddRequest request, IController<{Entity}AddRequest, {Entity}AddResponse> controller) =>
    {
        var result = await controller.Handle(request);
        return Results.Ok(result);
    },
    "Add{Entity}", "Add {entity-lowercase} endpoint", "This endpoint is for add a {entity-lowercase}.");

// Get:
group.MapEndpoint<GenericResponse<{Entity}GetResponse>>(
    HttpMethods.Get, "/{id}",
    async (int id, IController<{Entity}GetRequest, {Entity}GetResponse> controller) =>
    {
        var result = await controller.Handle(new {Entity}GetRequest { Id = id });
        return Results.Ok(result);
    },
    "Get{Entity}", "Get {entity-lowercase} endpoint", "This endpoint is for get a {entity-lowercase}.");

// GetList:
group.MapEndpoint<GenericResponse<{Entity}GetListResponse>>(
    HttpMethods.Get, "/",
    async (string? filter, string? sort, int? page, int? size,
           IController<{Entity}GetListRequest, {Entity}GetListResponse> controller) =>
    {
        var result = await controller.Handle(new {Entity}GetListRequest(filter, sort, page ?? 0, size ?? 0));
        return Results.Ok(result);
    },
    "GetList{Entity}", "Get {entity-lowercase} list endpoint", "This endpoint is for get a list of {entity-lowercase-plural}.");

// Update:
group.MapEndpoint<GenericResponse<{Entity}UpdateResponse>>(
    HttpMethods.Put, "/{id}",
    async (int id, {Entity}UpdateRequest request, IController<{Entity}UpdateRequest, {Entity}UpdateResponse> controller) =>
    {
        request.Id = id;
        var result = await controller.Handle(request);
        return Results.Ok(result);
    },
    "Update{Entity}", "Update {entity-lowercase} endpoint", "This endpoint is for update a {entity-lowercase}.");

// Delete:
group.MapEndpoint<GenericResponse<{Entity}DeleteResponse>>(
    HttpMethods.Delete, "/{id}",
    async (int id, IController<{Entity}DeleteRequest, {Entity}DeleteResponse> controller) =>
    {
        var result = await controller.Handle(new {Entity}DeleteRequest { Id = id });
        return Results.Ok(result);
    },
    "Delete{Entity}", "Delete {entity-lowercase} endpoint", "This endpoint is for delete a {entity-lowercase}.");
```

If the entity is new, register it in `RegisterEndpoints.cs`:

```csharp
// Add using:
using {Organization}.{Product}.Api.Endpoints.{Entity};

// Add call inside UseAppEndpoints:
app.Use{Entity}Endpoints(apiBasePath);
```

Build `{Organization}.{Product}.Api`.

---

## Step 5 — Create unit tests

### Validator tests — `UnitTest/{Entity}/{Action}/`

File: `{Entity}{Action}RequestValidatorTests.cs`

- Minimum 80% coverage
- Cover: valid request, required field violations, format validations, range validations, business rules from spec task
- Framework: NUnit + NSubstitute
- Pattern: AAA (Arrange, Act, Assert)
- Naming: `MethodName_StateUnderTest_ExpectedBehavior`

### Service tests — same folder

File: `{Entity}{Action}ServiceTests.cs`

- Cover: successful execution, business rules from spec task, error handling (not found, conflict), repository interactions, event emission (if applicable)

### Controller tests — same folder

File: `{Entity}{Action}ControllerTests.cs`

- Cover: successful handling, input/output port coordination

### Event handler tests (conditional — only if HAS_EVENT is true) — `UnitTest/Events/On{Entity}{Action}ed/`

File: `On{Entity}{Action}edEventHandlerTests.cs`

- Cover: handler invoked correctly, dependencies used, logging, business logic

Run all tests — all must pass, coverage ≥ 80%.

---

## Commit and push

```bash
git add -A
git commit -m "feat({entity-lowercase}): add {Entity}{Action} use case"
git push origin feature/{entity-lowercase}-{action-lowercase}
```

---

## Execution checklist

1. Use case definition extracted from spec task ✅/❌
2. Branch created from develop ✅/❌
3. DTOs created and build passes ✅/❌
4. Event created (or skipped) ✅/❌
5. Service + Commands/Queries + Repository created ✅/❌
6. Extensions created (or skipped) ✅/❌
7. Endpoint created and registered (or skipped) ✅/❌
8. Build errors/warnings resolved ✅/❌
9. Tests created and passing ✅/❌
10. Committed and pushed ✅/❌
