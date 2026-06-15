// <copyright file="ReminderSyncPullResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Reminder.Sync;

/// <summary>
/// Response payload for pulling reminder records from API to client.
/// </summary>
/// <param name="Records">The list of reminder records returned.</param>
/// <param name="Cursor">The pagination cursor for the next page, or null if no more pages.</param>
/// <param name="HasMore">Whether more records are available beyond this page.</param>
public record ReminderSyncPullResponse(
    List<ReminderSyncRecord> Records,
    string? Cursor,
    bool HasMore);
