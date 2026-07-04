# Calendar Event Form: Interaction Rules

Defines automatic behavior and validation rules for the calendar event creation and editing forms. Applies to both **React Web (PWA)** and **Android App**.

## Time auto-adjustment rules

These rules apply whenever the user modifies time fields in the calendar event form (create or edit).

### Rule 1: Start time change adjusts end time if inconsistent

**Trigger**: The user changes the **start time** and the current **end time** is earlier than or equal to the new start time.

**Behavior**: Automatically set the end time to **start time + 30 minutes** (capped at 23:59).

**Examples**:
- Start time changed to `14:00`, end time was `13:30` → end time auto-set to `14:30`
- Start time changed to `23:30`, end time was `22:00` → end time auto-set to `23:59` (capped)
- Start time changed to `10:00`, end time is already `11:00` → no change (end time is still after start time)

**Platform implementation notes**:
- **React Web**: Handled in the `setField` callback of `useEventForm.ts`. When `field === 'startTime'`, if `endTime <= newStartTime`, sets `endTime = Math.min(newStartTime + 30, 1439)`.
- **Android**: Handled in `CalendarViewModel.onStartTimeSelected()`. Computes `newStartTotal` and `currentEndTotal`; if `currentEndTotal <= newStartTotal`, sets end time to `(newStartTotal + 30).coerceAtMost(1439)`.

## Day auto-adjustment rules

### Rule 2: Start day change adjusts end day if inconsistent

**Trigger**: The user changes the **start day** and the current **end day** is earlier than the new start day.

**Behavior**: Automatically set the end day to equal the new start day.

**Examples**:
- Start day changed to `2025-03-15`, end day was `2025-03-10` → end day auto-set to `2025-03-15`
- Start day changed to `2025-01-05`, end day is already `2025-01-10` → no change (end day is still after start day)

**Platform implementation notes**:
- **React Web**: Handled in the `setField` callback of `useEventForm.ts`. When `field === 'startDay'`, if `endDay < newStartDay`, sets `endDay = newStartDay`.
- **Android**: Handled in `CalendarViewModel.onStartDaySelected()`. If `current.endDay < newDay`, corrects `endDay = newDay`.

## Default time pre-population

When creating a new event (not editing), the form pre-populates default times:

- **Start time**: Current time rounded up to the next 30-minute mark (e.g., 10:17 → 10:30, 10:31 → 11:00). Capped at 23:30.
- **End time**: Start time + 60 minutes. Capped at 23:59.

This applies on both platforms identically.

## Shift event auto-computation rules

These rules apply when a shift is selected as the event type in the calendar event form.

### Rule 3: Shift selection auto-populates time and endDay

**Trigger**: The user selects a shift as the event type.

**Behavior**:
- `startTime` and `endTime` are set from the shift definition (read-only, not user-editable)
- `totalHours` is set from the shift's `hoursWorked` value
- `endDay` is computed via `computeEndDayForShift(startDay, startTime, endTime)`:
  - If `endTime <= startTime` (crossing midnight OR 24-hour shift): `endDay = startDay + 1`
  - If `endTime > startTime` (same-day shift): `endDay = startDay`

**24-hour shift special case**:
- When a shift has `startTime === endTime`, it represents a 24-hour shift
- `hoursWorked` = 1440 minutes (auto-calculated)
- `endDay` = `startDay + 1` day
- The event spans the full startDay but does NOT appear on endDay (since endTime=0 means it ends at the very start of that day)

### Rule 4: Events ending at 00:00 do not display on the end day

**Context**: When a multi-day event (startDay ≠ endDay) has `endTime = 0`, the event ended at the very beginning of `endDay` (midnight). It occupies zero time on that day.

**Behavior**: The DayView (both platforms) filters out events where `effectiveEnd <= effectiveStart` on the current rendering day. This means:
- A 24-hour shift (08:00→08:00, startDay=June 20, endDay=June 21) shows on June 20 (full day) but NOT on June 21
- A midnight-crossing shift (22:00→06:00, startDay=June 20, endDay=June 21) shows on both days: June 20 (22:00→23:59) and June 21 (00:00→06:00)

## Prerequisite check before event creation

### Rule 5: At least one shift or reminder must exist to create an event

**Trigger**: The user clicks "New Event" (top bar button on web, "+" button or FAB on Android).

**Behavior**:
- Query local storage for active (isDeleted=false) shifts and reminders
- If at least one shift OR at least one reminder exists → proceed to Calendar_Event_Form
- If NEITHER exists (zero shifts AND zero reminders) → show Prerequisite_Modal/Dialog instead of the form

**Prerequisite_Modal behavior**:
- Displays a message indicating shifts or reminders must be created first
- Provides navigation buttons to Shifts page and Reminders page
- Provides a dismiss action that returns to Calendar view
- Does NOT open the Calendar_Event_Form

**Platform implementation notes**:
- **React Web**: `usePrerequisiteCheck` hook + `PrerequisiteModal` component in HeaderBar. Uses `useLiveQuery` for reactive updates.
- **Android**: `CalendarViewModel.performPrerequisiteCheck()` + `PrerequisiteDialog` composable in AppNavigation. The `observeEvents()` flow also combines with shifts/reminders flows to re-resolve display fields when referenced entities are synced after events.

## Rules

- All auto-adjustments must be **silent** (no toast, no dialog) — the field simply updates.
- The user can always manually override any auto-adjusted value after the adjustment.
- These rules apply identically on both platforms (React Web and Android).
- The adjustments are purely UX convenience — they do not prevent the user from setting any valid combination manually after the auto-adjustment.
- Auto-adjustments only apply to editable fields (reminder time fields). For shifts, time fields are read-only and populated from the shift definition.
- `computeEndDayForShift` uses `<=` (not `<`): when startTime equals endTime, it's a 24-hour shift ending the next day.
- Events with `endTime = 0` on their `endDay` are not rendered on that day (they occupy zero time there).
- The prerequisite check requires at least one active shift OR one active reminder (not both). Zero of both types triggers the modal.


## Day-specific event queries (effective time filtering)

### Rule 6: Events with zero effective time on a day must be excluded from day-specific queries

**Context**: When querying events for a specific day (e.g., for a Day_Action_Modal or determining if a day is "empty"), the query `startDay <= day AND endDay >= day` includes multi-day events. However, some of these events have zero effective time on the queried day (e.g., a 24-hour shift ending at 00:00 on the endDay).

**Behavior**: Any feature that queries events for a specific day and makes decisions based on the result (showing a modal, determining "empty day" status, etc.) MUST apply the effective time filter:

```
effectiveEnd > effectiveStart
```

Where effective times are computed as:
- Single-day event (`startDay === endDay`): `effectiveStart = startTime`, `effectiveEnd = endTime`
- Multi-day event on start day: `effectiveStart = startTime`, `effectiveEnd = 1439`
- Multi-day event on end day with `endTime === 0`: `effectiveStart = 0`, `effectiveEnd = 0` (excluded)
- Multi-day event on end day with `endTime > 0`: `effectiveStart = 0`, `effectiveEnd = endTime`
- Multi-day event on intermediate day: `effectiveStart = 0`, `effectiveEnd = 1439`

**Platform implementation:**
- **React Web**: Use `getEffectiveTimes(event, dayStr)` from `features/calendar-events/utils.ts`
- **Android**: Use `getEffectiveStartMinutes(event, dayStr)` and `getEffectiveEndMinutes(event, dayStr)` in CalendarViewModel

**This applies to**: Day_Action_Modal day-tap logic, DayView event rendering, any future feature that needs to determine if an event is "active" on a specific day.
