---
inclusion: manual
---

# Use Case Sample: GETLIST

Reference implementation using `Contact` as the entity. Replace `Contact`/`contact` with the actual entity name.

**Characteristics**: GET `/` + query params, returns paginated list, has Queries + Specification, no Events, **no Extensions**.
Request inherits `FilterModelRequest`. Response inherits `FilterModelResponse<TItem>`. Separate `ResponseItem` DTO.

## TIER 0 — Project to the response item *before* filtering

The repository **must** apply `.Select(...)` to the response item type first, and only then `.Filter(...)`, `.OrderBy(...)`
and `.Pagination(...)`. Never filter or sort an `IQueryable<{Entity}>`.

The reason is security, not style. Filters and sorts carry property names straight from the query string. Applied to
the entity, a caller can filter by **any mapped column** — including ones the API never returns — and read them back
as a boolean oracle, one character at a time:

```
?filter=(PasswordHash::sw::a)   → 0 results
?filter=(PasswordHash::sw::b)   → 1 result   ← the first character is 'b'
```

Applied to the projection, that column is not a property of the type, so it cannot be resolved at all and the request
is rejected with a 400. **What you do not project, nobody can filter by.**

EF Core composes `Select` → `Where` → `OrderBy` → `Skip/Take` into a single SQL statement, so projecting first costs
nothing: the filter still runs in the database, against the underlying columns, and the projection is never
materialised. A Value Object flattened in the projection (`c.Name.Value` → `Name`) is filtered correctly too.

Because the repository projects, it returns `FilterModelResponse<{Entity}{Action}ResponseItem>` directly and there is
no mapping step — the Extensions file this sample used to carry is gone.

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
    public ContactGetListRequestValidator()
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
    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetListResponse"/> class from a page of results.
    /// </summary>
    /// <param name="page">The page returned by the queries.</param>
    public ContactGetListResponse(FilterModelResponse<ContactGetListResponseItem> page)
        : base(page)
    {
    }
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
using {Organization}.{Product}.UseCases.Contact.GetList.Queries;
using {Organization}.{Product}.UseCases.Contact.GetList.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Interactors;
using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;

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
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A contact get list response.</returns>
    public async Task<ContactGetListResponse> Run(ContactGetListRequest request, CancellationToken cancellationToken)
    {
        // Filters and Sorts are never null: FilterModelRequest exposes empty collections when the caller sends none.
        FilterModelResponse<ContactGetListResponseItem> page = await this.queries.GetList(
            new ContactGetListByFilterSpecification(request.Filters),
            request.Sorts,
            request.PageNumber,
            request.PageSize,
            cancellationToken);

        var response = new ContactGetListResponse(page);
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

using {Organization}.{Product}.Dtos.Contact.GetList;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;

/// <summary>Defines queries for retrieving a paginated list of contacts.</summary>
public interface IContactGetListQueries
{
    /// <summary>Retrieves a paginated list of contacts.</summary>
    /// <param name="specification">Filter specification, expressed over the response item.</param>
    /// <param name="sorts">Sort filters.</param>
    /// <param name="pageNumber">Page number.</param>
    /// <param name="pageSize">Page size.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    Task<FilterModelResponse<ContactGetListResponseItem>> GetList(
        Specification<ContactGetListResponseItem> specification,
        List<SortFilter> sorts,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);
}
```

The specification and the returned page are both expressed over `ContactGetListResponseItem`, not over `Contact`.
That is what keeps filtering confined to the columns the API exposes — see the TIER 0 rule at the top.

---

## Specification

```csharp
// <copyright file="ContactGetListByFilterSpecification.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.UseCases.Contact.GetList.Specifications;

using {Organization}.{Product}.Dtos.Contact.GetList;
using {Organization}.CleanArchitecture.Abstractions.Specifications;
using {Organization}.CleanArchitecture.Abstractions.Specifications.Tools;
using System;
using System.Linq.Expressions;

/// <summary>Specification for filtering contacts by dynamic expression.</summary>
public sealed class ContactGetListByFilterSpecification : Specification<ContactGetListResponseItem>
{
    private readonly List<ExpressionFilter> filters;

    /// <summary>
    /// Initializes a new instance of the <see cref="ContactGetListByFilterSpecification"/> class.
    /// </summary>
    /// <param name="filters">List of expression filters. Empty means "no filter".</param>
    public ContactGetListByFilterSpecification(List<ExpressionFilter> filters)
    {
        this.filters = filters;
    }

