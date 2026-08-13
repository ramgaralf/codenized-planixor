---
inclusion: manual
---

# Use Case Sample: UPDATE

Reference implementation using `Contact` as the entity. Replace `Contact`/`contact` with the actual entity name.

**Characteristics**: PUT `/{id}`, `Id` is `[JsonIgnore]` (set from route), has Commands + Specification, **no Extensions**, optional Event, throws `NotFoundException`.

---

## DTOs

### `ContactUpdateRequest.cs`

```csharp
// <copyright file="ContactUpdateRequest.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Update;

using System.Text.Json.Serialization;

/// <summary>Contact update request class.</summary>
public sealed class ContactUpdateRequest
{
    /// <summary>Gets or sets id.</summary>
    [JsonIgnore]
    public int Id { get; set; }

    /// <summary>Gets or sets name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets email.</summary>
    public string? Email { get; set; }
}
```

### `ContactUpdateRequestValidator.cs`

```csharp
// <copyright file="ContactUpdateRequestValidator.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Update;

using {Organization}.CleanArchitecture.Abstractions.Validations;

/// <summary>Contact update request validator class.</summary>
public sealed class ContactUpdateRequestValidator : ValidatorBase<ContactUpdateRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ContactUpdateRequestValidator"/> class.
    /// </summary>
    public ContactUpdateRequestValidator()
    {
        this.AddRuleFor(p => p.Name)
            .AddRequirement(p => !string.IsNullOrEmpty(p.Name), "The name field is required.")
            .AddRequirement(p => string.IsNullOrEmpty(p.Name) || p.Name.Length <= 50, "The name field must be at most 50 characters long.");

        this.AddRuleFor(p => p.Email)
            .AddRequirement(p => string.IsNullOrEmpty(p.Email) || p.Email.Length <= 200, "The email field is optional and must be at most 200 characters long.");
    }
}
```

### `ContactUpdateResponse.cs`

```csharp
// <copyright file="ContactUpdateResponse.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Update;

/// <summary>Contact update response class.</summary>
public sealed class ContactUpdateResponse
{
    /// <summary>Gets or sets id.</summary>
    public int Id { get; set; }
}
```

---

## Service

```csharp
// <copyright file="ContactUpdateService.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Update;

using Microsoft.Extensions.Logging;
using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Core.ValueObjects;
using {Organization}.{Product}.Dtos.Contact.Update;
using {Organization}.{Product}.Events.OnContactUpdated;
using {Organization}.{Product}.UseCases.Contact.Update.Commands;
using {Organization}.{Product}.UseCases.Contact.Update.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Events;
using {Organization}.CleanArchitecture.Abstractions.Interactors;

/// <summary>Contact update service class.</summary>
public sealed class ContactUpdateService : IInteractorService<ContactUpdateRequest, ContactUpdateResponse>
{
    private readonly ILogger<ContactUpdateService> logger;
    private readonly IContactUpdateCommands commands;
    private readonly IAsyncDomainEventHub<OnContactUpdatedEvent> eventHub;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactUpdateService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="commands">Use case commands.</param>
    /// <param name="eventHub">Event hub.</param>
    public ContactUpdateService(
        ILogger<ContactUpdateService> logger,
        IContactUpdateCommands commands,
        IAsyncDomainEventHub<OnContactUpdatedEvent> eventHub)
    {
        this.logger = logger;
        this.commands = commands;
        this.eventHub = eventHub;
    }

    /// <summary>Run.</summary>
    /// <param name="request">Contact update request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A contact update response.</returns>
    public async Task<ContactUpdateResponse> Run(ContactUpdateRequest request, CancellationToken cancellationToken)
    {
        // Load, then let the entity change itself. A rich entity has no public setters, so an update cannot be a
        // detached instance built from the request and handed to DbSet.Update — there is no way to build one, and
        // no way for the entity to refuse a change it does not allow.
        Contact contact = await this.commands.GetForUpdate(
            new ContactUpdateByIdSpecification(request.Id),
            cancellationToken);

        contact.ChangeDetails(
            ContactName.Create(request.Name),
            Email.Create(request.Email));

        await this.commands.SaveChanges(cancellationToken);
        this.logger.LogInformation("Update contact: {ContactId}.", contact.Id);
        await this.eventHub.RaiseEventAsync(new OnContactUpdatedEvent(contact.Id, contact.Name.Value, contact.Email.Value), cancellationToken);
        return new ContactUpdateResponse { Id = contact.Id };
    }
}
```

