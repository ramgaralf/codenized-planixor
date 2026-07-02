// <copyright file="DomainException.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Exception thrown when a domain invariant is violated.
/// </summary>
public sealed class DomainException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="DomainException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public DomainException(string message)
        : base(message)
    {
    }
}
