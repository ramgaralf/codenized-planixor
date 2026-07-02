// <copyright file="ReminderIcon.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using System.Globalization;
using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents a validated reminder icon (single emoji character).
/// </summary>
public record ReminderIcon
{
    /// <summary>
    /// Gets the reminder icon value.
    /// </summary>
    public string Value { get; }

    private ReminderIcon(string value)
    {
        this.Value = value;
    }

    /// <summary>
    /// Creates a validated reminder icon.
    /// </summary>
    /// <param name="value">The emoji string.</param>
    /// <returns>A validated <see cref="ReminderIcon"/> instance.</returns>
    public static ReminderIcon Create(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            throw new DomainException("Reminder icon cannot be empty.");
        }

        StringInfo stringInfo = new StringInfo(value);

        if (stringInfo.LengthInTextElements != 1)
        {
            throw new DomainException("Reminder icon must be exactly one emoji character.");
        }

        return new ReminderIcon(value);
    }
}