> The entity is loaded **tracked**, so `SaveChanges` writes whatever `ChangeDetails` altered. No `DbSet.Update` call
> is needed, and none should be made: it marks every property modified, including ones the request never mentioned.

---

## Commands interface

```csharp
// <copyright file="IContactUpdateCommands.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Update.Commands;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;

/// <summary>Defines the contract for contact update commands.</summary>
public interface IContactUpdateCommands : IUnitOfWork
{
    /// <summary>Loads a contact for modification, tracked by the write context.</summary>
    /// <param name="specification">The specification that identifies the contact.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The tracked contact.</returns>
    /// <exception cref="NotFoundException">Thrown when no contact matches.</exception>
    Task<Contact> GetForUpdate(Specification<Contact> specification, CancellationToken cancellationToken);
}
```

---

## Specification

```csharp
// <copyright file="ContactUpdateByIdSpecification.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Update.Specifications;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using System;
using System.Linq.Expressions;

/// <summary>Specification for locating the contact to update by its unique identifier.</summary>
public sealed class ContactUpdateByIdSpecification : Specification<Contact>
{
    private readonly int id;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactUpdateByIdSpecification"/> class.
    /// </summary>
    /// <param name="id">Contact identifier.</param>
    public ContactUpdateByIdSpecification(int id)
    {
        this.id = id;
    }

    /// <summary>Gets the condition expression.</summary>
    public override Expression<Func<Contact, bool>> ConditionExpression => u => u.Id == this.id;
}
```

> `ConditionExpression` is what reaches the query, so the condition runs in the database. Never `IsSatisfiedBy` inside
> a `Where` — that materialises the table and filters in memory. See `#backend-tech` → Specifications.

---

## Commands implementation

```csharp
// <copyright file="ContactUpdateCommands.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.Repositories.Contact.Update;

using Microsoft.EntityFrameworkCore;
using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Persistence.MySql.Efc.DataContext;
using {Organization}.{Product}.Persistence.MySql.Efc.DataContext.Guards;
using {Organization}.{Product}.UseCases.Contact.Update.Commands;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Exceptions.Abstractions.NotFound;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Handler;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;

/// <summary>Implements command operations for updating contacts.</summary>
public sealed class ContactUpdateCommands : IContactUpdateCommands, IRepository
{
    private readonly ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactUpdateCommands"/> class.
    /// </summary>
    /// <param name="context">The context handler.</param>
    public ContactUpdateCommands(ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context)
    {
        this.context = context;
    }

    /// <summary>Loads a contact for modification, tracked by the write context.</summary>
    /// <param name="specification">The specification that identifies the contact.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The tracked contact.</returns>
    public async Task<Contact> GetForUpdate(Specification<Contact> specification, CancellationToken cancellationToken)
    {
        // Tracked on purpose — no AsNoTracking. What the entity's behaviour method changes is what SaveChanges writes.
        return await this.context.GetWriteContext().Contacts
            .FirstOrDefaultAsync(specification.ConditionExpression, cancellationToken)
            ?? throw new NotFoundException("CONTACT_NOT_FOUND", "Contact not found", "No contact matches the supplied identifier.");
    }

    /// <summary>Persists all pending changes to the database.</summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public async Task SaveChanges(CancellationToken cancellationToken)
    {
        await DataContextGuards.SaveChanges(this.context.GetWriteContext(), cancellationToken);
    }
}
```

---

## Extensions

**Update has none.** There is nothing to map: the entity is loaded from the write context and changes itself through
a behaviour method, so no request-to-entity conversion exists. An extension that built a detached `Contact` from the
request would need public setters, which TIER 0 #11 forbids — and it is what made the old shape reach for
`DbSet.Update`, marking every column modified whether the request mentioned it or not.

Add has one, because there the entity does not exist yet and `Contact.Create(...)` needs its Value Objects built from
the request. See `#backend-sample-add`.

---

## Endpoint registration

```csharp
group.MapEndpoint<GenericResponse<ContactUpdateResponse>>(
    HttpMethods.Put,
    "/{id}",
    async (int id, ContactUpdateRequest request, IController<ContactUpdateRequest, ContactUpdateResponse> controller, CancellationToken cancellationToken) =>
    {
        request.Id = id;
        var result = await controller.Handle(request, cancellationToken);
        return Results.Ok(result);
    },
    "UpdateContact",
    "Update contact endpoint",
    "This endpoint is for update a contact.");
```
