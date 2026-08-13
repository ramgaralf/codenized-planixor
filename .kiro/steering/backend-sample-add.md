---
inclusion: manual
---

# Use Case Sample: ADD

Reference implementation using `Contact` as the entity. Replace `Contact`/`contact` with the actual entity name.

**Characteristics**: POST `/`, returns created ID, has Commands + Extensions, optional Event.

---

## DTOs

### `ContactAddRequest.cs`

```csharp
// <copyright file="ContactAddRequest.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Add;

/// <summary>Contact add request class.</summary>
public sealed class ContactAddRequest
{
    /// <summary>Gets or sets name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets email.</summary>
    public string? Email { get; set; }
}
```

### `ContactAddRequestValidator.cs`

```csharp
// <copyright file="ContactAddRequestValidator.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Add;

using {Organization}.CleanArchitecture.Abstractions.Validations;

/// <summary>Contact add request validator class.</summary>
public sealed class ContactAddRequestValidator : ValidatorBase<ContactAddRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ContactAddRequestValidator"/> class.
    /// </summary>
    public ContactAddRequestValidator()
    {
        this.AddRuleFor(p => p.Name)
            .AddRequirement(p => !string.IsNullOrEmpty(p.Name), "The name field is required.")
            .AddRequirement(p => string.IsNullOrEmpty(p.Name) || p.Name.Length <= 50, "The name field must be at most 50 characters long.");

        this.AddRuleFor(p => p.Email)
            .AddRequirement(p => string.IsNullOrEmpty(p.Email) || p.Email.Length <= 200, "The email field is optional and must be at most 200 characters long.");
    }
}
```

### `ContactAddResponse.cs`

```csharp
// <copyright file="ContactAddResponse.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Add;

/// <summary>Contact add response class.</summary>
public sealed class ContactAddResponse
{
    /// <summary>Gets or sets id.</summary>
    public int Id { get; set; }
}
```

---

## Service

```csharp
// <copyright file="ContactAddService.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Add;

using Microsoft.Extensions.Logging;
using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Dtos.Contact.Add;
using {Organization}.{Product}.Events.OnContactAdded;
using {Organization}.{Product}.UseCases.Contact.Add.Commands;
using {Organization}.{Product}.UseCases.Contact.Add.Extensions;
using {Organization}.CleanArchitecture.Abstractions.Events;
using {Organization}.CleanArchitecture.Abstractions.Interactors;

/// <summary>Contact add service class.</summary>
public sealed class ContactAddService : IInteractorService<ContactAddRequest, ContactAddResponse>
{
    private readonly ILogger<ContactAddService> logger;
    private readonly IContactAddCommands commands;
    private readonly IAsyncDomainEventHub<OnContactAddedEvent> eventHub;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactAddService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="commands">Use case commands.</param>
    /// <param name="eventHub">Event hub.</param>
    public ContactAddService(
        ILogger<ContactAddService> logger,
        IContactAddCommands commands,
        IAsyncDomainEventHub<OnContactAddedEvent> eventHub)
    {
        this.logger = logger;
        this.commands = commands;
        this.eventHub = eventHub;
    }

    /// <summary>Run.</summary>
    /// <param name="request">Contact add request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A contact add response.</returns>
    public async Task<ContactAddResponse> Run(ContactAddRequest request, CancellationToken cancellationToken)
    {
        var response = new ContactAddResponse();
        var contact = request.ToContact();
        await this.commands.Add(contact, cancellationToken);
        await this.commands.SaveChanges(cancellationToken);
        response.Id = contact.Id;
        await this.eventHub.RaiseEventAsync(new OnContactAddedEvent(contact.Id, contact.Name, contact.Email ?? string.Empty), cancellationToken);
        return response;
    }
}
```

---

## Commands interface

```csharp
// <copyright file="IContactAddCommands.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Add.Commands;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;

/// <summary>Defines the contract for contact addition commands.</summary>
public interface IContactAddCommands : IUnitOfWork
{
    /// <summary>Adds a new contact.</summary>
    /// <param name="contact">The contact entity to add.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    Task Add(Contact contact, CancellationToken cancellationToken);
}
```

---

## Commands implementation

```csharp
// <copyright file="ContactAddCommands.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.Repositories.Contact.Add;

using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Persistence.MySql.Efc.DataContext;
using {Organization}.{Product}.Persistence.MySql.Efc.DataContext.Guards;
using {Organization}.{Product}.UseCases.Contact.Add.Commands;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Handler;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;

/// <summary>Implements command operations for adding contacts.</summary>
public sealed class ContactAddCommands : IContactAddCommands, IRepository
{
    private readonly ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactAddCommands"/> class.
    /// </summary>
    /// <param name="context">The context handler.</param>
    public ContactAddCommands(ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context)
    {
        this.context = context;
    }

    /// <summary>Adds a new contact to the database context.</summary>
    /// <param name="contact">The contact entity to add.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public async Task Add(Contact contact, CancellationToken cancellationToken)
    {
        await this.context.GetWriteContext().Contacts.AddAsync(contact, cancellationToken);
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

```csharp
// <copyright file="ContactAddExtensions.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Add.Extensions;

using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Dtos.Contact.Add;

/// <summary>Extension methods for the ContactAdd use case.</summary>
internal static class ContactAddExtensions
{
    /// <summary>Converts a <see cref="ContactAddRequest"/> to a <see cref="Contact"/> entity.</summary>
    /// <param name="contactAddRequest">The request to convert.</param>
    /// <returns>A new <see cref="Contact"/> entity.</returns>
    internal static Contact ToContact(this ContactAddRequest contactAddRequest)
    {
        // Through the factory and the Value Objects, never an object initializer: the entity has no public setters,
        // and Create is what guarantees that an instance which exists is an instance that is valid.
        return Contact.Create(
            ContactName.Create(contactAddRequest.Name),
            Email.Create(contactAddRequest.Email));
    }
}
```

---

## Endpoint registration

```csharp
group.MapEndpoint<GenericResponse<ContactAddResponse>>(
    HttpMethods.Post,
    "/",
    async (ContactAddRequest request, IController<ContactAddRequest, ContactAddResponse> controller, CancellationToken cancellationToken) =>
    {
        var result = await controller.Handle(request, cancellationToken);
        return Results.Ok(result);
    },
    "AddContact",
    "Add contact endpoint",
    "This endpoint is for add a contact.");
```
