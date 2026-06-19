// <copyright file="AnnualHoursConfigRegisterEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.AnnualHoursConfig;

/// <summary>Register annual hours config-related endpoints.</summary>
internal static class AnnualHoursConfigRegisterEndpoints
{
    /// <summary>Map annual hours config sync endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder MapAnnualHoursConfigEndpoints(
        this IEndpointRouteBuilder app,
        string apiBasePath)
    {
        RouteGroupBuilder group = app
            .MapGroup($"{apiBasePath}/annual-hours-config/sync")
            .WithTags("AnnualHoursConfig")
            .RequireAuthorization();

        group.MapAnnualHoursConfigSyncPushEndpoint();
        group.MapAnnualHoursConfigSyncPullEndpoint();

        return app;
    }
}
