// <copyright file="TooLowMinutesInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for too-low minutes input.</summary>
/// <param name="TotalMinutes">A value less than 1.</param>
public record TooLowMinutesInput(int TotalMinutes);
