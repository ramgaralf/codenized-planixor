// <copyright file="WhitespaceOnlyString.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Shift.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for whitespace-only string inputs.</summary>
/// <param name="Value">The whitespace-only string.</param>
public record WhitespaceOnlyString(string Value);
