// <copyright file="CalendarEventSyncPullEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.CalendarEvent;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Dtos.CalendarEvent.Sync;

/// <summary>Register calendar event sync pull endpoints.</summary>
internal static class CalendarEventSyncPullEndpoints
{
    /// <summary>Map the calendar event sync pull endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapCalendarEventSyncPullEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<CalendarEventSyncPullResponse>>(
            HttpMethods.Get,
            "/pull",
            async (DateTime? lastSyncedAt, string? cursor, IController<CalendarEventSyncPullRequest, CalendarEventSyncPullResponse> controller) =>
            {
                // TODO: Extract UserId from authenticated user claims
                // TODO: Enforce active subscription check (403 ForbiddenException if no active subscription)
                var request = new CalendarEventSyncPullRequest(Guid.Empty, lastSyncedAt, cursor);
                GenericResponse<CalendarEventSyncPullResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PullCalendarEvents",
            "Pull calendar events sync endpoint",
            "This endpoint returns calendar events modified after the given timestamp for the authenticated user with cursor-based pagination.");

        return group;
    }
}
