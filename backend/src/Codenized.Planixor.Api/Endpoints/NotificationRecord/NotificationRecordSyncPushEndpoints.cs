// <copyright file="NotificationRecordSyncPushEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.NotificationRecord;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
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
            async (NotificationRecordSyncPushRequest request, IController<NotificationRecordSyncPushRequest, NotificationRecordSyncPushResponse> controller) =>
            {
                // TODO: Extract UserId from authenticated user claims and assign to request.UserId
                // TODO: Enforce active subscription check (403 ForbiddenException if no active subscription)
                GenericResponse<NotificationRecordSyncPushResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PushNotificationRecords",
            "Push notification records sync endpoint",
            "This endpoint receives a batch of notification records from the client and upserts them with conflict resolution.");

        return group;
    }
}
