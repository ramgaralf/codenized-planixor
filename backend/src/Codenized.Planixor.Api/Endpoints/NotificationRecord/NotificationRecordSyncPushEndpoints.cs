// <copyright file="NotificationRecordSyncPushEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.NotificationRecord;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.CleanArchitecture.Exception.Abstractions.Unauthorized;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Planixor.Dtos.NotificationRecord.Sync;

/// <summary>Register notification record sync push endpoints.</summary>
internal static class NotificationRecordSyncPushEndpoints
{
    /// <summary>Map the notification record sync push endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapNotificationRecordSyncPushEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<NotificationRecordSyncPushResponse>>(
            HttpMethods.Post,
            "/push",
            async (NotificationRecordSyncPushRequest request, ISecurityService securityService, IController<NotificationRecordSyncPushRequest, NotificationRecordSyncPushResponse> controller) =>
            {
                request.UserId = securityService.GetAuthenticatedUsername()
                    ?? throw new UnauthorizedException("AUTH_USER_NOT_FOUND", "Authenticated user not found", "The authenticated username could not be resolved from the security service.");
                GenericResponse<NotificationRecordSyncPushResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PushNotificationRecords",
            "Push notification records sync endpoint",
            "This endpoint receives a batch of notification records from the client and upserts them with conflict resolution.");

        return group;
    }
}
