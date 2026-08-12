// <copyright file="ShiftCreateInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Domain;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Shift create input, used by <see cref="ShiftPropertyTests"/>.</summary>
public record ShiftCreateInput(
    Guid Id,
    string UserId,
    ShiftName Name,
    ShiftIcon Icon,
    ShiftColor BackgroundColor,
    ShiftTime StartTime,
    ShiftTime EndTime,
    HoursWorked HoursWorked,
    DateTime CreatedAt);
