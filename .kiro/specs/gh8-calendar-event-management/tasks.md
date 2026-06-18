# Implementation Plan: Calendar Event Management — Migration

## Overview

This plan migrates the Calendar Event Management feature from the old data model (`day`, `startTime > endTime` constraint) to the new model (`startDay`, `endDay`, `totalHours`, conditional time editability, crossing midnight auto-set endDay, notes max 250). The migration spans all three sub-projects: React Web (PWA), Backend API, and Android App.

The old model used a single `day` field and enforced `endTime > startTime` for all events. The new model introduces multi-day events (`startDay`/`endDay`), computed `totalHours`, conditional time validation (reminders only when same day), crossing-midnight auto-set for shifts, and increases notes max length to 250.

## Tasks

- [x] 1. Migrate data model and validation (React Web)
  - [x] 1.1 Update models.ts with new multi-day fields
    - Rename the `day` field to `startDay` in `CalendarEvent` interface
    - Add `endDay: string` field (ISO date YYYY-MM-DD)
    - Add `totalHours: number` field (total duration in minutes, read-only, computed)
    - Update notes field description to max 250 characters
    - Update `CalendarEventDisplay` interface accordingly
    - _Requirements: 11.1_

  - [x] 1.2 Update constants.ts with new limits and i18n keys
    - Change `MAX_NOTES_LENGTH` from 200 to 250
    - Add constants for new validation error keys: `ERROR_INVALID_DAY_RANGE`, `ERROR_INVALID_TIME_FOR_REMINDER`, `ERROR_CROSSING_MIDNIGHT`
    - Add any new time/day constants needed for the new model
    - _Requirements: 1.3, 11.1_

  - [x] 1.3 Rewrite validation.ts with new validation functions
    - Remove `validateTimeRange(startTime, endTime)` (no longer applies globally)
    - Add `validateDayRange(startDay, endDay)`: returns true if `endDay >= startDay`
    - Add `validateTimeForReminder(startDay, endDay, startTime, endTime)`: returns true if `endDay > startDay` (any times valid) OR (`endDay == startDay` AND `endTime > startTime`); for shifts always returns true
    - Add `computeTotalHours(eventType, startDay, endDay, startTime, endTime, shiftHoursWorked?)`: for shifts returns `shiftHoursWorked`; for reminders calculates from day difference + time difference
    - Add `computeEndDayForShift(startDay, startTime, endTime)`: if `endTime < startTime` (crossing midnight) returns `startDay + 1 day`; otherwise returns `startDay`
    - Update `validateRequiredFields(event)` to check new required fields (`startDay`, `endDay`, `totalHours`)
    - Update `checkOneShiftPerDay(startDay, eventType, existingEvents, excludeEventId?)` to use `startDay` instead of `day`
    - Update `validateNotes(notes)` threshold to 250
    - _Requirements: 1.10, 1.11, 1.5, 2.1, 11.5, 11.6, 11.7_

  - [x] 1.4 Update Dexie schema to v5 for multi-day model
    - Update schema definition: `'id, startDay, endDay, [startDay+eventType+isDeleted], eventType, isDeleted, modifiedAt'`
    - Add `version(5)` upgrade that clears `calendarEvents` table (no user data exists in deployed environments)
    - Remove old `day` index references
    - _Requirements: 11.1_

  - [x] 1.5 Update calendarEventService.ts for new model
    - Update `create(event)`: compute `totalHours` via `computeTotalHours()`; validate day range via `validateDayRange()`; for shifts call `computeEndDayForShift()` to auto-set `endDay`; validate time for reminders via `validateTimeForReminder()`; enforce one-shift-per-day using `startDay`
    - Update `update(id, changes)`: recompute `totalHours`; revalidate day range, time, and one-shift-per-day constraints with new model
    - Update `getByDateRange(startDate, endDate)`: use range intersection logic (`startDay <= endDate AND endDay >= startDate`) instead of exact `day` match
    - Update `getByDate(day)` / `getShiftsForDate(startDay, excludeId?)`: use `startDay` field; update query to match new schema
    - _Requirements: 1.1, 1.6, 7.2, 11.5, 11.6, 11.7_

  - [x] 1.6 Write property tests for new validation functions
    - **Property 2: Time validation for reminders rejects invalid intervals on same day**
    - **Property 16: Day range validation rejects invalid intervals**
    - **Property 17: Crossing midnight shift auto-sets endDay**
    - **Property 3: One-shift-per-day constraint enforcement** (updated to use `startDay`)
    - **Property 14: Required fields validation rejects incomplete events** (updated for new fields)
    - **Validates: Requirements 1.10, 1.11, 1.6, 2.1, 11.5, 11.6, 11.7**

