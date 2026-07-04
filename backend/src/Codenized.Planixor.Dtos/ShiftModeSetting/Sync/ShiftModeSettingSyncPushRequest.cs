// <copyright file="ShiftModeSettingSyncPushRequest.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.ShiftModeSetting.Sync;

using System.Text.Json.Serialization;

/// <summary>
/// Request payload for pushing shift mode setting records from client to API.
/// </summary>
/// <param name="Records">The list of shift mode setting records to push (max 1 item).</param>
public record ShiftModeSettingSyncPushRequest(List<ShiftModeSettingSyncRecord> Records)
{
    /// <summary>
    /// Gets or sets the authenticated user identifier. Set by the endpoint from the auth context.
    /// </summary>
    [JsonIgnore]
    public string UserId { get; set; } = string.Empty;
}
