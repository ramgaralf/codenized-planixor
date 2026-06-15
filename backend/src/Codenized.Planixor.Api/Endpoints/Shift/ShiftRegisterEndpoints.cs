// <copyright file="ShiftRegisterEndpoints.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Api.Endpoints.Shift;

using Codenized.CleanArchitecture.Abstractions.Controllers;
using Codenized.CleanArchitecture.Abstractions.Presenters;
using Codenized.Exceptions.GlobalExceptionStrategy.Extensions;
using Codenized.Planixor.Dtos.Shift.Sync;

/// <summary>Register shift-related endpoints.</summary>
internal static class ShiftRegisterEndpoints
{
    /// <summary>Map shift sync endpoints.</summary>
    /// <param name="app">Endpoint route builder.</param>
    /// <param name="apiBasePath">API base path.</param>
    /// <returns>An endpoint route builder.</returns>
    public static IEndpointRouteBuilder MapShiftEndpoints(
        this IEndpointRouteBuilder app,
        string apiBasePath)
    {
        RouteGroupBuilder group = app
            .MapGroup($"{apiBasePath}/shifts/sync")
            .WithTags("Shifts")
            .RequireAuthorization();

        group.MapEndpoint<GenericResponse<ShiftSyncPushResponse>>(
            HttpMethods.Post,
            "/push",
            async (ShiftSyncPushRequest request, IController<ShiftSyncPushRequest, ShiftSyncPushResponse> controller) =>
            {
                // TODO: Extract UserId from authenticated user claims and assign to request.UserId
                // TODO: Enforce active subscription check (403 ForbiddenException if no active subscription)
                GenericResponse<ShiftSyncPushResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PushShifts",
            "Push shifts sync endpoint",
            "This endpoint receives a batch of shift records from the client and upserts them with conflict resolution.");

        group.MapEndpoint<GenericResponse<ShiftSyncPullResponse>>(
            HttpMethods.Get,
            "/pull",
            async (DateTime? lastSyncedAt, string? cursor, IController<ShiftSyncPullRequest, ShiftSyncPullResponse> controller) =>
            {
                // TODO: Extract UserId from authenticated user claims
                // TODO: Enforce active subscription check (403 ForbiddenException if no active subscription)
                var request = new ShiftSyncPullRequest(Guid.Empty, lastSyncedAt, cursor);
                GenericResponse<ShiftSyncPullResponse> result = await controller.Handle(request);
                return Results.Ok(result);
            },
            "PullShifts",
            "Pull shifts sync endpoint",
            "This endpoint returns shifts modified after the given timestamp for the authenticated user with cursor-based pagination.");

        return app;
    }
}
