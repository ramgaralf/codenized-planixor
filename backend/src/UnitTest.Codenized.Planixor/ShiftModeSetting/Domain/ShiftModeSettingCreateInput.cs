// <copyright file="ShiftModeSettingCreateInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.ShiftModeSetting.Domain;

using global::Codenized.Planixor.Core.Entities;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Shift mode setting create input, used by <see cref="ShiftModeSettingTests"/>.</summary>
public record ShiftModeSettingCreateInput(
    Guid Id,
    string UserId);
