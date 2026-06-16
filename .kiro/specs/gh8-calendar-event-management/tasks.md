# Implementation Plan: Calendar Event Management

## Overview

This plan implements the Calendar Event Management feature across three sub-projects: React Web (PWA), Android App, and Backend API. The approach starts with shared data models and validation logic, then builds the service layer, UI components, and finally sync integration. The React Web implementation is prioritized first, followed by backend sync endpoints and Android parity.

## Tasks

- [x] 1. Set up feature module structure and data layer (React Web)
  - [x] 1.1 Create the `calendar-events` feature module directory structure
    - Create `src/features/calendar-events/` with subdirectories: `components/`, `hooks/`, `services/`
    - Create `models.ts` with `CalendarEvent`, `CalendarEventDisplay`, `ValidationResult` interfaces
    - Create `constants.ts` with view modes, time constants (MAX_MINUTES = 1439, MAX_NOTES_LENGTH = 200)
    - _Requirements: 11.1, 11.2_

  - [x] 1.2 Create pure validation functions in `validation.ts`
    - Implement `validateTimeRange(startTime, endTime)` returning boolean
    - Implement `validateRequiredFields(event)` returning `ValidationResult`
    - Implement `validateNotes(notes)` returning boolean
    - Implement `checkOneShiftPerDay(day, eventType, existingEvents, excludeEventId?)` returning boolean
    - All functions must be pure with no side effects — shared between form and service layers
    - _Requirements: 1.8, 1.9, 2.1, 2.3, 2.4, 2.5, 11.5_

  - [x] 1.3 Write property tests for validation functions
    - **Property 2: Time range validation rejects invalid intervals**
    - **Property 3: One-shift-per-day constraint enforcement**
    - **Property 14: Required fields validation rejects incomplete events**
    - **Validates: Requirements 1.8, 1.9, 2.1, 2.3, 2.4, 2.5, 11.5**

  - [x] 1.4 Create utility functions in `utils.ts`
    - Implement `formatDuration(startTime, endTime)` returning "Xh Ym" format string
    - Implement date range calculation helpers for each view mode (day, week, month, year)
    - _Requirements: 3.2, 4.2_

  - [x] 1.5 Update Dexie database schema to version 4
    - Add `calendarEvents` table schema: `'id, day, [day+eventType+isDeleted], eventType, isDeleted, modifiedAt'`
    - Add upgrade path that clears the v1–v3 `calendarEvents` table (no user data exists)
    - _Requirements: 11.1, 11.3_

  - [x] 1.6 Implement `calendarEventService.ts` with CRUD operations
    - Implement `create(event)`: generate UUID, set `modifiedAt` to UTC now, `syncedAt` to null, `isDeleted` to false; enforce dual validation (time range + one-shift-per-day) before persisting
    - Implement `update(id, changes)`: set `modifiedAt` to UTC now, `syncedAt` to null; enforce dual validation before persisting
    - Implement `softDelete(id)`: set `isDeleted` to true, `modifiedAt` to UTC now, `syncedAt` to null
    - Implement `getByDateRange(startDate, endDate)`: filter `isDeleted === false`, derive display fields from shift/reminder store
    - Implement `getByDate(day)`: filter by exact day, `isDeleted === false`, derive display fields
    - Implement `getShiftsForDate(day, excludeId?)`: return non-deleted shift events for a given day
    - Implement orphaned reference fallback: if referenced shift/reminder not found, use name="Unknown", icon="❓", backgroundColor="transparent"
    - _Requirements: 1.1, 7.2, 8.2, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 1.7 Write property tests for calendarEventService
    - **Property 1: Write operations update change tracking fields**
    - **Property 5: Display fields derived from referenced entity at read time**
    - **Property 15: Referential protection prevents physical deletion of referenced entities**
    - **Validates: Requirements 1.1, 1.4, 7.2, 8.2, 11.2, 11.4**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement calendar store navigation and Event_Type_Selector (React Web)
  - [x] 3.1 Extend `calendarStore.ts` with granular navigation methods
    - Add `navigateDay(direction)`, `navigateWeek(direction)`, `navigateMonth(direction)`, `navigateYear(direction)` methods
    - Each method accepts +1 or -1 direction for forward/backward
    - Deprecate existing `navigateForward` / `navigateBackward` by retaining them but using the new granular methods internally
    - Existing `persist` middleware and `activeView` persistence remain unchanged (satisfies Requirement 12.5)
    - _Requirements: 3.3, 4.3, 5.3, 6.3, 12.5_

  - [x] 3.2 Implement `EventTypeSelector.tsx` component
    - Query shifts table where `isActive === true` AND `isDeleted === false`
    - Query reminders table where `isActive === true` AND `isDeleted === false`
    - Format options as `"{type}: {name}"` sorted alphabetically by display name
    - On selection, emit `eventType` ("shift" or "reminder") and `eventTypeId` (UUID)
    - Derive and display read-only fields (name, icon, backgroundColor) from selection
    - _Requirements: 1.4, 1.5, 13.4_

  - [x] 3.3 Write property test for EventTypeSelector filtering logic
    - **Property 4: Event type selector filters to active non-deleted items**
    - **Validates: Requirements 1.5, 13.4**

