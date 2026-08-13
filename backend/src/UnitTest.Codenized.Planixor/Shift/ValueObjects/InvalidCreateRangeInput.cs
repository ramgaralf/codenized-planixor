// <copyright file="InvalidCreateRangeInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for invalid Create range input (outside 0–1440).</summary>
/// <param name="TotalMinutes">An invalid total minutes value (negative or greater than 1440).</param>
public record InvalidCreateRangeInput(int TotalMinutes);
