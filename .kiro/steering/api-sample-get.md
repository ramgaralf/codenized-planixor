---
inclusion: manual
---

# Use Case Sample: GET (single)

Reference implementation using `Contact` as the entity. Replace `Contact`/`contact` with the actual entity name.

**Characteristics**: GET `/{id}`, returns full entity, has Queries + Specification + Extensions, throws `NotFoundException`, no Events.

---

## DTOs

### `ContactGetRequest.cs`

```csharp
// <copyright file="ContactGetRequest.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Get;

/// <summary>Contact get request class.</summary>
public sealed class ContactGetRequest
{
    /// <summary>Gets or sets identifier.</summary>
    public int Id { get; set; }
}
```

### `ContactGetRequestValidator.cs`

```csharp
// <copyright file="ContactGetRequestValidator.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Get;

using {Organization}.CleanArchitecture.Abstractions.Validations;

/// <summary>Contact get request validator class.</summary>
public sealed class ContactGetRequestValidator : ValidatorBase<ContactGetRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetRequestValidator"/> class.
    /// </summary>
    /// <param name="service">Validation service.</param>
    public ContactGetRequestValidator(IValidationService<ContactGetRequest> service)
        : base(service)
    {
        this.AddRuleFor(p => p.Id)
            .AddRequirement(p => p.Id > 0, "The identifier is not valid.");
    }
}
```

### `ContactGetResponse.cs`

```csharp
// <copyright file="ContactGetResponse.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.Get;

/// <summary>Contact get response class.</summary>
public sealed class ContactGetResponse
{
    /// <summary>Gets or sets id.</summary>
    public int Id { get; set; }

    /// <summary>Gets or sets name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets email.</summary>
    public string? Email { get; set; }
}
```

---

## Service

```csharp
// <copyright file="ContactGetService.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Get;

using Microsoft.Extensions.Logging;
using {Organization}.{Product}.Dtos.Contact.Get;
using {Organization}.{Product}.UseCases.Contact.Get.Extensions;
using {Organization}.{Product}.UseCases.Contact.Get.Queries;
using {Organization}.{Product}.UseCases.Contact.Get.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Exceptions;
using {Organization}.CleanArchitecture.Abstractions.Interactors;

/// <summary>Contact get service class.</summary>
public sealed class ContactGetService : IInteractorService<ContactGetRequest, ContactGetResponse>
{
    private readonly ILogger<ContactGetService> logger;
    private readonly IContactGetQueries queries;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="queries">Use case queries.</param>
    public ContactGetService(
        ILogger<ContactGetService> logger,
        IContactGetQueries queries)
    {
        this.logger = logger;
        this.queries = queries;
    }

    /// <summary>Run.</summary>
    /// <param name="request">Contact get request.</param>
    /// <returns>A contact get response.</returns>
    public async Task<ContactGetResponse> Run(ContactGetRequest request)
    {
        var contact = await this.queries.Get(new ContactGetByIdSpecification(request.Id));

        if (contact is null)
        {
            throw new NotFoundException("NOT_FOUND", "Not Found contact", $"Contact with Id {request.Id} not found.");
        }

        var response = contact.ToContactGetResponse();
        this.logger.LogInformation("Get contact: {ContactId}.", response.Id);
        return response;
    }
}
```

---

## Queries interface

```csharp
// <copyright file="IContactGetQueries.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Get.Queries;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;

/// <summary>Defines queries for retrieving contact information.</summary>
public interface IContactGetQueries
{
    /// <summary>Retrieves a contact matching the specification.</summary>
    /// <param name="specification">The specification criteria.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    Task<Contact> Get(Specification<Contact> specification);
}
```

---

## Specification

```csharp
// <copyright file="ContactGetByIdSpecification.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Get.Specifications;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using System;
using System.Linq.Expressions;

/// <summary>Specification for retrieving a contact by its unique identifier.</summary>
public sealed class ContactGetByIdSpecification : Specification<Contact>
{
    private readonly int id;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetByIdSpecification"/> class.
    /// </summary>
    /// <param name="id">Contact identifier.</param>
    public ContactGetByIdSpecification(int id)
    {
        this.id = id;
    }

    /// <summary>Gets the condition expression.</summary>
    public override Expression<Func<Contact, bool>> ConditionExpression => u => u.Id == this.id;
}
```

---

## Queries implementation

```csharp
// <copyright file="ContactGetQueries.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.Repositories.Contact.Get;

using Microsoft.EntityFrameworkCore;
using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.DataContext;
using {Organization}.{Product}.UseCases.Contact.Get.Queries;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Handler;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;
using {Organization}.CleanArchitecture.Abstractions.Specifications;

/// <summary>Provides query operations for retrieving contact information.</summary>
public sealed class ContactGetQueries : IContactGetQueries, IRepository
{
    private readonly ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetQueries"/> class.
    /// </summary>
    /// <param name="context">The context handler.</param>
    public ContactGetQueries(ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context)
    {
        this.context = context;
    }

    /// <summary>Retrieves a single contact matching the specification.</summary>
    /// <param name="specification">The specification criteria.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public async Task<Contact> Get(Specification<Contact> specification)
    {
        return await this.context.GetReadContext().Contacts.FirstOrDefaultAsync(specification.ConditionExpression) ?? null!;
    }
}
```

---

## Extensions

```csharp
// <copyright file="ContactGetExtensions.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.Get.Extensions;

using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Dtos.Contact.Get;

/// <summary>Extension methods for the ContactGet use case.</summary>
internal static class ContactGetExtensions
{
    /// <summary>Converts a <see cref="Contact"/> to a <see cref="ContactGetResponse"/>.</summary>
    /// <param name="contact">The entity to convert.</param>
    /// <returns>A new <see cref="ContactGetResponse"/>.</returns>
    internal static ContactGetResponse ToContactGetResponse(this Contact contact)
    {
        return new ContactGetResponse
        {
            Id = contact.Id,
            Name = contact.Name,
            Email = contact.Email,
        };
    }
}
```

---

## Endpoint registration

```csharp
group.MapEndpoint<GenericResponse<ContactGetResponse>>(
    HttpMethods.Get,
    "/{id}",
    async (int id, IController<ContactGetRequest, ContactGetResponse> controller) =>
    {
        var result = await controller.Handle(new ContactGetRequest { Id = id });
        return Results.Ok(result);
    },
    "GetContact",
    "Get contact endpoint",
    "This endpoint is for get a contact.");
```
