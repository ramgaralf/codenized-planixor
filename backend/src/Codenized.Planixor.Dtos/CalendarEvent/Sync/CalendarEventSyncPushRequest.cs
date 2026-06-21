// <copyright file="CalendarEventSyncPushRequest.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.CalendarEvent.Sync;

using System.Text.Json.Serialization;

/// <summary>
/// Request payload for pushing calendar event records from client to API.
/// </summary>
/// <param name="Records">The list of calendar event records to push.</param>
public record CalendarEventSyncPushRequest(List<CalendarEventSyncRecord> Records)
{
    /// <summary>
    /// Gets or sets the authenticated user identifier. Set by the endpoint from the auth context.
    /// </summary>
    [JsonIgnore]
    public string UserId { get; set; } = string.Empty;
}
