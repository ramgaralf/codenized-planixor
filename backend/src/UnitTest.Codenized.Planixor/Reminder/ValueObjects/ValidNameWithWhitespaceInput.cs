// <copyright file="ValidNameWithWhitespaceInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for valid names with surrounding whitespace.</summary>
/// <param name="Value">The name string with leading/trailing whitespace.</param>
public record ValidNameWithWhitespaceInput(string Value);