- [x] 2. Migrate form and UI (React Web)
  - [x] 2.1 Update useEventForm.ts for multi-day and conditional times
    - Replace `day` form field with `startDay` and `endDay`
    - When shift selected: auto-populate `startTime`/`endTime` as read-only from shift definition; set `totalHours` from shift's `hoursWorked`; compute `endDay` via `computeEndDayForShift()` (crossing midnight)
    - When reminder selected: `startTime`/`endTime` remain editable via timepickers; recalculate `totalHours` on every time/day change via `computeTotalHours()`
    - Update validation calls to use new functions (`validateDayRange`, `validateTimeForReminder`)
    - Update day pre-selection logic to set both `startDay` and `endDay`
    - _Requirements: 1.2, 1.5, 1.6, 1.10, 1.11, 9.1–9.7_

  - [x] 2.2 Update EventForm.tsx for new fields and conditional editability
    - Add `endDay` date picker field
    - Make `startTime`/`endTime` fields conditionally read-only (shift) or editable (reminder)
    - Display `totalHours` as a read-only computed field (formatted as "Xh Ym")
    - Update notes `maxLength` attribute to 250
    - Update inline validation error messages for new validation rules
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 12.1_

  - [x] 2.3 Update EventDetailPage.tsx for new fields
    - Display `startDay`, `endDay`, `totalHours` fields
    - Apply same conditional time editability rules (shift=read-only, reminder=editable)
    - Show `totalHours` as read-only derived value
    - Apply crossing midnight rule when event type changes to shift
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 2.4 Update view components for range intersection filtering
    - DayView: show events where `startDay <= currentDay <= endDay`
    - WeekView: show events where `[startDay, endDay]` intersects `[monday, sunday]`
    - MonthView: show events where `[startDay, endDay]` intersects displayed month range
    - YearView: show events where `[startDay, endDay]` intersects displayed year range
    - Update EventCard rendering to show `startDay`–`endDay` where relevant
    - _Requirements: 3.4, 4.4, 5.4, 6.4_

  - [x] 2.5 Update useEventFiltering.ts for range intersection logic
    - Replace exact `day` match with range intersection: event visible if `startDay <= rangeEnd AND endDay >= rangeStart`
    - Update all view mode filtering to use the new intersection logic
    - _Requirements: 3.4, 4.4, 5.4, 6.4, 8.4_

  - [x] 2.6 Update i18n files with new keys
    - Add keys for: `startDay`, `endDay`, `totalHours`, day range validation error, time validation for reminders error, crossing midnight info
    - Update existing keys that referenced `day` to `startDay`
    - Update notes max length hint to 250
    - _Requirements: 12.3, 12.4_

  - [x] 2.7 Fix all existing tests for new model
    - Update all test fixtures from `day` to `startDay`/`endDay`
    - Update assertions for new validation functions
    - Update service test mocks for new CRUD signatures
    - Update form hook tests for conditional time editability and `totalHours` computation
    - Update view component tests for range intersection filtering
    - Ensure all property tests pass with new model
    - _Requirements: All_

- [x] 3. Migrate sync (React Web)
  - [x] 3.1 Update calendarEventSync.ts for new DTO fields
    - Update `CalendarEventSyncRecord` interface: rename `day` to `startDay`, add `endDay`, add `totalHours`
    - Update push logic to include new fields in payload
    - Update pull logic to map new fields from API response to local store
    - Update conflict resolution to handle new fields correctly
    - _Requirements: 10.1, 10.5, 10.7_

