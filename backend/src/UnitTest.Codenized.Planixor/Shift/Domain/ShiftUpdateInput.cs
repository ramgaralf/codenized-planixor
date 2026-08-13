// <copyright file="ShiftUpdateInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Domain;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Input record for shift update property tests.
/// </summary>
public record ShiftUpdateInput(
    ShiftName Name,
    ShiftIcon Icon,
    ShiftColor BackgroundColor,
    ShiftTime StartTime,
    ShiftTime EndTime,
    HoursWorked HoursWorked);
