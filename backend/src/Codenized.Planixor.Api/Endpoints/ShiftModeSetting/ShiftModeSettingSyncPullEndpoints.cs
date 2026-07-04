// <copyright file="ShiftModeSettingSyncPullEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.ShiftModeSetting;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.CleanArchitecture.Exception.Abstractions.Unauthorized;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Planixor.Dtos.ShiftModeSetting.Sync;

/// <summary>Register shift mode setting sync pull endpoints.</summary>
internal static class ShiftModeSettingSyncPullEndpoints
{
    /// <summary>Map the shift mode setting sync pull endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapShiftModeSettingSyncPullEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<ShiftModeSettingSyncPullResponse>>(
            HttpMethods.Get,
            "/pull",
            async (DateTime? lastSyncedAt, string? cursor, ISecurityService securityService, IController<ShiftModeSettingSyncPullRequest, ShiftModeSettingSyncPullResponse> controller) =>
            {
                string userId = securityService.GetAuthenticatedUsername()
                    ?? throw new UnauthorizedException("AUTH_USER_NOT_FOUND", "Authenticated user not found", "The authenticated username could not be resolved from the security service.");
                var request = new ShiftModeSettingSyncPullRequest(userId, lastSyncedAt, cursor);
                GenericResponse<ShiftModeSettingSyncPullResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PullShiftModeSettings",
            "Pull shift mode settings sync endpoint",
            "This endpoint returns shift mode settings modified after the given timestamp for the authenticated user with cursor-based pagination.");

        return group;
    }
}
