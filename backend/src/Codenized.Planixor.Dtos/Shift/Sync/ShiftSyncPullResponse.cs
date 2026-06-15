// <copyright file="ShiftSyncPullResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Shift.Sync;

/// <summary>
/// Response payload for pulling shift records from API to client.
/// </summary>
/// <param name="Shifts">The list of shift records returned.</param>
/// <param name="Cursor">The pagination cursor for the next page, or null if no more pages.</param>
/// <param name="HasMore">Whether more records are available beyond this page.</param>
public record ShiftSyncPullResponse(
    List<ShiftSyncItem> Shifts,
    string? Cursor,
    bool HasMore);
