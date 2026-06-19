// <copyright file="AnnualHoursConfigSyncPushRequest.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

using System.Text.Json.Serialization;

/// <summary>
/// Request payload for pushing annual hours config records from client to API.
/// </summary>
/// <param name="Records">The list of annual hours config records to push.</param>
public record AnnualHoursConfigSyncPushRequest(List<AnnualHoursConfigSyncRecord> Records)
{
    /// <summary>
    /// Gets or sets the authenticated user identifier. Set by the endpoint from the auth context.
    /// </summary>
    [JsonIgnore]
    public Guid UserId { get; set; }
}
