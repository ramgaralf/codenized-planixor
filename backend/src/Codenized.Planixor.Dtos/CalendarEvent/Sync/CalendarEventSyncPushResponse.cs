// <copyright file="CalendarEventSyncPushResponse.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Dtos.CalendarEvent.Sync;

/// <summary>
/// Response payload for a calendar event sync push operation.
/// </summary>
/// <param name="AcknowledgedIds">The identifiers of records successfully persisted.</param>
/// <param name="RejectedIds">The records that were rejected with reasons.</param>
public record CalendarEventSyncPushResponse(
    List<Guid> AcknowledgedIds,
    List<RejectedRecord> RejectedIds);
