// <copyright file="ShiftModeSettingSyncPushResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.ShiftModeSetting.Sync;

/// <summary>
/// Response payload for a shift mode setting sync push operation.
/// </summary>
/// <param name="ProcessedCount">The number of records successfully processed.</param>
public record ShiftModeSettingSyncPushResponse(int ProcessedCount);
