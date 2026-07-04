// <copyright file="ShiftModeSettingRegisterEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.ShiftModeSetting;

/// <summary>Register shift mode setting-related endpoints.</summary>
internal static class ShiftModeSettingRegisterEndpoints
{
    /// <summary>Map shift mode setting sync endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder MapShiftModeSettingEndpoints(
        this IEndpointRouteBuilder app,
        string apiBasePath)
    {
        RouteGroupBuilder group = app
            .MapGroup($"{apiBasePath}/shift-mode-settings/sync")
            .WithTags("ShiftModeSettings")
            .RequireAuthorization();

        group.MapShiftModeSettingSyncPushEndpoint();
        group.MapShiftModeSettingSyncPullEndpoint();

        return app;
    }
}
