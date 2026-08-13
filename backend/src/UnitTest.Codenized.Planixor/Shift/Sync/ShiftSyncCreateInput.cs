// <copyright file="ShiftSyncCreateInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Sync;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Input record for pull merge property tests with all shift fields.
/// </summary>
public record ShiftSyncCreateInput(
    Guid Id,
    string UserId,
    ShiftName Name,
    ShiftIcon Icon,
    ShiftColor BackgroundColor,
    ShiftTime StartTime,
    ShiftTime EndTime,
    HoursWorked HoursWorked,
    bool IsActive,
    DateTime CreatedAt,
    DateTime ModifiedAt,
    bool IsDeleted);
