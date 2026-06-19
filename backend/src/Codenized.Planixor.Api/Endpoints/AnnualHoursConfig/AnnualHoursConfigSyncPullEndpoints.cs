// <copyright file="AnnualHoursConfigSyncPullEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.AnnualHoursConfig;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

/// <summary>Register annual hours config sync pull endpoints.</summary>
internal static class AnnualHoursConfigSyncPullEndpoints
{
    /// <summary>Map the annual hours config sync pull endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapAnnualHoursConfigSyncPullEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<AnnualHoursConfigSyncPullResponse>>(
            HttpMethods.Get,
            "/pull",
            async (DateTime? lastSyncedAt, string? cursor, IController<AnnualHoursConfigSyncPullRequest, AnnualHoursConfigSyncPullResponse> controller) =>
            {
                // TODO: Extract UserId from authenticated user claims
                // TODO: Enforce active subscription check (403 ForbiddenException if no active subscription)
                var request = new AnnualHoursConfigSyncPullRequest(Guid.Empty, lastSyncedAt, cursor);
                GenericResponse<AnnualHoursConfigSyncPullResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PullAnnualHoursConfig",
            "Pull annual hours config sync endpoint",
            "This endpoint returns annual hours config records modified after the given timestamp for the authenticated user with cursor-based pagination.");

        return group;
    }
}