- [x] 4. Migrate backend
  - [x] 4.1 Update CalendarEvent.cs entity for new model
    - Rename `Day` property to `StartDay` (type: `DateOnly`)
    - Add `EndDay` property (type: `DateOnly`)
    - Add `TotalHours` property (type: `int`)
    - Update `Notes` max length from 200 to 250 in EF Core configuration
    - _Requirements: 11.1_

  - [x] 4.2 Update EF Core configuration and add migration
    - Update `CalendarEventConfiguration.cs`: rename `Day` column to `StartDay`, add `EndDay` column (DATE, NOT NULL), add `TotalHours` column (INT, NOT NULL), update Notes to VARCHAR(250)
    - Add new EF Core migration for schema changes
    - Add index on `EndDay` column
    - _Requirements: 11.1_

  - [x] 4.3 Update sync DTOs with new fields
    - Update `CalendarEventSyncRecord`: rename `Day` to `StartDay`, add `EndDay` (string, ISO date), add `TotalHours` (int)
    - Update `CalendarEventSyncPushRequest` and `CalendarEventSyncPullResponse` accordingly
    - _Requirements: 10.1, 10.9_

  - [x] 4.4 Update CalendarEventSyncPushService validation
    - Remove the global `EndTime > StartTime` validation check
    - Add `EndDay >= StartDay` validation
    - Add time validation for reminders only (same-day: `EndTime > StartTime`)
    - Validate `TotalHours` is present and non-negative
    - _Requirements: 11.5, 11.6_

  - [x] 4.5 Update CalendarEventSyncPullService for new fields
    - Ensure pull responses include `StartDay`, `EndDay`, `TotalHours` fields
    - Update any query logic that used `Day` to use `StartDay`
    - _Requirements: 10.9_

  - [x] 4.6 Update backend unit tests
    - Update test fixtures from `Day` to `StartDay`/`EndDay`/`TotalHours`
    - Update push validation tests: remove EndTime > StartTime assertion, add EndDay >= StartDay assertion
    - Add tests for new time validation rules (reminders same-day only)
    - Update pull tests for new fields
    - _Requirements: 10.1, 10.9, 11.5, 11.6_

- [x] 5. Migrate Android
  - [x] 5.1 Update Android entities and models for new fields
    - Rename `day` to `startDay` in entity, domain model, and display model
    - Add `endDay: String` field (ISO date YYYY-MM-DD)
    - Add `totalHours: Int` field (minutes, computed)
    - Update notes max length reference to 250
    - _Requirements: 11.1_

  - [x] 5.2 Update CalendarEventDao.kt queries
    - Update all queries that reference `day` column to `startDay`
    - Update `getByDateRange` to use range intersection: `startDay <= :endDate AND endDay >= :startDate`
    - Update `getShiftsForDate` to query by `startDay`
    - Add index on `endDay` column
    - _Requirements: 3.4, 4.4, 5.4, 6.4_

  - [x] 5.3 Update CalendarEventRepository.kt for new validation
    - Update `create()`: compute `totalHours`, validate day range, handle crossing midnight for shifts, validate time for reminders
    - Update `update()`: recompute `totalHours`, revalidate with new rules
    - Update one-shift-per-day check to use `startDay`
    - _Requirements: 1.1, 1.6, 2.1, 7.2, 11.5, 11.6, 11.7_

  - [x] 5.4 Update CalendarEventValidation.kt with new rules
    - Remove old `validateTimeRange` function
    - Add `validateDayRange(startDay, endDay)`: returns true if `endDay >= startDay`
    - Add `validateTimeForReminder(startDay, endDay, startTime, endTime)`: same logic as TypeScript version
    - Add `computeTotalHours(eventType, startDay, endDay, startTime, endTime, shiftHoursWorked?)`: same logic as TypeScript version
    - Add `computeEndDayForShift(startDay, startTime, endTime)`: crossing midnight = `startDay + 1`
    - Update `validateNotes` threshold to 250
    - _Requirements: 1.10, 1.11, 11.5, 11.6, 11.7_

  - [x] 5.5 Update Room migration for new schema
    - Add Room migration (increment version): rename `day` to `startDay`, add `endDay` TEXT NOT NULL, add `totalHours` INTEGER NOT NULL
    - Clear existing calendar event data (no user data in deployed environments)
    - Update indices
    - _Requirements: 11.1_

  - [x] 5.6 Update CalendarViewModel.kt form state
    - Replace `day` state with `startDay`/`endDay`
    - Add `totalHours` computed state (read-only)
    - Implement conditional time editability: shift = read-only times, reminder = editable times
    - Auto-populate shift times from definition; compute `endDay` via crossing midnight rule
    - Recalculate `totalHours` on time/day changes for reminders
    - Update day pre-selection to set both `startDay` and `endDay`
    - _Requirements: 1.5, 1.6, 9.1–9.7_

  - [x] 5.7 Update EventFormScreen.kt UI for new fields
    - Add `endDay` date picker
    - Make time fields conditionally read-only (shift) or editable (reminder)
    - Display `totalHours` as formatted read-only field
    - Update notes maxLength to 250
    - Update validation error messages for new rules
    - _Requirements: 1.2, 1.3, 1.5, 7.1, 12.1_

  - [x] 5.8 Update view composables for range intersection filtering
    - DayView: show events where `startDay <= currentDay <= endDay`
    - WeekView: range intersection with displayed week
    - MonthView: range intersection with displayed month
    - YearView: range intersection with displayed year
    - _Requirements: 3.4, 4.4, 5.4, 6.4_

  - [x] 5.9 Update sync adapter DTOs
    - Update `CalendarEventSyncRecord` data class: rename `day` to `startDay`, add `endDay`, add `totalHours`
    - Update serialization/deserialization logic
    - _Requirements: 10.1, 10.9_

  - [x] 5.10 Update Android unit tests
    - Update all test fixtures from `day` to `startDay`/`endDay`/`totalHours`
    - Update validation tests for new functions
    - Update repository tests for new CRUD logic
    - Update ViewModel tests for conditional time editability and `totalHours` computation
    - Update sync adapter tests for new DTO fields
    - _Requirements: All_

