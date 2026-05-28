---
inclusion: manual
---

# Use Case Sample: GETLIST

Reference implementation using `Contact` as the entity. Replace `Contact`/`contact` with the actual entity name.

**Characteristics**: GET `/` + query params, returns paginated list, has Queries + Specification + Extensions, no Events.
Request inherits `FilterModelRequest`. Response inherits `FilterModelResponse<TItem>`. Separate `ResponseItem` DTO.

---

## DTOs

### `ContactGetListRequest.cs`

```csharp
// <copyright file="ContactGetListRequest.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.GetList;

using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;

/// <summary>Contact get list request class.</summary>
public sealed class ContactGetListRequest : FilterModelRequest
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetListRequest"/> class.
    /// </summary>
    /// <param name="filter">Filter string.</param>
    /// <param name="sort">Sort string.</param>
    /// <param name="page">Page number.</param>
    /// <param name="size">Page size.</param>
    public ContactGetListRequest(string? filter, string? sort, int? page, int? size)
        : base(filter, sort, page ?? 0, size ?? 0)
    {
    }
}
```

### `ContactGetListRequestValidator.cs`

```csharp
// <copyright file="ContactGetListRequestValidator.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.GetList;

using {Organization}.CleanArchitecture.Abstractions.Validations;

/// <summary>Contact get list request validator class.</summary>
public sealed class ContactGetListRequestValidator : ValidatorBase<ContactGetListRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetListRequestValidator"/> class.
    /// </summary>
    /// <param name="service">Validation service.</param>
    public ContactGetListRequestValidator(IValidationService<ContactGetListRequest> service)
        : base(service)
    {
        this.AddRuleFor(p => p.PageNumber)
            .AddRequirement(p => p.PageNumber > 0, "The page number is invalid.");

        this.AddRuleFor(p => p.PageSize)
            .AddRequirement(p => p.PageSize > 0, "The page size is invalid.");
    }
}
```

### `ContactGetListResponse.cs`

```csharp
// <copyright file="ContactGetListResponse.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.GetList;

using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;

/// <summary>Contact get list response class.</summary>
public sealed class ContactGetListResponse : FilterModelResponse<ContactGetListResponseItem>
{
}
```

### `ContactGetListResponseItem.cs`

```csharp
// <copyright file="ContactGetListResponseItem.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Dtos.Contact.GetList;

/// <summary>Contact get list response item class.</summary>
public sealed class ContactGetListResponseItem
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
// <copyright file="ContactGetListService.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.GetList;

using Microsoft.Extensions.Logging;
using {Organization}.{Product}.Dtos.Contact.GetList;
using {Organization}.{Product}.UseCases.Contact.GetList.Extensions;
using {Organization}.{Product}.UseCases.Contact.GetList.Queries;
using {Organization}.{Product}.UseCases.Contact.GetList.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Interactors;

/// <summary>Contact get list service class.</summary>
public sealed class ContactGetListService : IInteractorService<ContactGetListRequest, ContactGetListResponse>
{
    private readonly ILogger<ContactGetListService> logger;
    private readonly IContactGetListQueries queries;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetListService"/> class.
    /// </summary>
    /// <param name="logger">Logger service.</param>
    /// <param name="queries">Use case queries.</param>
    public ContactGetListService(
        ILogger<ContactGetListService> logger,
        IContactGetListQueries queries)
    {
        this.logger = logger;
        this.queries = queries;
    }

    /// <summary>Run.</summary>
    /// <param name="request">Contact get list request.</param>
    /// <returns>A contact get list response.</returns>
    public async Task<ContactGetListResponse> Run(ContactGetListRequest request)
    {
        var contacts = await this.queries.GetList(
            request.Filters == null ? null! : new ContactGetListByFilterSpecification(request.Filters),
            request.Sorts,
            request.PageNumber,
            request.PageSize);

        var response = contacts.ToContactGetListResponse();
        this.logger.LogInformation(
            "Get list contact: {Count} items, {Total} total, page {Page}/{Pages}.",
            response.Source.Count,
            response.TotalRecords,
            response.PageNumber,
            response.TotalPages);
        return response;
    }
}
```

---

## Queries interface

```csharp
// <copyright file="IContactGetListQueries.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.GetList.Queries;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;

/// <summary>Defines queries for retrieving a paginated list of contacts.</summary>
public interface IContactGetListQueries
{
    /// <summary>Retrieves a paginated list of contacts.</summary>
    /// <param name="specification">Filter specification.</param>
    /// <param name="sorts">Sort filters.</param>
    /// <param name="pageNumber">Page number.</param>
    /// <param name="pageSize">Page size.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    Task<FilterModelResponse<Contact>> GetList(
        Specification<Contact> specification,
        List<SortFilter> sorts,
        int pageNumber,
        int pageSize);
}
```

