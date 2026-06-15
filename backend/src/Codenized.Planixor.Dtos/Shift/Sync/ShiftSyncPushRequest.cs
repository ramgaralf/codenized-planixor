// <copyright file="ShiftSyncPushRequest.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Shift.Sync;

using System.Text.Json.Serialization;

/// <summary>
/// Request payload for pushing shift records from client to API.
/// </summary>
/// <param name="Shifts">The list of shift records to push.</param>
public record ShiftSyncPushRequest(List<ShiftSyncItem> Shifts)
{
    /// <summary>
    /// Gets or sets the authenticated user identifier. Set by the endpoint from the auth context.
    /// </summary>
    [JsonIgnore]
    public Guid UserId { get; set; }
}
