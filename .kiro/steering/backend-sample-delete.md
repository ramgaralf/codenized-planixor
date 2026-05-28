---
inclusion: manual
---

# Use Case Sample: DELETE

Reference implementation using `Contact` as the entity. Replace `Contact`/`contact` with the actual entity name.

**Characteristics**: DELETE `/{id}`, has Commands + Specification, no Extensions, optional Event, throws `NotFoundException`.
**Important**: store entity data BEFORE deletion — after `Remove()` the data is gone from the context.

---

## DTOs

### `ContactDeleteRequest.cs`

```csharp
// <copyright file="ContactDeleteRequest.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Delete;

/// <summary>Contact delete request class.</summary>
public sealed class ContactDeleteRequest
{
    /// <summary>Gets or sets identifier.</summary>
    public int Id { get; set; }
}
```

### `ContactDeleteRequestValidator.cs`

```csharp
// <copyright file="ContactDeleteRequestValidator.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Delete;

using {Organization}.CleanArchitecture.Abstractions.Validations;

/// <summary>Contact delete request validator class.</summary>
public sealed class ContactDeleteRequestValidator : ValidatorBase<ContactDeleteRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ContactDeleteRequestValidator"/> class.
    /// </summary>
    /// <param name="service">Validation service.</param>
    public ContactDeleteRequestValidator(IValidationService<ContactDeleteRequest> service)
        : base(service)
    {
        this.AddRuleFor(p => p.Id)
            .AddRequirement(p => p.Id > 0, "The identifier is not valid.");
    }
}
```

### `ContactDeleteResponse.cs`

```csharp
// <copyright file="ContactDeleteResponse.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Delete;

/// <summary>Contact delete response class.</summary>
public sealed class ContactDeleteResponse
{
    /// <summary>Gets or sets id.</summary>
    public int Id { get; set; }
}
```

---

## Service

```csharp
// <copyright file="ContactDeleteService.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Delete;

using Microsoft.Extensions.Logging;
using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Dtos.Contact.Delete;
using {Organization}.{Product}.Events.OnContactDeleted;
using {Organization}.{Product}.UseCases.Contact.Delete.Commands;
using {Organization}.{Product}.UseCases.Contact.Delete.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Events;
using {Organization}.CleanArchitecture.Abstractions.Interactors;

/// <summary>Contact delete service class.</summary>
public sealed class ContactDeleteService : IInteractorService<ContactDeleteRequest, ContactDeleteResponse>
{
    private readonly ILogger<ContactDeleteService> logger;
    private readonly IContactDeleteCommands commands;
    private readonly IAsyncDomainEventHub<OnContactDeletedEvent> eventHub;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactDeleteService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="commands">Use case commands.</param>
    /// <param name="eventHub">Event hub.</param>
    public ContactDeleteService(
        ILogger<ContactDeleteService> logger,
        IContactDeleteCommands commands,
        IAsyncDomainEventHub<OnContactDeletedEvent> eventHub)
    {
        this.logger = logger;
        this.commands = commands;
        this.eventHub = eventHub;
    }

    /// <summary>Run.</summary>
    /// <param name="request">Contact delete request.</param>
    /// <returns>A contact delete response.</returns>
    public async Task<ContactDeleteResponse> Run(ContactDeleteRequest request)
    {
        // Delete returns the entity BEFORE removal — capture data for the event
        var contact = await this.commands.Delete(new ContactDeleteByIdSpecification(request.Id));
        await this.commands.SaveChanges();
        this.logger.LogInformation("Delete contact: {ContactId}.", contact.Id);
        await this.eventHub.RiseEventAsync(new OnContactDeletedEvent(contact.Id, contact.Name, contact.Email ?? string.Empty));
        return new ContactDeleteResponse { Id = contact.Id };
    }
}
```

---

## Commands interface

```csharp
// <copyright file="IContactDeleteCommands.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Delete.Commands;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;

/// <summary>Defines the contract for contact delete commands.</summary>
public interface IContactDeleteCommands : IUnitOfWork
{
    /// <summary>Deletes a contact matching the specification and returns it.</summary>
    /// <param name="specification">The specification for the contact to delete.</param>
    /// <returns>A <see cref="Task"/> with the deleted contact entity.</returns>
    Task<Contact> Delete(Specification<Contact> specification);
}
```

---

## Commands implementation

```csharp
// <copyright file="ContactDeleteCommands.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.Repositories.Contact.Delete;

using Microsoft.EntityFrameworkCore;
using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.DataContext;
using {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.DataContext.Guards;
using {Organization}.{Product}.UseCases.Contact.Delete.Commands;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Handler;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;

/// <summary>Implements command operations for deleting contacts.</summary>
public sealed class ContactDeleteCommands : IContactDeleteCommands, IRepository
{
    private readonly ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactDeleteCommands"/> class.
    /// </summary>
    /// <param name="context">The context handler.</param>
    public ContactDeleteCommands(ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context)
    {
        this.context = context;
    }

    /// <summary>Deletes a contact matching the specification and returns it.</summary>
    /// <param name="specification">The specification for the contact to delete.</param>
    /// <returns>A <see cref="Task"/> with the deleted contact entity.</returns>
    public async Task<Contact> Delete(Specification<Contact> specification)
    {
        var writeContext = this.context.GetWriteContext();
        var contact = await writeContext.Contacts.FirstAsync(specification.ConditionExpression);
        writeContext.Contacts.Remove(contact);
        return contact;
    }

    /// <summary>Persists all pending changes to the database.</summary>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public async Task SaveChanges()
    {
        await DataContextGuards.SaveChanges(this.context.GetWriteContext());
    }
}
```

---

## Specification

```csharp
// <copyright file="ContactDeleteByIdSpecification.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Delete.Specifications;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using System;
using System.Linq.Expressions;

/// <summary>Specification for deleting a contact by its unique identifier.</summary>
public sealed class ContactDeleteByIdSpecification : Specification<Contact>
{
    private readonly int id;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactDeleteByIdSpecification"/> class.
    /// </summary>
    /// <param name="id">Contact identifier.</param>
    public ContactDeleteByIdSpecification(int id)
    {
        this.id = id;
    }

    /// <summary>Gets the condition expression.</summary>
    public override Expression<Func<Contact, bool>> ConditionExpression => u => u.Id == this.id;
}
```

---

## Endpoint registration

```csharp
group.MapEndpoint<GenericResponse<ContactDeleteResponse>>(
    HttpMethods.Delete,
    "/{id}",
    async (int id, IController<ContactDeleteRequest, ContactDeleteResponse> controller) =>
    {
        var result = await controller.Handle(new ContactDeleteRequest { Id = id });
        return Results.Ok(result);
    },
    "DeleteContact",
    "Delete contact endpoint",
    "This endpoint is for delete a contact.");
```
