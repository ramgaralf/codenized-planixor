// <copyright file="LowercasePaletteColorInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.ValueObjects;

using global::Codenized.Planixor.Core.Exceptions;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Wrapper for lowercase palette color inputs.</summary>
/// <param name="Value">A lowercase color from the Predefined_Palette.</param>
public record LowercasePaletteColorInput(string Value);
