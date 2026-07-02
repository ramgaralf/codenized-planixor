// <copyright file="ShiftIcon.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using System.Globalization;
using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents a validated shift icon (single emoji character).
/// </summary>
public record ShiftIcon
{
    /// <summary>
    /// Gets the shift icon value.
    /// </summary>
    public string Value { get; }

    private ShiftIcon(string value)
    {
        this.Value = value;
    }

    /// <summary>
    /// Creates a validated shift icon.
    /// </summary>
    /// <param name="value">The emoji string.</param>
    /// <returns>A validated <see cref="ShiftIcon"/> instance.</returns>
    public static ShiftIcon Create(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            throw new DomainException("Shift icon cannot be empty.");
        }

        StringInfo stringInfo = new StringInfo(value);

        if (stringInfo.LengthInTextElements != 1)
        {
            throw new DomainException("Shift icon must be exactly one emoji character.");
        }

        return new ShiftIcon(value);
    }
}
