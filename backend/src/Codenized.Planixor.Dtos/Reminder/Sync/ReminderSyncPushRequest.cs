// <copyright file="ReminderSyncPushRequest.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Reminder.Sync;

using System.Text.Json.Serialization;

/// <summary>
/// Request payload for pushing reminder records from client to API.
/// </summary>
/// <param name="Records">The list of reminder records to push.</param>
public record ReminderSyncPushRequest(List<ReminderSyncRecord> Records)
{
    /// <summary>
    /// Gets or sets the authenticated user identifier. Set by the endpoint from the auth context.
    /// </summary>
    [JsonIgnore]
    public Guid UserId { get; set; }
}
