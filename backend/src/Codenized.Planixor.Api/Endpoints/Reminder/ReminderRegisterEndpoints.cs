// <copyright file="ReminderRegisterEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.Reminder;

/// <summary>Register reminder-related endpoints.</summary>
internal static class ReminderRegisterEndpoints
{
    /// <summary>Map reminder sync endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder MapReminderEndpoints(
        this IEndpointRouteBuilder app,
        string apiBasePath)
    {
        RouteGroupBuilder group = app
            .MapGroup($"{apiBasePath}/reminders/sync")
            .WithTags("Reminders")
            .RequireAuthorization();

        group.MapReminderSyncPushEndpoint();
        group.MapReminderSyncPullEndpoint();

        return app;
    }
}
