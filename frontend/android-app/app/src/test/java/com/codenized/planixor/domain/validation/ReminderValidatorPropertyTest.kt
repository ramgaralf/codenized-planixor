package com.codenized.planixor.domain.validation

import io.kotest.common.ExperimentalKotest
import io.kotest.property.Arb
import io.kotest.property.PropTestConfig
import io.kotest.property.arbitrary.choose
import io.kotest.property.arbitrary.constant
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.of
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Property-based tests for Reminder validation logic.
 * Uses Kotest property testing with JUnit 4.
 *
 * Feature: gh5-reminder-management
 */
@OptIn(ExperimentalKotest::class)
class ReminderValidatorPropertyTest {

    private val config = PropTestConfig(iterations = 100)

    private val PREDEFINED_PALETTE = listOf(
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
    )

    // --- Generators ---

    /** Generates a valid name (1-50 non-whitespace chars after trim). */
    private val validNameArb: Arb<String> = Arb.int(1, 50).map { len ->
        "A".repeat(len)
    }

    /** Generates a valid name with surrounding whitespace (trimmed length still 1-50). */
    private val validNameWithWhitespaceArb: Arb<String> = Arb.int(1, 50).map { len ->
        "  ${"B".repeat(len)}  "
    }

    /** Generates a valid single emoji. */
    private val validIconArb: Arb<String> = Arb.of(
        "😀", "🌙", "☀️", "🏠", "🚗", "⭐", "🔥", "💼", "🌊", "🎯",
        "🎉", "📅", "💡", "🌈", "🎵", "🍕", "🌸", "🐶", "🎮", "✨",
    )

    /** Generates a valid color from the predefined palette. */
    private val validColorArb: Arb<String> = Arb.of(PREDEFINED_PALETTE)

    /** Generates an invalid name (empty, whitespace-only, or >50 chars after trim). */
    private val invalidNameArb: Arb<String> = Arb.choose(
        1 to Arb.constant(""),
        1 to Arb.of("   ", "\t", "\n", "  \t\n  "),
        1 to Arb.int(51, 200).map { len -> "X".repeat(len) },
    )

    /** Generates an invalid icon (empty, non-emoji, or multiple emojis). */
    private val invalidIconArb: Arb<String> = Arb.choose(
        1 to Arb.constant(""),
        1 to Arb.of("A", "abc", "1", "!", "Hello"),
        1 to Arb.of("😀😃", "🌙🌟", "🎉🎊"),
    )

    /** Generates an invalid color (not in palette). */
    private val invalidColorArb: Arb<String> = Arb.choose(
        1 to Arb.constant(""),
        1 to Arb.of("#FF0000", "#000000", "#FFFFFF", "#123456", "red", "#abc"),
        1 to Arb.of("#ef4444", "#fca5a5", "#2563eb"), // lowercase versions (case-sensitive)
    )

    // --- Property 2: Form submission requires all fields valid ---

    /**
     * **Validates: Requirements 1.2, 3.4**
     *
     * Property 2: Form submission requires all fields valid
     *
     * For any combination of valid name, icon, and backgroundColor, the validate()
     * function SHALL return isValid=true. If any field is invalid, isValid SHALL be false.
     */
    @Test
    fun `Property 2 - all valid fields produce isValid true`() = runTest {
        checkAll(config, validNameArb, validIconArb, validColorArb) { name, icon, color ->
            val result = ReminderValidator.validate(name, icon, color)
            assertTrue(
                "Expected isValid=true for name='$name', icon='$icon', color='$color'",
                result.isValid,
            )
            assertNull("Expected no nameError", result.nameError)
            assertNull("Expected no iconError", result.iconError)
            assertNull("Expected no backgroundColorError", result.backgroundColorError)
        }
    }

    @Test
    fun `Property 2 - invalid name with valid icon and color produces isValid false`() = runTest {
        checkAll(config, invalidNameArb, validIconArb, validColorArb) { name, icon, color ->
            val result = ReminderValidator.validate(name, icon, color)
            assertFalse(
                "Expected isValid=false for invalid name='$name'",
                result.isValid,
            )
            assertNotNull(
                "Expected nameError for invalid name='$name'",
                result.nameError,
            )
        }
    }

