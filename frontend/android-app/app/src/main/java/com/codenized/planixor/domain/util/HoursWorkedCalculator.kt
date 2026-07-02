package com.codenized.planixor.domain.util

/**
 * Calculates hours worked (in minutes) from start and end times.
 *
 * @param startTime minutes from midnight (0–1439)
 * @param endTime minutes from midnight (0–1439)
 * @return total minutes worked:
 *   - 1440 if startTime == endTime (special case: full 24 hours)
 *   - (endTime - startTime + 1440) % 1440 otherwise (handles midnight crossing)
 */
fun calculateHoursWorked(startTime: Int, endTime: Int): Int {
    return if (startTime == endTime) {
        1440
    } else {
        (endTime - startTime + 1440) % 1440
    }
}
