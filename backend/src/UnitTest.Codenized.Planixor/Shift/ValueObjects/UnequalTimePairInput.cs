// <copyright file="UnequalTimePairInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for unequal time pair input.</summary>
/// <param name="StartMinutes">Start total minutes.</param>
/// <param name="EndMinutes">End total minutes (different from start).</param>
public record UnequalTimePairInput(int StartMinutes, int EndMinutes);