    @Test
    fun `Property 2 - valid name with invalid icon and valid color produces isValid false`() = runTest {
        checkAll(config, validNameArb, invalidIconArb, validColorArb) { name, icon, color ->
            val result = ReminderValidator.validate(name, icon, color)
            assertFalse(
                "Expected isValid=false for invalid icon='$icon'",
                result.isValid,
            )
            assertNotNull(
                "Expected iconError for invalid icon='$icon'",
                result.iconError,
            )
        }
    }

    @Test
    fun `Property 2 - valid name and icon with invalid color produces isValid false`() = runTest {
        checkAll(config, validNameArb, validIconArb, invalidColorArb) { name, icon, color ->
            val result = ReminderValidator.validate(name, icon, color)
            assertFalse(
                "Expected isValid=false for invalid color='$color'",
                result.isValid,
            )
            assertNotNull(
                "Expected backgroundColorError for invalid color='$color'",
                result.backgroundColorError,
            )
        }
    }

    @Test
    fun `Property 2 - all invalid fields produce isValid false with all errors present`() = runTest {
        checkAll(config, invalidNameArb, invalidIconArb, invalidColorArb) { name, icon, color ->
            val result = ReminderValidator.validate(name, icon, color)
            assertFalse(
                "Expected isValid=false when all fields invalid",
                result.isValid,
            )
            assertNotNull("Expected nameError", result.nameError)
            assertNotNull("Expected iconError", result.iconError)
            assertNotNull("Expected backgroundColorError", result.backgroundColorError)
        }
    }

    // --- Property 14: Name validation accepts trimmed strings of 1–50 characters ---

    /**
     * **Validates: Requirements 7.1**
     *
     * Property 14: Name validation accepts trimmed strings of 1–50 characters
     *
     * For any string input, name validation SHALL accept the input if and only if
     * the trimmed value has a length between 1 and 50 characters (inclusive).
     */
    @Test
    fun `Property 14 - valid trimmed names of 1-50 chars return null`() = runTest {
        checkAll(config, validNameArb) { name ->
            val result = ReminderValidator.validateName(name)
            assertNull(
                "Expected null (valid) for name of length ${name.trim().length}",
                result,
            )
        }
    }

    @Test
    fun `Property 14 - names with whitespace padding still valid if trimmed length 1-50`() = runTest {
        checkAll(config, validNameWithWhitespaceArb) { name ->
            val result = ReminderValidator.validateName(name)
            assertNull(
                "Expected null (valid) for padded name trimmed to length ${name.trim().length}",
                result,
            )
        }
    }

    @Test
    fun `Property 14 - empty or whitespace-only names are rejected`() = runTest {
        val emptyNamesArb: Arb<String> = Arb.of("", " ", "  ", "\t", "\n", "  \t  ")
        checkAll(config, emptyNamesArb) { name ->
            val result = ReminderValidator.validateName(name)
            assertEquals(
                "Expected required error for empty/whitespace name='$name'",
                "reminder.validation.name.required",
                result,
            )
        }
    }

    @Test
    fun `Property 14 - names exceeding 50 chars after trim are rejected`() = runTest {
        val longNameArb: Arb<String> = Arb.int(51, 200).map { len -> "Z".repeat(len) }
        checkAll(config, longNameArb) { name ->
            val result = ReminderValidator.validateName(name)
            assertEquals(
                "Expected maxLength error for name of length ${name.trim().length}",
                "reminder.validation.name.maxLength",
                result,
            )
        }
    }

    // --- Property 15: Icon validation accepts exactly one emoji ---

    /**
     * **Validates: Requirements 7.2**
     *
     * Property 15: Icon validation accepts exactly one emoji
     *
     * For any string input, icon validation SHALL accept the input if and only if
     * it contains exactly one emoji character.
     */
    @Test
    fun `Property 15 - single emojis are accepted`() = runTest {
        checkAll(config, validIconArb) { icon ->
            val result = ReminderValidator.validateIcon(icon)
            assertNull(
                "Expected null (valid) for single emoji '$icon'",
                result,
            )
        }
    }