- [x] 6. Final verification
  - [x] 6.1 Run all React Web tests
    - Run full test suite: `npm test` in `frontend/react-web`
    - Verify all property tests pass with new model
    - Verify all unit and integration tests pass
    - Fix any remaining failures
    - _Requirements: All React Web requirements_

  - [x] 6.2 Run backend tests
    - Run full test suite: `dotnet test` in `backend`
    - Verify push/pull services work with new fields
    - Verify EF Core migration applies cleanly
    - Fix any remaining failures
    - _Requirements: All backend requirements_

  - [x] 6.3 Run Android tests
    - Run full test suite in `frontend/android-app`
    - Verify Room migration applies cleanly
    - Verify all validation, repository, and ViewModel tests pass
    - Fix any remaining failures
    - _Requirements: All Android requirements_

## Notes

- This is a MIGRATION plan — the feature was already implemented with the old model (`day`, `startTime > endTime`). These tasks convert all three sub-projects to the new model.
- No user data exists in any deployed environment, so Dexie/Room migrations can safely clear existing calendar event tables.
- The backend migration renames the `Day` column to `StartDay` and adds `EndDay`/`TotalHours` columns.
- The `EndTime > StartTime` constraint is removed globally — it now only applies to reminder events where `endDay == startDay`.
- Shifts get auto-populated read-only times from the shift definition; `totalHours` comes from `hoursWorked`.
- Reminders get editable times; `totalHours` is computed from day/time difference.
- Crossing midnight (shift `endTime < startTime`) auto-sets `endDay = startDay + 1`.
- All view filtering changes from exact `day` match to range intersection (`startDay <= rangeEnd AND endDay >= rangeStart`).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.6"] },
    { "id": 3, "tasks": ["2.1", "2.5", "3.1"] },
    { "id": 4, "tasks": ["2.2", "2.3", "2.4", "2.6"] },
    { "id": 5, "tasks": ["2.7"] },
    { "id": 6, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 7, "tasks": ["4.4", "4.5", "4.6"] },
    { "id": 8, "tasks": ["5.1", "5.2", "5.4", "5.5"] },
    { "id": 9, "tasks": ["5.3", "5.6", "5.7", "5.8", "5.9"] },
    { "id": 10, "tasks": ["5.10"] },
    { "id": 11, "tasks": ["6.1", "6.2", "6.3"] }
  ]
}
```
