// <copyright file="ValidCreateRangeInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for valid Create range input (0–1440).</summary>
/// <param name="TotalMinutes">A valid total minutes value in [0, 1440].</param>
public record ValidCreateRangeInput(int TotalMinutes);
