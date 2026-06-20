// <copyright file="NotificationRecordRegisterEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.NotificationRecord;

/// <summary>Register notification record-related endpoints.</summary>
internal static class NotificationRecordRegisterEndpoints
{
    /// <summary>Map notification record sync endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder MapNotificationRecordEndpoints(
        this IEndpointRouteBuilder app,
        string apiBasePath)
    {
        RouteGroupBuilder group = app
            .MapGroup($"{apiBasePath}/notification-records/sync")
            .WithTags("NotificationRecords")
            .RequireAuthorization();

        group.MapNotificationRecordSyncPullEndpoint();

        return app;
    }
}
