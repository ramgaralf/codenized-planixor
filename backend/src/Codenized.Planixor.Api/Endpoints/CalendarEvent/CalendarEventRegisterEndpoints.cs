// <copyright file="CalendarEventRegisterEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.CalendarEvent;

/// <summary>Register calendar event-related endpoints.</summary>
internal static class CalendarEventRegisterEndpoints
{
    /// <summary>Map calendar event sync endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder MapCalendarEventEndpoints(
        this IEndpointRouteBuilder app,
        string apiBasePath)
    {
        RouteGroupBuilder group = app
            .MapGroup($"{apiBasePath}/calendar-events/sync")
            .WithTags("CalendarEvents")
            .RequireAuthorization();

        group.MapCalendarEventSyncPushEndpoint();
        group.MapCalendarEventSyncPullEndpoint();

        return app;
    }
}
