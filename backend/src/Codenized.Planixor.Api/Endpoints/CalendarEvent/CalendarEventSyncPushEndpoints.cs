// <copyright file="CalendarEventSyncPushEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.CalendarEvent;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Exceptions;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Core.Services.Security;
using Codenized.Planixor.Dtos.CalendarEvent.Sync;

/// <summary>Register calendar event sync push endpoints.</summary>
internal static class CalendarEventSyncPushEndpoints
{
    /// <summary>Map the calendar event sync push endpoint.</summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>A route group builder.</returns>
    public static RouteGroupBuilder MapCalendarEventSyncPushEndpoint(this RouteGroupBuilder group)
    {
        group.MapEndpoint<GenericResponse<CalendarEventSyncPushResponse>>(
            HttpMethods.Post,
            "/push",
            async (CalendarEventSyncPushRequest request, ISecurityService securityService, IController<CalendarEventSyncPushRequest, CalendarEventSyncPushResponse> controller) =>
            {
                request.UserId = securityService.GetAuthenticatedUsername()
                    ?? throw new UnauthorizedException("AUTH_USER_NOT_FOUND", "Authenticated user not found", "The authenticated username could not be resolved from the security service.");
                GenericResponse<CalendarEventSyncPushResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PushCalendarEvents",
            "Push calendar events sync endpoint",
            "This endpoint receives a batch of calendar event records from the client and upserts them with conflict resolution.");

        return group;
    }
}
