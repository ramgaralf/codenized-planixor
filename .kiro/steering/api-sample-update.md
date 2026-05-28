---
inclusion: manual
---

# Use Case Sample: UPDATE

Reference implementation using `Contact` as the entity. Replace `Contact`/`contact` with the actual entity name.

**Characteristics**: PUT `/{id}`, `Id` is `[JsonIgnore]` (set from route), has Commands + Specification + Extensions, optional Event, throws `NotFoundException`.

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
    /// <param name="service">Validation service.</param>
    public ContactUpdateRequestValidator(IValidationService<ContactUpdateRequest> service)
        : base(service)
    {
        this.AddRuleFor(p => p.Name)
            .AddRequirement(p => !string.IsNullOrEmpty(p.Name), "The name field is required.")
            .AddRequirement(p => p.Name.Length <= 50, "The name field must be at most 50 characters long.");

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
using {Organization}.{Product}.Dtos.Contact.Update;
using {Organization}.{Product}.Events.OnContactUpdated;
using {Organization}.{Product}.UseCases.Contact.Update.Commands;
using {Organization}.{Product}.UseCases.Contact.Update.Extensions;
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
    /// <returns>A contact update response.</returns>
    public async Task<ContactUpdateResponse> Run(ContactUpdateRequest request)
    {
        var contact = request.ToContact();
        await this.commands.Update(contact);
        await this.commands.SaveChanges();
        this.logger.LogInformation("Update contact: {ContactId}.", contact.Id);
        await this.eventHub.RiseEventAsync(new OnContactUpdatedEvent(contact.Id, contact.Name, contact.Email ?? string.Empty));
        return new ContactUpdateResponse { Id = contact.Id };
    }
}
```

---

## Commands interface

```csharp
// <copyright file="IContactUpdateCommands.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Update.Commands;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;

/// <summary>Defines the contract for contact update commands.</summary>
public interface IContactUpdateCommands : IUnitOfWork
{
    /// <summary>Updates an existing contact.</summary>
    /// <param name="contact">The updated contact entity.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    Task Update(Contact contact);
}
```

---

## Commands implementation

```csharp
// <copyright file="ContactUpdateCommands.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.Repositories.Contact.Update;

using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.DataContext;
using {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.DataContext.Guards;
using {Organization}.{Product}.UseCases.Contact.Update.Commands;
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

    /// <summary>Updates a contact in the database context.</summary>
    /// <param name="contact">The contact entity to update.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public Task Update(Contact contact)
    {
        this.context.GetWriteContext().Contacts.Update(contact);
        return Task.CompletedTask;
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

## Extensions

```csharp
// <copyright file="ContactUpdateExtensions.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Update.Extensions;

using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Dtos.Contact.Update;

/// <summary>Extension methods for the ContactUpdate use case.</summary>
internal static class ContactUpdateExtensions
{
    /// <summary>Converts a <see cref="ContactUpdateRequest"/> to a <see cref="Contact"/> entity.</summary>
    /// <param name="contactUpdateRequest">The request to convert.</param>
    /// <returns>A new <see cref="Contact"/> entity with Id.</returns>
    internal static Contact ToContact(this ContactUpdateRequest contactUpdateRequest)
    {
        return new Contact
        {
            Id = contactUpdateRequest.Id,
            Name = contactUpdateRequest.Name,
            Email = contactUpdateRequest.Email,
        };
    }
}
```

---

## Endpoint registration

```csharp
group.MapEndpoint<GenericResponse<ContactUpdateResponse>>(
    HttpMethods.Put,
    "/{id}",
    async (int id, ContactUpdateRequest request, IController<ContactUpdateRequest, ContactUpdateResponse> controller) =>
    {
        request.Id = id;
        var result = await controller.Handle(request);
        return Results.Ok(result);
    },
    "UpdateContact",
    "Update contact endpoint",
    "This endpoint is for update a contact.");
```