    /// <summary>Gets the condition expression built from filters.</summary>
    /// <remarks>
    /// Built over the response item, never over the entity. With no filters this yields a match-all predicate, so
    /// the caller always gets a usable expression rather than a null that would be dropped downstream.
    /// </remarks>
    public override Expression<Func<ContactGetListResponseItem, bool>> ConditionExpression =>
        ExpressionTools.GetGroupsPredicate<ContactGetListResponseItem>(this.filters);
}
```

---

## Queries implementation

```csharp
// <copyright file="ContactGetListQueries.cs" company="{Organization}">
// Copyright (c) {Organization}. All rights reserved.
// </copyright>

namespace {Organization}.{Product}.Persistence.MySql.Efc.Repositories.Contact.GetList;

using Microsoft.EntityFrameworkCore;
using {Organization}.{Product}.Dtos.Contact.GetList;
using {Organization}.{Product}.Persistence.MySql.Efc.DataContext;
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
    /// <param name="specification">Filter specification, expressed over the response item.</param>
    /// <param name="sorts">Sort filters.</param>
    /// <param name="pageNumber">Page number.</param>
    /// <param name="pageSize">Page size.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public async Task<FilterModelResponse<ContactGetListResponseItem>> GetList(
        Specification<ContactGetListResponseItem> specification,
        List<SortFilter> sorts,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        // Project FIRST, then filter and order. See the TIER 0 rule at the top of this document: this is what makes
        // a column the response does not carry unreachable from the query string. EF Core folds all of this into a
        // single SQL statement, so the projection is never materialised.
        IQueryable<ContactGetListResponseItem> query = this.context.GetReadContext().Contacts
            .AsNoTracking()
            .Select(contact => new ContactGetListResponseItem
            {
                Id = contact.Id,
                Name = contact.Name,
                Email = contact.Email,
            })
            .Filter(specification.ConditionExpression)
            .OrderBy(sorts);

        int totalRecords = await query.CountAsync(cancellationToken);

        List<ContactGetListResponseItem> items = await query
            .Pagination(pageNumber, pageSize)
            .ToListAsync(cancellationToken);

        return FilterModelResponse<ContactGetListResponseItem>.Create(items, pageNumber, pageSize, totalRecords);
    }
}
```

The repository materialises the query, because it is the layer that owns the database context and can therefore
`await` with a cancellation token. The framework only shapes the `IQueryable`.

---

## Endpoint registration

```csharp
group.MapEndpoint<GenericResponse<ContactGetListResponse>>(
    HttpMethods.Get,
    "/",
    async (string? filter, string? sort, int? page, int? size,
           IController<ContactGetListRequest, ContactGetListResponse> controller, CancellationToken cancellationToken) =>
    {
        var result = await controller.Handle(new ContactGetListRequest(filter, sort, page ?? 0, size ?? 0), cancellationToken);
        return Results.Ok(result);
    },
    "GetContactList",
    "Get contact list endpoint",
    "This endpoint is for get a list of contacts.");
```

---

## Query string grammar

`filter` and `sort` are parsed by `QueryStringFilterHelper` and `QueryStringSortHelper`. Property names are matched
against the **response item**, ignoring case; anything they do not expose is rejected with a 400.

### `sort`

```
[Property::direction]           direction is asc or desc
[Name::asc][CreatedAt::desc]    applied in order: ORDER BY Name, CreatedAt DESC
```

### `filter`

```
(Property::operator::value)                         one term
(Name::co::ada[and][Age::gte::18])                  terms joined inside a group
(Name::co::ada)or(City::eq::Madrid)                 groups joined between them
```

| Operator | Meaning | Operator | Meaning |
|---|---|---|---|
| `eq` | equals | `co` | contains |
| `neq` | not equals | `nco` | does not contain |
| `gt` | greater than | `sw` | starts with |
| `gte` | greater than or equal | `ew` | ends with |
| `lt` | less than | `in` | is one of |
| `lte` | less than or equal | `nin` | is none of |

- Several values for `in`, `nin` and collection `co` are separated by `,,` — `(Status::in::Active,,Pending)`.
- The literal `null` matches a missing value on a nullable property — `(DeletedAt::eq::null)`. On a property that
  cannot be null it is rejected.
- Values are parsed with the invariant culture, so `1.5` means one and a half on every host.
- At most **32** filter terms and **16** orderings per request.

Anything malformed — an unknown operator, a bad value, a term that parses to nothing — returns **400** with the
offending parameter named in `invalid-params`. An expression that yields no usable term is rejected rather than
treated as "no filter", so a caller never believes they filtered while receiving every row.
