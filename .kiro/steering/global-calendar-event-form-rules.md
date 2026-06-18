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

## Rules

- All auto-adjustments must be **silent** (no toast, no dialog) — the field simply updates.
- The user can always manually override any auto-adjusted value after the adjustment.
- These rules apply identically on both platforms (React Web and Android).
- The adjustments are purely UX convenience — they do not prevent the user from setting any valid combination manually after the auto-adjustment.
- Auto-adjustments only apply to editable fields (reminder time fields). For shifts, time fields are read-only and populated from the shift definition.
