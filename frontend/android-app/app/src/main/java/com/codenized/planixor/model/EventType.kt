package com.codenized.planixor.model

/**
 * Represents the type of a calendar event.
 * Covers both work shifts and other calendar event categories.
 */
enum class EventType {
    ShiftMorning,
    ShiftAfternoon,
    ShiftNight,
    Personal,
    Meeting,
    Reminder,
}
