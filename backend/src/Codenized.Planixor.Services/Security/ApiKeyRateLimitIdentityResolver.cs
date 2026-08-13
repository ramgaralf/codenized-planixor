// <copyright file="ApiKeyRateLimitIdentityResolver.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Services.Security;

using Codenized.CleanArchitecture.Abstractions.AppServices;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Security.RateLimit.Abstractions;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Tells the rate limiter which configured user a request belongs to, by the API key it presents.
/// </summary>
/// <remarks>
/// The limiter runs before authentication, so this cannot read <see cref="HttpContext.User"/> — nothing has populated
/// it yet. Parsing the scheme's own header here is what keeps that knowledge in the product, where the scheme is
/// defined, rather than in the rate limit package.
/// <para>
/// Registered as a singleton through the marker interface, because the limiter classifies requests from outside any
/// request scope. <see cref="ApiKeyDirectory"/> is a singleton for the same reason.
/// </para>
/// </remarks>
public sealed class ApiKeyRateLimitIdentityResolver : IRateLimitIdentityResolver, IAppServiceSingleton
{
    private const string BearerPrefix = "Bearer ";

    private readonly IApiKeyDirectory directory;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApiKeyRateLimitIdentityResolver"/> class.
    /// </summary>
    /// <param name="directory">The API key to username lookup.</param>
    public ApiKeyRateLimitIdentityResolver(IApiKeyDirectory directory)
    {
        ArgumentNullException.ThrowIfNull(directory);

        this.directory = directory;
    }

    /// <inheritdoc/>
    public bool TryResolveIdentity(HttpContext context, out string identity)
    {
        ArgumentNullException.ThrowIfNull(context);

        string authorization = context.Request.Headers.Authorization.FirstOrDefault() ?? string.Empty;

        string apiKey = authorization.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase)
            ? authorization[BearerPrefix.Length..].Trim()
            : string.Empty;

        return this.directory.TryResolveUser(apiKey, out identity);
    }
}
