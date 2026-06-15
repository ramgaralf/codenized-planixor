// <copyright file="ReminderSyncPushResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Reminder.Sync;

/// <summary>
/// Response payload for a successful reminder sync push operation.
/// </summary>
/// <param name="SyncedCount">The number of reminder records successfully persisted.</param>
public record ReminderSyncPushResponse(int SyncedCount);