- [x] 4. Implement EventForm and create/edit flows (React Web)
  - [x] 4.1 Implement `useEventForm.ts` hook
    - Manage form state for all fields: eventType, eventTypeId, day, startTime, endTime, notes
    - Implement `useDayPreSelection` logic: pre-select day based on current view mode and navigated date per Requirements 9.1–9.6
    - Call validation functions on submit; prevent submission and set field-level errors on failure
    - Clear individual field errors immediately when user corrects the field value
    - Display one-shift-per-day error as form-level message (not field-level)
    - On successful create: clear form, navigate back to CalendarPage
    - On cancel: discard all data, navigate back preserving view state
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 1.9, 1.10, 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 4.2 Implement `EventForm.tsx` component
    - Render all required fields: EventTypeSelector, day picker, start time, end time, notes (optional, max 200 chars)
    - Show read-only derived fields (name, icon, backgroundColor) from selected type
    - Display inline validation errors below affected fields
    - Show all validation errors simultaneously (not one at a time)
    - Localize all error messages via i18n (ES/EN)
    - _Requirements: 1.2, 1.3, 1.4, 1.8, 1.9, 1.10, 2.2, 12.1_

  - [x] 4.3 Implement `EventDetailPage.tsx` component
    - Display all event fields with editability: eventType (editable), day (editable), startTime (editable), endTime (editable), notes (editable); name, icon, backgroundColor as read-only
    - Enforce same validation rules as creation (including one-shift-per-day excluding current event)
    - On save: update record via service, navigate back to CalendarPage
    - On cancel/back navigation: discard unsaved changes, preserve view state
    - Handle deleted/deactivated reference: show current type in selector, allow change to any active non-deleted type
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.4 Implement delete flow with `ConfirmationModal.tsx`
    - Show modal with event name and permanent deletion message on delete action
    - On confirm: call `softDelete`, dismiss modal, navigate back to CalendarPage
    - On dismiss (cancel, outside click, escape): close modal, no changes to record
    - On storage failure: dismiss modal, show error message, guarantee record unchanged
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 4.5 Write unit tests for useEventForm hook
    - Test form state management, validation trigger, error clearing behavior
    - Test day pre-selection logic for each view mode
    - Test cancel discards data and preserves view state
    - _Requirements: 1.6, 1.7, 1.10, 9.1–9.6_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement calendar view components (React Web)
  - [x] 6.1 Migrate and implement `DayView.tsx`
    - Migrate existing `src/components/calendar/DayView.tsx` into `src/features/calendar-events/components/DayView.tsx`
    - Render vertical timeline 00:00–23:59 with 1-hour slots
    - Position events by startTime; show overlapping events side by side
    - Render EventCard with: backgroundColor, icon + name (truncated with ellipsis), startTime + endTime (HH:mm) + duration ("Xh Ym"), notes (truncated single line)
    - Implement CurrentTimeIndicator: blue horizontal line with circle marker, shown only for current date, updated every 60 seconds
    - Auto-scroll to center current hour on open (current date only)
    - Navigate to EventDetailPage on EventCard tap/click
    - Implement DayNavigator, MonthNavigator, YearNavigator controls
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 6.2 Migrate and implement `WeekView.tsx`
    - Migrate existing `src/components/calendar/WeekView.tsx` into `src/features/calendar-events/components/WeekView.tsx`
    - Display 7 day blocks (Monday–Sunday) with headers (day name + date, current day highlighted)
    - Render EventCards ordered by startTime: backgroundColor, icon + name (📝 appended if notes exist, truncated at 25 chars with ellipsis), startTime + endTime + total hours
    - Implement WeekNavigator (±7 days) and YearNavigator (±1 year preserving ISO week number)
    - Filter: `isDeleted === false` AND `day` within displayed Monday–Sunday range
    - Navigate to EventDetailPage on EventCard tap/click
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.3 Migrate and implement `MonthView.tsx`
    - Migrate existing `src/components/calendar/MonthView.tsx` into `src/features/calendar-events/components/MonthView.tsx`
    - Display grid of day blocks covering full weeks of current month; dim adjacent month days
    - Current day distinguished with `primary-blue` circle/ring
    - Event container: shift backgroundColor as background (transparent if none); display all event emojis (shifts first, then reminders); cap at 5 emojis + overflow count
    - Implement MonthNavigator and YearNavigator
    - Navigate to DayView on day block tap/click
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.4 Migrate and implement `YearView.tsx`
    - Migrate existing `src/components/calendar/YearView.tsx` into `src/features/calendar-events/components/YearView.tsx`
    - Display all 12 months with days; highlight current day
    - Day indicators: colored circle for shift (using backgroundColor); first reminder emoji (upper-right) if only reminders; both if both types; none if no events
    - Implement YearNavigator (±1 year)
    - Navigate to EventDetailPage (showing day's events as cards) on day tap/click; display error + retry on navigation failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.5 Implement `ViewSelector.tsx` and migrate `DateNavigator`
    - Migrate existing `ViewSelector.tsx` to feature module
    - Connect to `calendarStore` for view mode switching
    - Remove old `src/components/calendar/` directory after migration complete
    - Update `CalendarDashboard.tsx` (or equivalent page) to import from feature module
    - _Requirements: 12.2, 12.5_

  - [x] 6.6 Write property tests for view filtering and rendering rules
    - **Property 6: View filtering excludes deleted events and out-of-range dates**
    - **Property 7: Event card rendering contains all required display data**
    - **Property 8: Month view container rendering rules**
    - **Property 9: Year view day indicators follow event type rules**
    - **Validates: Requirements 3.2, 3.4, 4.2, 4.4, 5.2, 5.4, 6.2, 6.4, 8.4**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement calendar event container and page wiring (React Web)
  - [x] 8.1 Implement `calendar-events.tsx` container component
    - Orchestrate all sub-components: ViewSelector, navigator controls, view components (DayView/WeekView/MonthView/YearView), EventForm, EventDetailPage
    - Use `useCalendarEvents` hook for CRUD operations and query logic
    - Use `useEventFiltering` hook to filter events by date range and isDeleted
    - Use `useViewNavigation` hook for view mode state and navigation logic
    - Wire "New Event" action from top bar to open EventForm
    - _Requirements: 3.4, 4.4, 5.4, 6.4, 12.2, 12.5_

  - [x] 8.2 Implement `useCalendarEvents.ts` hook
    - Expose CRUD operations wrapping `calendarEventService`
    - Provide query methods for current view's date range
    - Handle loading states and error states
    - _Requirements: 1.1, 7.2, 8.2_

  - [x] 8.3 Implement `useEventFiltering.ts` hook
    - Single filtering function for `isDeleted === false` + date range based on active view mode
    - Reusable across all four views to avoid duplication
    - _Requirements: 3.4, 4.4, 5.4, 6.4, 8.4_

  - [x] 8.4 Update page routing and CalendarPage integration
    - Update `CalendarDashboard.tsx` / `CalendarPage.tsx` to render `calendar-events` feature container
    - Wire routing for EventDetailPage (event detail/edit view)
    - Ensure "New Event" button in top bar is conditionally visible on Calendar page only
    - _Requirements: 12.2, 13.2_

  - [x] 8.5 Write integration tests for calendar-events container
    - Test create flow end-to-end: fill form → submit → event appears in view
    - Test edit flow: open detail → modify → save → view updated
    - Test delete flow: open detail → delete → confirm → event removed from view
    - Test view switching and navigation preserves state
    - _Requirements: 1.1, 1.7, 7.5, 8.4, 12.5_

- [x] 9. Implement sync service for calendar events (React Web)
  - [x] 9.1 Implement `calendarEventSync.ts` sync module
    - Implement push logic: query records where `syncedAt` is null or `modifiedAt > syncedAt`; batch into groups of 100; send sequentially; set `syncedAt` on acknowledgment
    - Implement pull logic: request records modified after `lastSyncedAt`; paginate with cursor (100 per page); continue until cursor is null
    - Implement conflict resolution: LWW based on `modifiedAt`; remote wins on ties
    - Implement pull insert: new remote records inserted with `syncedAt` set to current UTC
    - Implement pull overwrite: local records with `modifiedAt <= syncedAt` overwritten by remote
    - Implement pull with `isDeleted === true`: set local record to deleted or insert as deleted
    - Discard foreign/rejected records without persisting
    - Register with existing SyncService cross-cutting module
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 13.3_

  - [x] 9.2 Write property tests for sync logic
    - **Property 10: Sync push batches records correctly**
    - **Property 11: Sync conflict resolution uses last-writer-wins with remote preference on ties**
    - **Property 12: Sync pull inserts new remote records**
    - **Property 13: Sync pull overwrites unmodified local records**
    - **Validates: Requirements 10.1, 10.3, 10.5, 10.6, 10.7, 10.8**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement backend API sync endpoints
  - [x] 11.1 Create `CalendarEvent` entity in `Codenized.Planixor.Core`
    - Define entity with fields: Id, UserId, EventType, EventTypeId, Day, StartTime, EndTime, Notes, ModifiedAt, SyncedAt, IsDeleted
    - Add EF Core configuration: table name `CalendarEvents`, column types, constraints (EventType CHECK, StartTime/EndTime range CHECKs, EndTime > StartTime CHECK)
    - Add migration for MySQL table creation with indexes on UserId and Day
    - _Requirements: 11.1_

  - [x] 11.2 Create sync DTOs in `Codenized.Planixor.Dtos`
    - Create `CalendarEventSyncPushRequest` with `Records` list of `CalendarEventSyncRecord`
    - Create `CalendarEventSyncPushResponse` with `AcknowledgedIds` and `RejectedIds` (with reason)
    - Create `CalendarEventSyncPullRequest` (query params: lastSyncedAt, cursor)
    - Create `CalendarEventSyncPullResponse` with `Records` list and `Cursor` (null = no more pages)
    - _Requirements: 10.1, 10.9_

  - [x] 11.3 Implement `CalendarEventSyncPushService` in UseCases
    - Validate request: reject records with missing required fields (400)
    - Enforce ownership: reject records not owned by authenticated user (403, no data exposed)
    - Upsert records: insert new or update existing based on `ModifiedAt` LWW
    - Return acknowledged and rejected IDs
    - _Requirements: 10.1, 13.6_

  - [x] 11.4 Implement `CalendarEventSyncPullService` in UseCases
    - Query records for authenticated user modified after `lastSyncedAt`
    - Paginate at 100 records per response with cursor
    - Return null cursor when fewer than 100 records remain
    - Enforce user ownership — never return records belonging to other users
    - _Requirements: 10.9, 13.6_

  - [x] 11.5 Create API endpoints in `Endpoints/CalendarEvent/`
    - Create `CalendarEventRegisterEndpoints.cs` to register route group
    - Create `CalendarEventSyncPushEndpoints.cs`: POST `/api/v1/calendar-events/push` — requires authentication + active subscription
    - Create `CalendarEventSyncPullEndpoints.cs`: GET `/api/v1/calendar-events/pull?lastSyncedAt={ISO}&cursor={string}` — requires authentication + active subscription
    - Return 401 for unauthenticated, 403 for no subscription
    - _Requirements: 10.1, 10.9, 13.6_

  - [x] 11.6 Write unit tests for backend sync services (NUnit)
    - Test push validation: missing fields → 400
    - Test push ownership enforcement: foreign record → rejected
    - Test push upsert: LWW resolution
    - Test pull pagination: cursor-based, max 100 per page
    - Test pull ownership: only returns authenticated user's records
    - _Requirements: 10.1, 10.9, 13.6_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement Android calendar event management
  - [x] 13.1 Create data layer: entity, DAO, and repository
    - Create `CalendarEventEntity.kt` Room entity with all fields matching the data model
    - Create `CalendarEventDao.kt` with queries: insert, update, getByDateRange, getByDate, getShiftsForDate, getUnsynced
    - Create `CalendarEventRepository.kt` implementing CRUD with dual validation and change tracking
    - Add Room database migration for `calendar_events` table
    - _Requirements: 11.1, 11.3, 11.4, 11.5_

  - [x] 13.2 Create domain layer: model, validation, display model
    - Create `CalendarEvent.kt` domain model
    - Create `CalendarEventValidation.kt` with pure validation functions (same logic as TypeScript)
    - Create `CalendarEventDisplay.kt` with derived display fields and orphaned reference fallback
    - _Requirements: 1.8, 1.9, 2.1, 11.2, 11.5_

  - [x] 13.3 Implement `CalendarViewModel.kt` with state management
    - Manage view mode state, navigation, current date
    - Expose CRUD operations wrapping repository
    - Handle filtering by date range and isDeleted
    - Implement day pre-selection logic per Requirements 9.1–9.6
    - _Requirements: 3.4, 4.4, 5.4, 6.4, 9.1–9.6, 12.5_

  - [x] 13.4 Implement presentation layer: screens and composables
    - Create `CalendarScreen.kt` main composable with ViewSelector and view components
    - Create `EventFormScreen.kt` with same fields and validation as React Web
    - Create `EventDetailScreen.kt` with edit/delete flows
    - Create view composables: `DayView.kt`, `WeekView.kt`, `MonthView.kt`, `YearView.kt`
    - Create `EventCard.kt`, `EventTypeSelector.kt`, `ViewSelector.kt` components
    - Implement confirmation dialog for deletion with event name
    - _Requirements: 1.2, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 12.1, 12.2_

  - [x] 13.5 Implement `CalendarEventSyncAdapter.kt` sync module
    - Integrate with existing SyncService (WorkManager)
    - Push/pull logic matching React Web behavior: batching, LWW conflict resolution, cursor pagination
    - _Requirements: 10.1, 10.3, 10.5, 10.7, 10.9_

  - [x] 13.6 Write unit tests for Android domain and repository layers
    - Test validation functions match TypeScript implementation behavior
    - Test repository CRUD with change tracking
    - Test sync adapter conflict resolution
    - _Requirements: 1.8, 2.1, 10.3, 11.4, 11.5_

- [x] 14. Implement cross-platform concerns (React Web + Android)
  - [x] 14.1 Implement theme and language responsiveness
    - Ensure all calendar event screens respond to theme changes immediately without restart (React Web: CSS variables; Android: Compose recomposition)
    - Ensure all user-facing text uses i18n keys (ES/EN) and responds to language changes immediately
    - _Requirements: 12.3, 12.4_

  - [x] 14.2 Implement user data isolation
    - React Web: ensure calendarEventService only queries local Dexie store (implicit ownership); sync service discards foreign records
    - Android: ensure repository operates on local SQLite only; sync adapter discards foreign records
    - Handle sign-out/sign-in: previous user's data inaccessible to new user
    - Free (anonymous) users: sync remains inactive, all data local
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The React Web implementation is prioritized first (tasks 1–10) as the primary development platform
- Backend sync endpoints (task 11) can be developed in parallel with Android once the React Web data layer is stable
- The existing `src/components/calendar/` directory is removed after all view components are migrated to the feature module (task 6.5)
- The existing `calendarStore.ts` is extended in-place (not moved) since it is used by routing/page-level concerns outside the feature module

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.3", "1.6", "3.1"] },
    { "id": 3, "tasks": ["1.7", "3.2"] },
    { "id": 4, "tasks": ["3.3", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 7, "tasks": ["6.5", "6.6"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 9, "tasks": ["8.4", "8.5", "9.1"] },
    { "id": 10, "tasks": ["9.2", "11.1", "11.2"] },
    { "id": 11, "tasks": ["11.3", "11.4"] },
    { "id": 12, "tasks": ["11.5", "11.6"] },
    { "id": 13, "tasks": ["13.1", "13.2"] },
    { "id": 14, "tasks": ["13.3", "13.4"] },
    { "id": 15, "tasks": ["13.5", "13.6"] },
    { "id": 16, "tasks": ["14.1", "14.2"] }
  ]
}
```
