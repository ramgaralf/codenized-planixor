// <copyright file="AnnualHoursConfigSyncPullEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.AnnualHoursConfig;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Exceptions;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Core.Services.Security;
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
            async (DateTime? lastSyncedAt, string? cursor, ISecurityService securityService, IController<AnnualHoursConfigSyncPullRequest, AnnualHoursConfigSyncPullResponse> controller) =>
            {
                string userId = securityService.GetAuthenticatedUsername()
                    ?? throw new UnauthorizedException("AUTH_USER_NOT_FOUND", "Authenticated user not found", "The authenticated username could not be resolved from the security service.");

                var request = new AnnualHoursConfigSyncPullRequest(userId, lastSyncedAt, cursor);
                GenericResponse<AnnualHoursConfigSyncPullResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PullAnnualHoursConfig",
            "Pull annual hours config sync endpoint",
            "This endpoint returns annual hours config records modified after the given timestamp for the authenticated user with cursor-based pagination.");

        return group;
    }
}
