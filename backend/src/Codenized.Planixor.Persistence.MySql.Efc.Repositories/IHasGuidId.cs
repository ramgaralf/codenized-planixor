// <copyright file="IHasGuidId.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories;

using System.Linq.Expressions;

/// <summary>Names the <c>Id</c> property the predicate is built over, so it survives a rename.</summary>
internal interface IHasGuidId
{
    /// <summary>Gets the identifier.</summary>
    Guid Id { get; }
}
