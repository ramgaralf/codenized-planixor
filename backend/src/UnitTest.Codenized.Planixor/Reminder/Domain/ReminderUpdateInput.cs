// <copyright file="ReminderUpdateInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Domain;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Input record for reminder update property tests.
/// </summary>
public record ReminderUpdateInput(
    ReminderName Name,
    ReminderIcon Icon,
    ReminderColor BackgroundColor);
