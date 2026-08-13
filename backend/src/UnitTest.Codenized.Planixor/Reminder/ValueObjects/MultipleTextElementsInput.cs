// <copyright file="MultipleTextElementsInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;
using System.Globalization;

/// <summary>Wrapper for strings with multiple text elements.</summary>
/// <param name="Value">The multi-element string.</param>
public record MultipleTextElementsInput(string Value);
