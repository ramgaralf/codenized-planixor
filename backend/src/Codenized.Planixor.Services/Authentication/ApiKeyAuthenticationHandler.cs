// <copyright file="ApiKeyAuthenticationHandler.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Services.Authentication;

using System.Security.Claims;
using System.Text.Encodings.Web;
using Codenized.CleanArchitecture.Abstractions.Exceptions;
using Codenized.Planixor.Core.Services.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

/// <summary>
/// ASP.NET Core authentication handler that validates API keys provided via the Authorization header.
/// </summary>
public sealed class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly ISecurityService securityService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApiKeyAuthenticationHandler"/> class.
    /// </summary>
    /// <param name="options">The authentication scheme options monitor.</param>
    /// <param name="logger">The logger factory.</param>
    /// <param name="encoder">The URL encoder.</param>
    /// <param name="securityService">The security service for API key validation.</param>
    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISecurityService securityService)
        : base(options, logger, encoder)
    {
        this.securityService = securityService;
    }

    /// <summary>
    /// Handles authentication by extracting and validating the API key from the Authorization header.
    /// </summary>
    /// <returns>An <see cref="AuthenticateResult"/> indicating success or failure.</returns>
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? authHeader = this.Request.Headers["Authorization"].FirstOrDefault();

        if (string.IsNullOrEmpty(authHeader))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid authorization format. The Authorization header must use the 'Bearer <key>' scheme."));
        }

        string apiKey = authHeader.Substring("Bearer ".Length).Trim();

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return Task.FromResult(AuthenticateResult.Fail("Authorization token is empty."));
        }

        if (!this.securityService.ValidateAPIKey(apiKey))
        {
            throw new ForbiddenException(
                "AUTH_INVALID_KEY",
                "API key not authorized",
                "The provided API key is not authorized. Verify your API key is correctly configured.");
        }

        string username = this.securityService.GetAuthenticatedUsername()!;
        var claims = new[] { new Claim(ClaimTypes.Name, username) };
        var identity = new ClaimsIdentity(claims, this.Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, this.Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    /// <summary>
    /// Handles authentication challenges when the endpoint requires auth but no valid credentials were provided.
    /// </summary>
    /// <param name="properties">The authentication properties.</param>
    /// <returns>A completed task.</returns>
    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        throw new UnauthorizedException(
            "AUTH_REQUIRED",
            "Authentication required",
            "Provide a valid API key using the 'Authorization: Bearer <key>' header.");
    }

    /// <summary>
    /// Handles forbidden responses when the user is authenticated but not authorized.
    /// </summary>
    /// <param name="properties">The authentication properties.</param>
    /// <returns>A completed task.</returns>
    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        throw new ForbiddenException(
            "AUTH_FORBIDDEN",
            "Access forbidden",
            "You do not have permission to access this resource.");
    }
}
