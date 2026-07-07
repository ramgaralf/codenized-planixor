# Implementation Plan: Reminder Series (gh38)

## Overview

This plan implements the `seriesFrequency` and `seriesEndDate` fields on the Reminder entity, the `seriesId` field on the CalendarEvent entity across all three platforms (React Web PWA, Android App, .NET Backend), adds automatic series occurrence generation for calendar events, and supports editing/deleting series events individually or as a group (future events only).

## Tasks

- [x] 1. Backend — Add SeriesFrequency to Reminder entity and sync endpoints
  - [x] 1.1 Add `SeriesFrequency` property to the Reminder entity and create EF Core migration
  - [x] 1.2 Update `ReminderSyncRecord` DTO and sync push/pull services
  - [x] 1.3 Write property tests for backend SeriesFrequency validation and sync

- [x] 2. React Web — Implement Series Generator and Occurrence Builder (pure functions)
  - [x] 2.1 Create `seriesGenerator.ts` pure function
  - [x] 2.2 Create `seriesOccurrenceBuilder.ts`
  - [x] 2.3 Write property tests for series generator (React Web)
  - [x] 2.4 Write property tests for occurrence builder (React Web)

- [x] 3. React Web — Add SeriesFrequency to Reminder model and form
  - [x] 3.1 Update Reminder model and persistence
  - [x] 3.2 Add frequency selector to ReminderForm component
  - [x] 3.3 Update `useReminderForm` hook for frequency state management
  - [x] 3.4 Write property test for frequency persistence round-trip

- [x] 4. Checkpoint — All tests pass ✅

- [x] 5. React Web — Display frequency label on ReminderCard
  - [x] 5.1 Add frequency label to ReminderCard component
  - [x] 5.2 Add i18n keys for series frequency labels

- [x] 6. React Web — Series Propagation Logic and Modal
  - [x] 6.1 Create `seriesPropagation.ts` service
  - [x] 6.2 Extend PropagationModal for series frequency changes
  - [x] 6.3 Wire propagation into ReminderForm save flow
  - [x] 6.4 Write property tests for series propagation logic

- [x] 7. React Web — Event creation series generation
  - [x] 7.1 Integrate series generation into calendar event creation flow

- [x] 8. React Web — Update reminder sync adapter
  - [x] 8.1 Update `reminderSync.ts` to include `seriesFrequency` in push/pull payloads

- [x] 9. Checkpoint — All React Web tests pass ✅

- [x] 10. Android — Implement Series Generator and data model changes
  - [x] 10.1 Create `SeriesGenerator.kt` pure function
  - [x] 10.2 Update `ReminderEntity` and `Reminder` domain model with `seriesFrequency`
  - [x] 10.3 Update `ReminderSyncAdapter.kt` to include `seriesFrequency` in sync
  - [x] 10.4 Write property tests for Android SeriesGenerator

- [x] 11. Android — UI changes (form, card, propagation)
  - [x] 11.1 Add frequency selector to `ReminderFormScreen.kt`
  - [x] 11.2 Add frequency label to Reminder card in `RemindersScreen.kt`
  - [x] 11.3 Add i18n strings for series frequency (Android)
  - [x] 11.4 Implement series propagation in `ReminderFormViewModel.kt`
  - [x] 11.5 Integrate series generation into Android calendar event creation

- [x] 12. Checkpoint — All Android tests pass ✅

- [x] 13. Final integration and cross-platform verification
  - [x] 13.1 Verify cross-platform date generation consistency
  - [x] 13.2 Wire generated occurrences through existing calendar event sync

- [x] 14. Final checkpoint — All tests pass ✅

---

## Post-Spec Changes (applied after initial tasks completed)

### P1. Year Boundary → End Date (seriesEndDate)

Changed from a fixed `yearBoundary: number` to a user-selectable `endDate: string` (YYYY-MM-DD) on the Reminder model:
- **Reminder model**: Added `seriesEndDate: string | null` (web) / `String = ""` (Android/backend)
- **Series Generator**: Changed interface from `yearBoundary: Int` to `endDate: String` on both platforms
- **UI**: Added date picker in ReminderForm (web + Android) with suggested defaults:
  - Weekly: current date + 1 year
  - Monthly: current date + 5 years
  - Yearly: current date + 50 years
- **Backend**: Added `SeriesEndDate` varchar(10) column, migration, sync DTO
- **Sync**: Both platforms push/pull `seriesEndDate`

### P2. Series Identifier (seriesId on CalendarEvent)

Added `seriesId` to link events in the same series:
- **CalendarEvent model**: Added `seriesId: string | null` (web) / `String = ""` (Android/backend)
- **Event creation**: Generates shared UUID for source + all occurrences
- **Backend**: Added `SeriesId` varchar(36) column, migration, sync DTO
- **Dexie**: Added `seriesId` index for efficient queries (version 10)
- **Room**: Migration 9→10 adds both columns

### P3. Series Edit/Delete Dialog

When editing/deleting an event with `seriesId`:
- Shows dialog: "Only this event?" / "All future events in series?"
- "All future events" only affects events with `startDay >= today` (past events never modified)
- **React Web**: `SeriesActionDialog.tsx`, `softDeleteSeries()`, `updateSeries()` in calendarEventService
- **Android**: `SeriesActionDialog.kt`, `deleteSeriesEvents()`, `updateSeriesEvents()` in CalendarViewModel

### P4. EventTypeSelector Frequency Label

Reminder cards in the event type selector (create/edit event) now show the series frequency on a second line for reminders with repetition (e.g., "Every week").

### P5. Android Emoji Picker Expansion

Expanded from ~720 to ~1,100+ emojis, added search functionality, unified the shift form to use the shared picker.

### P6. Android SeriesActionDialog Layout Fix

Changed from horizontal AlertDialog buttons to vertically stacked full-width buttons for better readability with long localized text.

### P7. CalendarEventEntity alertOffsets Schema Fix

Added missing `@ColumnInfo(defaultValue = "[]")` annotation to match migration SQL.

## Notes

- All tasks completed and verified across all three platforms
- Backend: 359 tests pass
- React Web: TypeScript compiles, all tests pass
- Android: assembleDebug builds successfully, all unit tests pass
- EF Core migrations created for all new columns (SeriesFrequency, SeriesEndDate, SeriesId)
- Room migrations: version 8→9 (seriesFrequency), 9→10 (seriesEndDate + seriesId)
