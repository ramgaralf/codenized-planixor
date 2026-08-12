// <copyright file="ReminderCreateInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Domain;

using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>Reminder create input, used by <see cref="ReminderPropertyTests"/>.</summary>
public record ReminderCreateInput(
    Guid Id,
    string UserId,
    ReminderName Name,
    ReminderIcon Icon,
    ReminderColor BackgroundColor,
    DateTime CreatedAt);
