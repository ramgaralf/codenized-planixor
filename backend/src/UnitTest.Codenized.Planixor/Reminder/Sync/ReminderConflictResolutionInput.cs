// <copyright file="ReminderConflictResolutionInput.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace UnitTest.Codenized.Planixor.Reminder.Sync;

using global::Codenized.CleanArchitecture.Exceptions.Abstractions.BadRequest;
using global::Codenized.Planixor.Core.Entities;
using global::Codenized.Planixor.Core.ValueObjects;
using global::Codenized.Planixor.Dtos.Reminder.Sync;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull.Queries;
using global::Codenized.Planixor.UseCases.Reminder.SyncPull;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush.Commands;
using global::Codenized.Planixor.UseCases.Reminder.SyncPush;
using FsCheck.Fluent;
using FsCheck.NUnit;
using FsCheck;
using NUnit.Framework;

/// <summary>
/// Input record for conflict resolution property tests.
/// </summary>
public record ReminderConflictResolutionInput(DateTime LocalModifiedAt, DateTime RemoteModifiedAt);