    @Test
    fun `Property 15 - empty string is rejected`() {
        val result = ReminderValidator.validateIcon("")
        assertEquals(
            "Expected required error for empty icon",
            "reminder.validation.icon.required",
            result,
        )
    }

    @Test
    fun `Property 15 - non-emoji characters are rejected`() = runTest {
        val nonEmojiArb: Arb<String> = Arb.of(
            "A", "B", "z", "1", "9", "!", "@", "#", "$", "%",
            "abc", "hello", "123", "test",
        )
        checkAll(config, nonEmojiArb) { input ->
            val result = ReminderValidator.validateIcon(input)
            assertEquals(
                "Expected required error for non-emoji '$input'",
                "reminder.validation.icon.required",
                result,
            )
        }
    }

    @Test
    fun `Property 15 - multiple emojis are rejected`() = runTest {
        val multiEmojiArb: Arb<String> = Arb.of(
            "😀😃", "🌙🌟", "🎉🎊", "🔥💧", "🐶🐱",
            "😀😃😄", "🌈⭐🎵",
        )
        checkAll(config, multiEmojiArb) { input ->
            val result = ReminderValidator.validateIcon(input)
            assertEquals(
                "Expected required error for multiple emojis '$input'",
                "reminder.validation.icon.required",
                result,
            )
        }
    }

    // --- Property 16: Color validation accepts only Predefined_Palette members ---

    /**
     * **Validates: Requirements 7.3**
     *
     * Property 16: Color validation accepts only Predefined_Palette members
     *
     * For any string input, color validation SHALL accept the input if and only if
     * it is a member of the 45-color Predefined_Palette set.
     */
    @Test
    fun `Property 16 - all 45 palette colors are accepted`() = runTest {
        checkAll(config, validColorArb) { color ->
            val result = ReminderValidator.validateBackgroundColor(color)
            assertNull(
                "Expected null (valid) for palette color '$color'",
                result,
            )
        }
    }

    @Test
    fun `Property 16 - non-palette hex colors are rejected`() = runTest {
        val nonPaletteArb: Arb<String> = Arb.of(
            "#FF0000", "#00FF00", "#0000FF", "#ABCDEF", "#123456",
            "#FEDCBA", "#111111", "#999999", "#AAAAAA", "#BBBBBB",
        )
        checkAll(config, nonPaletteArb) { color ->
            val result = ReminderValidator.validateBackgroundColor(color)
            assertEquals(
                "Expected required error for non-palette color '$color'",
                "reminder.validation.color.required",
                result,
            )
        }
    }

    @Test
    fun `Property 16 - empty string is rejected`() {
        val result = ReminderValidator.validateBackgroundColor("")
        assertEquals(
            "Expected required error for empty color",
            "reminder.validation.color.required",
            result,
        )
    }

    @Test
    fun `Property 16 - lowercase palette colors with uppercase letters are rejected (case-sensitive)`() = runTest {
        // Only test palette colors that contain uppercase hex letters (A-F),
        // so lowercasing them produces a different (invalid) string.
        val colorsWithUppercase = PREDEFINED_PALETTE.filter { color ->
            color.substring(1).any { it in 'A'..'F' }
        }
        val lowercaseArb: Arb<String> = Arb.of(colorsWithUppercase).map { it.lowercase() }
        checkAll(config, lowercaseArb) { color ->
            val result = ReminderValidator.validateBackgroundColor(color)
            assertEquals(
                "Expected required error for lowercase palette color '$color'",
                "reminder.validation.color.required",
                result,
            )
        }
    }

    @Test
    fun `Property 16 - arbitrary strings are rejected`() = runTest {
        val arbitraryArb: Arb<String> = Arb.of(
            "red", "blue", "green", "invalid", "rgb(0,0,0)",
            "hsl(0,100%,50%)", "#FFF", "#GGG", "not-a-color",
        )
        checkAll(config, arbitraryArb) { input ->
            val result = ReminderValidator.validateBackgroundColor(input)
            assertEquals(
                "Expected required error for arbitrary input '$input'",
                "reminder.validation.color.required",
                result,
            )
        }
    }
}
