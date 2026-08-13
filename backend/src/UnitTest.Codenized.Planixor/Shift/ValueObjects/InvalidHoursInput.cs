// <copyright file="InvalidHoursInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for invalid hours input.</summary>
/// <param name="Hours">The invalid hours value.</param>
/// <param name="Minutes">A valid minutes value.</param>
public record InvalidHoursInput(int Hours, int Minutes);
