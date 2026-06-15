// <copyright file="ShiftSyncPushResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.Shift.Sync;

/// <summary>
/// Response payload for a successful shift sync push operation.
/// </summary>
/// <param name="SyncedCount">The number of shift records successfully persisted.</param>
public record ShiftSyncPushResponse(int SyncedCount);
