// <copyright file="ValidTimeInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for valid time input.</summary>
/// <param name="Hours">Valid hours (0–23).</param>
/// <param name="Minutes">Valid minutes (0–59).</param>
public record ValidTimeInput(int Hours, int Minutes);
