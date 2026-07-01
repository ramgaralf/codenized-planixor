// <copyright file="NotificationRecordSyncPullEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.NotificationRecord;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.CleanArchitecture.Exception.Abstractions.Unauthorized;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Planixor.Dtos.NotificationRecord.Sync;

/// <summary>Register notification record sync pull endpoints.</summary>
internal static class NotificationRecordSyncPullEndpoints
{
    /// <summary>Map the notification record sync pull endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapNotificationRecordSyncPullEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<NotificationRecordSyncPullResponse>>(
            HttpMethods.Get,
            "/pull",
            async (DateTime? lastSyncedAt, string? cursor, ISecurityService securityService, IController<NotificationRecordSyncPullRequest, NotificationRecordSyncPullResponse> controller) =>
            {
                string userId = securityService.GetAuthenticatedUsername()
                    ?? throw new UnauthorizedException("AUTH_USER_NOT_FOUND", "Authenticated user not found", "The authenticated username could not be resolved from the security service.");
                var request = new NotificationRecordSyncPullRequest(userId, lastSyncedAt, cursor);
                GenericResponse<NotificationRecordSyncPullResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PullNotificationRecords",
            "Pull notification records sync endpoint",
            "This endpoint returns notification records modified after the given timestamp for the authenticated user with cursor-based pagination.");

        return group;
    }
}
