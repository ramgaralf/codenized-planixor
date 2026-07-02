// <copyright file="ReminderSyncPullEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.Reminder;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.CleanArchitecture.Exception.Abstractions.Unauthorized;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Planixor.Dtos.Reminder.Sync;

/// <summary>Register reminder sync pull endpoints.</summary>
internal static class ReminderSyncPullEndpoints
{
    /// <summary>Map the reminder sync pull endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapReminderSyncPullEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<ReminderSyncPullResponse>>(
            HttpMethods.Get,
            "/pull",
            async (DateTime? lastSyncedAt, string? cursor, IController<ReminderSyncPullRequest, ReminderSyncPullResponse> controller, ISecurityService securityService) =>
            {
                string userId = securityService.GetAuthenticatedUsername()
                    ?? throw new UnauthorizedException("AUTH_USER_NOT_FOUND", "Authenticated user not found", "The authenticated username could not be resolved from the security service.");
                var request = new ReminderSyncPullRequest(userId, lastSyncedAt, cursor);
                GenericResponse<ReminderSyncPullResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PullReminders",
            "Pull reminders sync endpoint",
            "This endpoint returns reminders modified after the given timestamp for the authenticated user with cursor-based pagination.");

        return group;
    }
}
