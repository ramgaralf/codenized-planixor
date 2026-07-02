// <copyright file="NotificationRecordSyncPushRequest.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.NotificationRecord.Sync;

using System.Text.Json.Serialization;

/// <summary>
/// Request payload for pushing notification records from client to API.
/// </summary>
/// <param name="Records">The list of notification records to push.</param>
public record NotificationRecordSyncPushRequest(List<NotificationRecordSyncRecord> Records)
{
    /// <summary>
    /// Gets or sets the authenticated user identifier. Set by the endpoint from the auth context.
    /// </summary>
    [JsonIgnore]
    public string UserId { get; set; } = string.Empty;
}
