// <copyright file="RegisterEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints;

using Codenized.HealthChecks.AspNetCore;
using Codenized.Planixor.Api.Endpoints.Shift;

/// <summary>Register endpoints.</summary>
internal static class RegisterEndpoints
{
    /// <summary>Use application endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="configuration">Configuration.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder UseAppEndpoints(
        this IEndpointRouteBuilder app,
        IConfiguration configuration,
        string apiBasePath)
    {
        app.MapHealthChecksEndpoint(configuration, apiBasePath);
        app.MapShiftEndpoints(apiBasePath);
        return app;
    }
}
