// <copyright file="AnnualHoursConfigSyncPushEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.AnnualHoursConfig;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

/// <summary>Register annual hours config sync push endpoints.</summary>
internal static class AnnualHoursConfigSyncPushEndpoints
{
    /// <summary>Map the annual hours config sync push endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapAnnualHoursConfigSyncPushEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<AnnualHoursConfigSyncPushResponse>>(
            HttpMethods.Post,
            "/push",
            async (AnnualHoursConfigSyncPushRequest request, IController<AnnualHoursConfigSyncPushRequest, AnnualHoursConfigSyncPushResponse> controller) =>
            {
                // TODO: Extract UserId from authenticated user claims and assign to request.UserId
                // TODO: Enforce active subscription check (403 ForbiddenException if no active subscription)
                GenericResponse<AnnualHoursConfigSyncPushResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PushAnnualHoursConfig",
            "Push annual hours config sync endpoint",
            "This endpoint receives a batch of annual hours config records from the client and upserts them with conflict resolution.");

        return group;
    }
}
