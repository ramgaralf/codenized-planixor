// <copyright file="AnnualHoursConfigSyncPullResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.AnnualHoursConfig.Sync;

/// <summary>
/// Response payload for pulling annual hours config records from API to client.
/// </summary>
/// <param name="Records">The list of annual hours config records returned.</param>
/// <param name="NextCursor">The pagination cursor for the next page, or null if no more pages.</param>
public record AnnualHoursConfigSyncPullResponse(
    List<AnnualHoursConfigSyncRecord> Records,
    string? NextCursor);
