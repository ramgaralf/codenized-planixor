// <copyright file="ShiftName.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents a validated shift name.
/// </summary>
public record ShiftName
{
    /// <summary>
    /// Gets the shift name value.
    /// </summary>
    public string Value { get; }

    private ShiftName(string value)
    {
        this.Value = value;
    }

    /// <summary>
    /// Creates a validated shift name.
    /// </summary>
    /// <param name="value">The shift name string.</param>
    /// <returns>A validated <see cref="ShiftName"/> instance.</returns>
    public static ShiftName Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DomainException("Shift name cannot be empty or whitespace-only.");
        }

        string trimmed = value.Trim();

        if (trimmed.Length > 50)
        {
            throw new DomainException("Shift name must be 50 characters or less.");
        }

        return new ShiftName(trimmed);
    }
}
