// <copyright file="ReminderColor.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Core.ValueObjects;

using Codenized.Planixor.Core.Exceptions;

/// <summary>
/// Represents a validated reminder background color from the predefined palette.
/// </summary>
public record ReminderColor
{
    /// <summary>
    /// The predefined color palette available for reminder backgrounds (9 families × 5 shades = 45 colors).
    /// </summary>
    public static readonly IReadOnlySet<string> Palette = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        // Red
        "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#991B1B",

        // Orange
        "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#9A3412",

        // Amber
        "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#92400E",

        // Green
        "#6EE7B7", "#34D399", "#10B981", "#059669", "#065F46",

        // Teal
        "#67E8F9", "#22D3EE", "#0B86D4", "#0E7490", "#155E75",

        // Blue
        "#93C5FD", "#60A5FA", "#2563EB", "#1D4ED8", "#1E3A8A",

        // Purple
        "#C4B5FD", "#A78BFA", "#7C3AED", "#6D28D9", "#4C1D95",

        // Pink
        "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#9D174D",

        // Gray
        "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#1F2937",
    };

    /// <summary>
    /// Gets the hex color value.
    /// </summary>
    public string Value { get; }

    private ReminderColor(string value)
    {
        this.Value = value;
    }

    /// <summary>
    /// Creates a validated reminder color.
    /// </summary>
    /// <param name="value">The hex color string.</param>
    /// <returns>A validated <see cref="ReminderColor"/> instance.</returns>
    public static ReminderColor Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DomainException("Reminder color cannot be empty.");
        }

        if (!Palette.Contains(value))
        {
            throw new DomainException("Reminder color must be from the predefined palette.");
        }

        return new ReminderColor(value.ToUpperInvariant());
    }
}
