package com.codenized.planixor.domain.validation

/**
 * Result of reminder form validation.
 * [isValid] is true when all fields pass validation.
 * Individual error fields contain i18n keys when invalid, null when valid.
 */
data class ReminderValidationResult(
    val isValid: Boolean,
    val nameError: String? = null,
    val iconError: String? = null,
    val backgroundColorError: String? = null,
)

/**
 * Pure domain validator for reminder form fields.
 * No Android SDK dependencies — can be unit tested on JVM.
 */
object ReminderValidator {

    private val PREDEFINED_PALETTE = setOf(
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

    private const val NAME_MIN_LENGTH = 1
    private const val NAME_MAX_LENGTH = 50

    /**
     * Validates all reminder fields and returns a combined result.
     */
    fun validate(name: String, icon: String, backgroundColor: String): ReminderValidationResult {
        val nameError = validateName(name)
        val iconError = validateIcon(icon)
        val backgroundColorError = validateBackgroundColor(backgroundColor)

        return ReminderValidationResult(
            isValid = nameError == null && iconError == null && backgroundColorError == null,
            nameError = nameError,
            iconError = iconError,
            backgroundColorError = backgroundColorError,
        )
    }

    /**
     * Validates the reminder name: 1–50 characters after trim, not whitespace-only.
     * Returns an i18n error key or null if valid.
     */
    fun validateName(name: String): String? {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return "reminder.validation.name.required"
        if (trimmed.length > NAME_MAX_LENGTH) return "reminder.validation.name.maxLength"
        return null
    }

    /**
     * Validates the reminder icon: must be exactly 1 emoji (single grapheme cluster that is emoji).
     * Returns an i18n error key or null if valid.
     */
    fun validateIcon(icon: String): String? {
        if (icon.isEmpty()) return "reminder.validation.icon.required"
        val graphemeCount = countGraphemeClusters(icon)
        if (graphemeCount != 1) return "reminder.validation.icon.required"
        if (!isEmoji(icon)) return "reminder.validation.icon.required"
        return null
    }

    /**
     * Validates the background color: must be a member of the Predefined_Palette.
     * Returns an i18n error key or null if valid.
     */
    fun validateBackgroundColor(color: String): String? {
        if (color.isEmpty() || color !in PREDEFINED_PALETTE) return "reminder.validation.color.required"
        return null
    }

    /**
     * Counts grapheme clusters in a string using Java's BreakIterator.
     */
    private fun countGraphemeClusters(text: String): Int {
        val iterator = java.text.BreakIterator.getCharacterInstance()
        iterator.setText(text)
        var count = 0
        while (iterator.next() != java.text.BreakIterator.DONE) {
            count++
        }
        return count
    }

    /**
     * Checks if the string represents an emoji.
     * Uses code point analysis to detect emoji characters.
     */
    private fun isEmoji(text: String): Boolean {
        val codePoints = text.codePoints().toArray()
        if (codePoints.isEmpty()) return false

        val significantCodePoints = codePoints.filter { cp ->
            !isVariationSelector(cp) && !isZeroWidthJoiner(cp) && !isSkinToneModifier(cp)
        }

        if (significantCodePoints.isEmpty()) return false

        return significantCodePoints.any { cp -> isEmojiCodePoint(cp) }
    }

    private fun isEmojiCodePoint(codePoint: Int): Boolean {
        return when {
            codePoint in 0x1F600..0x1F64F -> true // Emoticons
            codePoint in 0x1F300..0x1F5FF -> true // Miscellaneous Symbols and Pictographs
            codePoint in 0x1F680..0x1F6FF -> true // Transport and Map Symbols
            codePoint in 0x1F900..0x1F9FF -> true // Supplemental Symbols and Pictographs
            codePoint in 0x1FA00..0x1FA6F -> true // Symbols and Pictographs Extended-A
            codePoint in 0x1FA70..0x1FAFF -> true // Symbols and Pictographs Extended-B
            codePoint in 0x2702..0x27B0 -> true   // Dingbats
            codePoint in 0x2600..0x26FF -> true   // Miscellaneous Symbols
            codePoint in 0x1F1E0..0x1F1FF -> true // Regional Indicator Symbols (flags)
            codePoint == 0x200D -> false          // ZWJ itself is not emoji
            codePoint == 0xFE0F -> false          // Variation selector
            codePoint in 0x2300..0x23FF -> true   // Miscellaneous Technical
            codePoint in 0x2B05..0x2B55 -> true   // Arrows and geometric shapes used as emoji
            codePoint in 0x3030..0x3030 -> true   // Wavy dash
            codePoint in 0x303D..0x303D -> true   // Part alternation mark
            else -> false
        }
    }

    private fun isVariationSelector(codePoint: Int): Boolean {
        return codePoint in 0xFE00..0xFE0F || codePoint in 0xE0100..0xE01EF
    }

    private fun isZeroWidthJoiner(codePoint: Int): Boolean {
        return codePoint == 0x200D
    }

    private fun isSkinToneModifier(codePoint: Int): Boolean {
        return codePoint in 0x1F3FB..0x1F3FF
    }
}
