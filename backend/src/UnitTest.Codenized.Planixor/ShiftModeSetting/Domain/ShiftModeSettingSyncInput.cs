// <copyright file="ShiftModeSettingSyncInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.ShiftModeSetting.Domain;

using global::Codenized.Planixor.Core.Entities;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Input record for shift mode setting sync property tests.
/// </summary>
public record ShiftModeSettingSyncInput(
    bool Enabled,
    DateTime ModifiedAt,
    bool IsDeleted);
