// <copyright file="SecurityRegisterEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.Security;

using Codenized.Planixor.Core.Services.Security;

/// <summary>Register security-related endpoints.</summary>
internal static class SecurityRegisterEndpoints
{
    /// <summary>Map security endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder MapSecurityEndpoints(
        this IEndpointRouteBuilder app,
        string apiBasePath)
    {
        RouteGroupBuilder group = app
            .MapGroup($"{apiBasePath}/security")
            .WithTags("Security")
            .RequireAuthorization();

        group.MapGet("/validate", (ISecurityService securityService) =>
        {
            string? username = securityService.GetAuthenticatedUsername();
            return Results.Ok(new { username });
        })
        .WithName("ValidateApiKey")
        .Produces<object>(StatusCodes.Status200OK);

        return app;
    }
}
