# Calendar Event Form: Interaction Rules

Defines automatic behavior and validation rules for the calendar event creation and editing forms. Applies to both **React Web (PWA)** and **Android App**.

## Time auto-adjustment rules

These rules apply whenever the user modifies time fields in the calendar event form (create or edit).

### Rule 1: Start time change adjusts end time if inconsistent

**Trigger**: The user changes the **start time** and the current **end time** is earlier than or equal to the new start time.

**Behavior**: Automatically set the end time to **start time + 30 minutes**.

**Examples**:
- Start time changed to `14:00`, end time was `13:30` → end time auto-set to `14:30`
- Start time changed to `23:30`, end time was `22:00` → end time auto-set to `00:00` (next day handling if applicable, or cap at `23:59` depending on platform constraints)
- Start time changed to `10:00`, end time is already `11:00` → no change (end time is still after start time)

**Platform implementation notes**:
- **React Web**: Handle in the time picker's `onChange` callback. Update end time state reactively.
- **Android**: Handle in the time picker's `onTimeSelected` or equivalent callback. Update end time state in the ViewModel.

## Rules

- These auto-adjustments must be **silent** (no toast, no dialog) — the field simply updates.
- The user can always manually override the auto-adjusted end time after the adjustment.
- These rules apply identically on both platforms (React Web and Android).
- The adjustment is purely a UX convenience — it does not prevent the user from setting any valid time combination manually after the auto-adjustment.
