package com.codenized.planixor.domain.validation

/**
 * Result of shift form validation.
 * Contains a map of field names to their corresponding i18n error keys.
 * An empty map indicates all fields are valid.
 */
data class ShiftValidationResult(
    val errors: Map<String, String> = emptyMap(),
) {
    val isValid: Boolean get() = errors.isEmpty()
}

/**
 * Input data for shift validation.
 * Uses nullable types to detect missing/unset fields.
 */
data class ShiftValidationInput(
    val name: String?,
    val icon: String?,
    val color: String?,
    val startTimeHours: Int?,
    val startTimeMinutes: Int?,
    val endTimeHours: Int?,
    val endTimeMinutes: Int?,
    val hoursWorked: Int?,
)

/**
 * Pure domain validator for shift form fields.
 * No Android SDK dependencies — can be unit tested on JVM.
 */
object ShiftValidator {

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
    private const val HOURS_MIN = 0
    private const val HOURS_MAX = 23
    private const val MINUTES_MIN = 0
    private const val MINUTES_MAX = 59
    private const val HOURS_WORKED_MIN = 0
    private const val HOURS_WORKED_MAX = 1440

    fun validate(input: ShiftValidationInput): ShiftValidationResult {
        val errors = mutableMapOf<String, String>()

        validateName(input.name)?.let { errors["name"] = it }
        validateIcon(input.icon)?.let { errors["icon"] = it }
        validateColor(input.color)?.let { errors["color"] = it }
        validateStartTime(input.startTimeHours, input.startTimeMinutes)?.let { errors["startTime"] = it }
        validateEndTime(input.endTimeHours, input.endTimeMinutes)?.let { errors["endTime"] = it }
        validateHoursWorked(input.hoursWorked)?.let { errors["hoursWorked"] = it }

        return ShiftValidationResult(errors)
    }

    /**
     * Validates the shift name: 1–50 characters after trim, not whitespace-only.
     */
    internal fun validateName(name: String?): String? {
        if (name == null) return "shift.validation.name.required"
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return "shift.validation.name.required"
        if (trimmed.length > NAME_MAX_LENGTH) return "shift.validation.name.maxLength"
        return null
    }

    /**
     * Validates the shift icon: must be exactly 1 emoji (single grapheme cluster that is emoji).
     * Uses Java's Character class to count grapheme clusters and check for emoji properties.
     */
    internal fun validateIcon(icon: String?): String? {
        if (icon == null || icon.isEmpty()) return "shift.validation.icon.required"
        val graphemeCount = countGraphemeClusters(icon)
        if (graphemeCount != 1) return "shift.validation.icon.required"
        if (!isEmoji(icon)) return "shift.validation.icon.required"
        return null
    }

    /**
     * Validates the background color: must be in the predefined palette.
     */
    internal fun validateColor(color: String?): String? {
        if (color == null || color !in PREDEFINED_PALETTE) return "shift.validation.color.required"
        return null
    }

    /**
     * Validates start time: hours 0–23, minutes 0–59.
     */
    internal fun validateStartTime(hours: Int?, minutes: Int?): String? {
        if (hours == null || minutes == null) return "shift.validation.startTime.required"
        if (hours < HOURS_MIN || hours > HOURS_MAX) return "shift.validation.startTime.required"
        if (minutes < MINUTES_MIN || minutes > MINUTES_MAX) return "shift.validation.startTime.required"
        return null
    }

    /**
     * Validates end time: hours 0–23, minutes 0–59.
     */
    internal fun validateEndTime(hours: Int?, minutes: Int?): String? {
        if (hours == null || minutes == null) return "shift.validation.endTime.required"
        if (hours < HOURS_MIN || hours > HOURS_MAX) return "shift.validation.endTime.required"
        if (minutes < MINUTES_MIN || minutes > MINUTES_MAX) return "shift.validation.endTime.required"
        return null
    }

    /**
     * Validates hours worked: must be between 0 and 1440 minutes inclusive.
     */
    internal fun validateHoursWorked(hoursWorked: Int?): String? {
        if (hoursWorked == null) return "shift.validation.hoursWorked.range"
        if (hoursWorked < HOURS_WORKED_MIN || hoursWorked > HOURS_WORKED_MAX) return "shift.validation.hoursWorked.range"
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
     * Uses Character.getType and code point analysis to detect emoji characters.
     */
    private fun isEmoji(text: String): Boolean {
        val codePoints = text.codePoints().toArray()
        if (codePoints.isEmpty()) return false

        // Filter out variation selectors and ZWJ (they are modifiers, not standalone)
        val significantCodePoints = codePoints.filter { cp ->
            !isVariationSelector(cp) && !isZeroWidthJoiner(cp) && !isSkinToneModifier(cp)
        }

        if (significantCodePoints.isEmpty()) return false

        // Check that at least the first significant code point is an emoji
        return significantCodePoints.any { cp -> isEmojiCodePoint(cp) }
    }

    private fun isEmojiCodePoint(codePoint: Int): Boolean {
        // Common emoji ranges
        return when {
            // Emoticons
            codePoint in 0x1F600..0x1F64F -> true
            // Miscellaneous Symbols and Pictographs
            codePoint in 0x1F300..0x1F5FF -> true
            // Transport and Map Symbols
            codePoint in 0x1F680..0x1F6FF -> true
            // Supplemental Symbols and Pictographs
            codePoint in 0x1F900..0x1F9FF -> true
            // Symbols and Pictographs Extended-A
            codePoint in 0x1FA00..0x1FA6F -> true
            // Symbols and Pictographs Extended-B
            codePoint in 0x1FA70..0x1FAFF -> true
            // Dingbats
            codePoint in 0x2702..0x27B0 -> true
            // Miscellaneous Symbols
            codePoint in 0x2600..0x26FF -> true
            // Regional Indicator Symbols (flags)
            codePoint in 0x1F1E0..0x1F1FF -> true
            // Various individual emoji code points
            codePoint == 0x200D -> false // ZWJ itself is not emoji
            codePoint == 0xFE0F -> false // Variation selector
            // CJK Symbols and other non-emoji
            codePoint in 0x2300..0x23FF -> true // Miscellaneous Technical (includes ⌚, ⏰, etc.)
            codePoint in 0x2B05..0x2B55 -> true // Arrows and geometric shapes used as emoji
            codePoint in 0x3030..0x3030 -> true // Wavy dash
            codePoint in 0x303D..0x303D -> true // Part alternation mark
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