---

## Specification

```csharp
// <copyright file="ContactGetListByFilterSpecification.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.GetList.Specifications;

using {Organization}.{Product}.Core.Entities;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;
using System;
using System.Linq.Expressions;

/// <summary>Specification for filtering contacts by dynamic expression.</summary>
public sealed class ContactGetListByFilterSpecification : Specification<Contact>
{
    private readonly List<ExpressionFilter> filters;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetListByFilterSpecification"/> class.
    /// </summary>
    /// <param name="filters">List of expression filters.</param>
    public ContactGetListByFilterSpecification(List<ExpressionFilter> filters)
    {
        this.filters = filters;
    }

    /// <summary>Gets the condition expression built from filters.</summary>
    public override Expression<Func<Contact, bool>> ConditionExpression =>
        ExpressionTools.GetGroupsPredicate<Contact>(this.filters);
}
```

---

## Queries implementation

```csharp
// <copyright file="ContactGetListQueries.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.Repositories.Contact.GetList;

using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Persistence.MySql.EntityFrameworkCore.DataContext;
using {Organization}.{Product}.UseCases.Contact.GetList.Queries;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Handler;
using {Organization}.CleanArchitecture.Persistence.Abstractions.Interfaces;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;

/// <summary>Provides query operations for retrieving a paginated list of contacts.</summary>
public sealed class ContactGetListQueries : IContactGetListQueries, IRepository
{
    private readonly ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetListQueries"/> class.
    /// </summary>
    /// <param name="context">The context handler.</param>
    public ContactGetListQueries(ContextHandler<ApplicationReadContext, ApplicationWriteContext, IApplicationContext> context)
    {
        this.context = context;
    }

    /// <summary>Retrieves a paginated list of contacts.</summary>
    /// <param name="specification">Filter specification.</param>
    /// <param name="sorts">Sort filters.</param>
    /// <param name="pageNumber">Page number.</param>
    /// <param name="pageSize">Page size.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public Task<FilterModelResponse<Contact>> GetList(
        Specification<Contact> specification,
        List<SortFilter> sorts,
        int pageNumber,
        int pageSize)
    {
        var query = this.context.GetReadContext().Contacts;
        var result = query.FilterAndOrderAndPagination(specification?.ConditionExpression ?? null!, sorts, pageNumber, pageSize);
        return Task.FromResult(result);
    }
}
```

---

## Extensions

```csharp
// <copyright file="ContactGetListExtensions.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.GetList.Extensions;

using {Organization}.{Product}.Core.Entities;
using {Organization}.{Product}.Dtos.Contact.GetList;
using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;

/// <summary>Extension methods for the ContactGetList use case.</summary>
internal static class ContactGetListExtensions
{
    /// <summary>Converts a <see cref="FilterModelResponse{Contact}"/> to a <see cref="ContactGetListResponse"/>.</summary>
    /// <param name="contacts">The paginated contacts result.</param>
    /// <returns>A new <see cref="ContactGetListResponse"/>.</returns>
    internal static ContactGetListResponse ToContactGetListResponse(this FilterModelResponse<Contact> contacts)
    {
        return new ContactGetListResponse
        {
            Source = contacts.Source.Select(contact => new ContactGetListResponseItem
            {
                Id = contact.Id,
                Name = contact.Name,
                Email = contact.Email,
            }).ToList(),
            NextPage = contacts.NextPage,
            PageNumber = contacts.PageNumber,
            PageSize = contacts.PageSize,
            PreviousPage = contacts.PreviousPage,
            TotalPages = contacts.TotalPages,
            TotalRecords = contacts.TotalRecords,
        };
    }
}
```

---

## Endpoint registration

```csharp
group.MapEndpoint<GenericResponse<ContactGetListResponse>>(
    HttpMethods.Get,
    "/",
    async (string? filter, string? sort, int? page, int? size,
           IController<ContactGetListRequest, ContactGetListResponse> controller) =>
    {
        var result = await controller.Handle(new ContactGetListRequest(filter, sort, page ?? 0, size ?? 0));
        return Results.Ok(result);
    },
    "GetContactList",
    "Get contact list endpoint",
    "This endpoint is for get a list of contacts.");
```
