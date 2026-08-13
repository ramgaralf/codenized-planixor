// <copyright file="DomainExceptionHandler.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Services.Exceptions;

using System.Diagnostics;
using Codenized.CleanArchitecture.Abstractions.Exceptions.Interfaces;
using Codenized.CleanArchitecture.Abstractions.Exceptions.Models;
using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Maps <see cref="DomainException"/>, raised by Value Objects and entities when a domain invariant is
/// violated, to a 400 response. Discovered automatically by <c>AddGlobalExceptionStrategy("Codenized")</c>,
/// since this assembly's name starts with the configured prefix.
/// </summary>
public sealed class DomainExceptionHandler : IExceptionHandler<DomainException>
{
    /// <summary>
    /// Converts the exception into problem details.
    /// </summary>
    /// <param name="exception">The domain exception to handle.</param>
    /// <returns>A problem details describing the violated invariant.</returns>
    public Task<ProblemDetails> Handle(DomainException exception)
    {
        var problemDetails = new ProblemDetails
        {
            Status = 400,
            Type = "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.1",
            Code = "DOMAIN_RULE_VIOLATION",
            Title = "Domain rule violation",
            Detail = exception.Message,
            TraceId = $"{Activity.Current?.TraceId.ToHexString() ?? string.Empty}::{Activity.Current?.SpanId.ToHexString() ?? string.Empty}",
        };

        return Task.FromResult(problemDetails);
    }
}
