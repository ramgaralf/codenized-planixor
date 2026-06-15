// <copyright file="ReminderSyncPushEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.Reminder;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Dtos.Reminder.Sync;

/// <summary>Register reminder sync push endpoints.</summary>
internal static class ReminderSyncPushEndpoints
{
    /// <summary>Map the reminder sync push endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapReminderSyncPushEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<ReminderSyncPushResponse>>(
            HttpMethods.Post,
            "/push",
            async (ReminderSyncPushRequest request, IController<ReminderSyncPushRequest, ReminderSyncPushResponse> controller) =>
            {
                // TODO: Extract UserId from authenticated user claims and assign to request.UserId
                // TODO: Enforce active subscription check (403 ForbiddenException if no active subscription)
                GenericResponse<ReminderSyncPushResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PushReminders",
            "Push reminders sync endpoint",
            "This endpoint receives a batch of reminder records from the client and upserts them with conflict resolution.");

        return group;
    }
}
