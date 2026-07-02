// <copyright file="ReminderSyncPushEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.Reminder;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.CleanArchitecture.Exception.Abstractions.Unauthorized;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Core.Services.Security;
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
            async (ReminderSyncPushRequest request, IController<ReminderSyncPushRequest, ReminderSyncPushResponse> controller, ISecurityService securityService) =>
            {
                request.UserId = securityService.GetAuthenticatedUsername()
                    ?? throw new UnauthorizedException("AUTH_USER_NOT_FOUND", "Authenticated user not found", "The authenticated username could not be resolved from the security service.");
                GenericResponse<ReminderSyncPushResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PushReminders",
            "Push reminders sync endpoint",
            "This endpoint receives a batch of reminder records from the client and upserts them with conflict resolution.");

        return group;
    }
}
