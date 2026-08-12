// <copyright file="ShiftSyncStateInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.Sync;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Shift sync state input, used by <see cref="ShiftSyncPropertyTests"/>.</summary>
public record ShiftSyncStateInput(DateTime ModifiedAt, DateTime? SyncedAt);
