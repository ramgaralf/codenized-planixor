// <copyright file="ReminderName.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents a validated reminder name.
/// </summary>
public record ReminderName
{
    /// <summary>
    /// Gets the reminder name value.
    /// </summary>
    public string Value { get; }

    private ReminderName(string value)
    {
        this.Value = value;
    }

    /// <summary>
    /// Creates a validated reminder name.
    /// </summary>
    /// <param name="value">The reminder name string.</param>
    /// <returns>A validated <see cref="ReminderName"/> instance.</returns>
    public static ReminderName Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DomainException("Reminder name cannot be empty or whitespace-only.");
        }

        string trimmed = value.Trim();

        if (trimmed.Length > 50)
        {
            throw new DomainException("Reminder name must be 50 characters or less.");
        }

        return new ReminderName(trimmed);
    }
}
