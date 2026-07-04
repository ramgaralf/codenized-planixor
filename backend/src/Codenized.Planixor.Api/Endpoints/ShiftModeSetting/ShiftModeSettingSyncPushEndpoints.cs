// <copyright file="ShiftModeSettingSyncPushEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.ShiftModeSetting;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.CleanArchitecture.Exception.Abstractions.Unauthorized;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Planixor.Dtos.ShiftModeSetting.Sync;

/// <summary>Register shift mode setting sync push endpoints.</summary>
internal static class ShiftModeSettingSyncPushEndpoints
{
    /// <summary>Map the shift mode setting sync push endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapShiftModeSettingSyncPushEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<ShiftModeSettingSyncPushResponse>>(
            HttpMethods.Post,
            "/push",
            async (ShiftModeSettingSyncPushRequest request, ISecurityService securityService, IController<ShiftModeSettingSyncPushRequest, ShiftModeSettingSyncPushResponse> controller) =>
            {
                request.UserId = securityService.GetAuthenticatedUsername()
                    ?? throw new UnauthorizedException("AUTH_USER_NOT_FOUND", "Authenticated user not found", "The authenticated username could not be resolved from the security service.");
                GenericResponse<ShiftModeSettingSyncPushResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PushShiftModeSettings",
            "Push shift mode settings sync endpoint",
            "This endpoint receives a batch of shift mode setting records from the client and upserts them with conflict resolution.");

        return group;
    }
}
