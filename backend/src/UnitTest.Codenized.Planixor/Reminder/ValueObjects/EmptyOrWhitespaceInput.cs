// <copyright file="EmptyOrWhitespaceInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for empty or whitespace-only inputs.</summary>
/// <param name="Value">The empty or whitespace-only string.</param>
public record EmptyOrWhitespaceInput(string Value);
