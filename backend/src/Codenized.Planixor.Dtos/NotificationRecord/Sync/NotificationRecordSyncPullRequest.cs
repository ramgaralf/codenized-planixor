// <copyright file="NotificationRecordSyncPullRequest.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.NotificationRecord.Sync;

/// <summary>
/// Request parameters for pulling notification records from API to client.
/// </summary>
/// <param name="UserId">The authenticated user identifier.</param>
/// <param name="LastSyncedAt">The timestamp of the last sync (UTC), or null for initial sync.</param>
/// <param name="Cursor">The pagination cursor for subsequent pages, or null for the first page.</param>
public record NotificationRecordSyncPullRequest(Guid UserId, DateTime? LastSyncedAt, string? Cursor);
