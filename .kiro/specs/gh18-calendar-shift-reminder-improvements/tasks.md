# Implementation Plan: Calendar, Shift & Reminder Improvements

## Overview

This implementation plan covers three categories of improvements: validation relaxation (HoursWorked 0-1440, reminder same-day time equality), propagation mechanism (batch-update calendar events when shift/reminder templates change), and day pre-selection fix (always use navigated date). Changes span backend (.NET/C#), React Web (TypeScript), and Android (Kotlin).

## Tasks

- [x] 1. Backend validation changes
  - [x] 1.1 Update `HoursWorked` value object to accept 0 as minimum
    - Modify `HoursWorked.Create()` to change lower bound from 1 to 0
    - Update the error message to reflect "between 0 and 1440 minutes"
    - _Requirements: 1.1, 1.5, 2.3_

  - [x] 1.2 Update `ShiftSyncItemValidator` to accept HoursWorked of 0
    - Modify the FluentValidation rule for HoursWorked to allow 0 as minimum
    - _Requirements: 1.5, 1.6, 8.1_

  - [x] 1.3 Write property test for `HoursWorked` value object (FsCheck)
    - **Property 1: HoursWorked accepts full range 0-1440**
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.6, 2.1, 2.3**

- [x] 2. React Web — Shift validation relaxation
  - [x] 2.1 Change `SHIFT_HOURS_WORKED_MIN` from 1 to 0 in `shifts/constants.ts`
    - Update the constant value; the Zod schema already references it
    - _Requirements: 1.1, 1.2, 8.1_

  - [x] 2.2 Add store-level validation in `shiftService.ts`
    - Add `validateHoursWorkedRange` check in `create()` and `update()` methods
    - Enforce range [0, 1440] at the persistence layer
    - _Requirements: 1.5, 1.6_

  - [x] 2.3 Update hours worked validation error message i18n key
    - Change error message from "between 1 minute and 24 hours" to "between 0 and 24 hours" in `en.json` and `es.json`
    - _Requirements: 1.1, 8.1_

  - [x] 2.4 Write property test for shift Zod schema hoursWorked range (fast-check)
    - **Property 1: HoursWorked accepts full range 0-1440**
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.6**

  - [x] 2.5 Write property test for store-level validation (fast-check)
    - **Property 3: Shift store-level validation enforces HoursWorked range**
    - **Validates: Requirements 1.5, 1.6**

- [x] 3. React Web — Reminder time validation relaxation
  - [x] 3.1 Change `validateTimeForReminder` from `>` to `>=` in `calendar-events/validation.ts`
    - Allow `endTime == startTime` on same-day reminder events (producing 0 totalHours)
    - _Requirements: 3.1, 3.2, 4.1_

  - [x] 3.2 Add store-level validation in `calendarEventService.ts` if not already present
    - Ensure the service accepts `totalHours = 0` for reminder events without rejecting
    - _Requirements: 3.3, 3.5_

  - [x] 3.3 Write property test for `validateTimeForReminder` (fast-check)
    - **Property 2: Reminder same-day time validation allows equality**
    - **Validates: Requirements 3.1, 3.2, 4.1**

  - [x] 3.4 Write property test for `computeTotalHours` zero case (fast-check)
    - **Property 10: TotalHours computation allows zero for reminders**
    - **Property 11: TotalHours for shift events reflects shift's HoursWorked including zero**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5**

- [x] 4. Checkpoint — Backend and validation changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. React Web — Propagation utilities
  - [x] 5.1 Create `shiftPropagation.ts` in shifts/services/
    - Implement `checkShiftPropagationNeeded(shiftId)` — count non-deleted current-year events
    - Implement `propagateShiftChanges(shiftId, startTime, endTime, hoursWorked)` — batch update events
    - Set `modifiedAt` to current UTC timestamp, `syncedAt` to null on affected events
    - _Requirements: 6.1, 6.3, 6.5, 6.6, 6.8_

  - [x] 5.2 Create `reminderPropagation.ts` in reminders/services/
    - Implement `checkReminderPropagationNeeded(reminderId)` — count non-deleted current-year events
    - Implement `propagateReminderChanges(reminderId)` — touch modifiedAt/syncedAt on affected events
    - _Requirements: 7.1, 7.3, 7.5, 7.6, 7.8_

  - [x] 5.3 Write property tests for shift propagation (fast-check)
    - **Property 4: Propagation only affects current-year events**
    - **Property 5: Propagation updates correct fields for shifts**
    - **Validates: Requirements 6.3, 6.6, 6.8**

  - [x] 5.4 Write property tests for reminder propagation (fast-check)
    - **Property 4: Propagation only affects current-year events**
    - **Property 6: Propagation touches modifiedAt/syncedAt for reminders**
    - **Validates: Requirements 7.3, 7.6, 7.8**

- [x] 6. React Web — PropagationModal component
  - [x] 6.1 Create `PropagationModal.tsx` in shared/components/
    - Accept props: `isOpen`, `templateName`, `templateType`, `affectedEventCount`, `onConfirm`, `onDecline`
    - Display template name, current-year scope message, affected event count
    - Confirm ("Update Events") and Decline ("Keep As Is") buttons
    - Ensure accessibility (ARIA labels, focus trap, keyboard navigation)
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 8.3_

  - [x] 6.2 Add propagation modal i18n keys to `en.json` and `es.json`
    - Add keys: `propagation.modal.title`, `propagation.modal.description.shift`, `propagation.modal.description.reminder`, `propagation.modal.affectedCount`, `propagation.modal.confirm`, `propagation.modal.decline`
    - _Requirements: 8.5_

  - [x] 6.3 Write unit tests for `PropagationModal` rendering and interaction
    - Test rendering with shift and reminder types
    - Test confirm and decline button clicks
    - Test accessibility attributes
    - _Requirements: 6.2, 7.2, 8.3_

- [x] 7. React Web — Propagation flow integration
  - [x] 7.1 Modify `useShiftForm.ts` hook to add propagation flow
    - Add `propagationState` state (isOpen, affectedCount, shiftData)
    - After successful edit save: call `checkShiftPropagationNeeded`
    - If count > 0: show PropagationModal instead of navigating
    - On confirm: call `propagateShiftChanges`, then navigate
    - On decline: navigate without propagating
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.7_

  - [x] 7.2 Modify `useReminderForm.ts` hook to add propagation flow
    - Same pattern as shifts: check for affected events after edit save
    - Show PropagationModal if count > 0
    - On confirm: call `propagateReminderChanges`, then navigate
    - On decline: navigate without propagating
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.7_

  - [x] 7.3 Write unit tests for propagation flow in `useShiftForm`
    - Test: modal shown when affected events > 0
    - Test: modal skipped when 0 affected events (Property 8)
    - Test: decline preserves events unchanged (Property 9)
    - **Property 8: Propagation modal is skipped when no affected events exist**
    - **Property 9: Declining propagation preserves all calendar events unchanged**
    - **Validates: Requirements 6.4, 6.5, 7.4, 7.5**

- [x] 8. Checkpoint — Propagation feature complete on React Web
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. React Web — Day pre-selection fix
  - [x] 9.1 Simplify `computePreSelectedDay` in `useEventForm.ts`
    - Replace conditional logic with always using `currentDate` from calendar store
    - Format as ISO date string for both `startDay` and `endDay`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 9.2 Write property test for `computePreSelectedDay` (fast-check)
    - **Property 7: Day pre-selection uses navigated date across all view modes**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 10. Android — Shift validation relaxation
  - [x] 10.1 Change shift hoursWorked validation range from `1..1440` to `0..1440`
    - Update validation in `ShiftFormViewModel.kt` or validation utility
    - Update error message string resource
    - _Requirements: 1.1, 1.2, 8.1_

  - [x] 10.2 Update hours worked error string in `strings.xml` and `strings-es.xml`
    - Change from "between 1 minute and 24 hours" to "between 0 and 24 hours"
    - _Requirements: 1.1, 8.1_

  - [x] 10.3 Write property test for Android shift validation (Kotest)
    - **Property 1: HoursWorked accepts full range 0-1440**
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.6, 8.1**

- [x] 11. Android — Reminder time validation relaxation
  - [x] 11.1 Change time validation from `>` to `>=` in `CalendarEventValidation.kt`
    - Allow `endTime == startTime` for same-day reminders
    - _Requirements: 3.1, 3.2, 8.2_

  - [x] 11.2 Write property test for Android reminder time validation (Kotest)
    - **Property 2: Reminder same-day time validation allows equality**
    - **Validates: Requirements 3.1, 3.2, 4.1, 8.2**

- [x] 12. Android — Propagation feature
  - [x] 12.1 Create `PropagationDialog.kt` composable in `ui/components/`
    - Accept parameters: `isOpen`, `templateName`, `templateType`, `affectedEventCount`, `onConfirm`, `onDecline`
    - Display same content as React Web PropagationModal
    - _Requirements: 6.2, 7.2, 8.3_

  - [x] 12.2 Add propagation dialog string resources to `strings.xml` and `strings-es.xml`
    - Add all propagation modal strings (title, descriptions, count, confirm, decline)
    - _Requirements: 8.5_

  - [x] 12.3 Modify `ShiftFormViewModel.kt` to add propagation flow
    - Add `PropagationUiState` sealed class (Hidden, Showing)
    - After save in edit mode: query local DB for affected current-year events
    - Expose propagation state to composable
    - Handle confirm/decline actions
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.7, 6.8_

  - [x] 12.4 Modify `ReminderFormViewModel.kt` to add propagation flow
    - Same pattern as shift ViewModel
    - Touch modifiedAt/syncedAt on affected events on confirm
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.7, 7.8_

  - [x] 12.5 Write property tests for Android propagation logic (Kotest)
    - **Property 4: Propagation only affects current-year events**
    - **Property 5: Propagation updates correct fields for shifts**
    - **Property 6: Propagation touches modifiedAt/syncedAt for reminders**
    - **Validates: Requirements 6.3, 6.6, 7.3, 7.6**

- [x] 13. Android — Day pre-selection fix
  - [x] 13.1 Fix pre-selection to use navigated date instead of `LocalDate.now()`
    - Update `CalendarViewModel` (or equivalent) to use `_uiState.value.currentDate` for pre-selection
    - Applies to all view modes (Day, Week, Month, Year)
    - _Requirements: 5.1, 5.2, 5.3, 8.4_

  - [x] 13.2 Write property test for Android day pre-selection (Kotest)
    - **Property 7: Day pre-selection uses navigated date across all view modes**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 14. Final checkpoint — All platforms complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The propagation feature is entirely local (no new API endpoints) — updated events sync via existing `syncedAt = null` mechanism
- Backend changes are minimal (value object + validator) since propagation is client-side only
- i18n keys are co-located with the feature tasks that introduce the UI components

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "3.1", "10.1", "10.2", "11.1"] },
    { "id": 1, "tasks": ["1.3", "2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "10.3", "11.2"] },
    { "id": 2, "tasks": ["2.5", "5.1", "5.2", "6.2", "9.1", "12.2", "13.1"] },
    { "id": 3, "tasks": ["5.3", "5.4", "6.1", "9.2", "12.1", "13.2"] },
    { "id": 4, "tasks": ["6.3", "7.1", "7.2", "12.3", "12.4"] },
    { "id": 5, "tasks": ["7.3", "12.5"] }
  ]
}
```
