# Implementation Plan: Shift Mode

## Overview

This plan implements the Shift Mode feature across all three projects: Backend (.NET 10), React Web PWA (TypeScript), and Android App (Kotlin). Tasks are ordered so backend work completes first (entity, EF config, migration, endpoints), then React Web, then Android. Each task is independently testable and follows existing project patterns for similar entities (CalendarEvent, Shift, Reminder).

## Tasks

- [x] 1. Backend — Entity, Persistence, and Sync Endpoints
  - [x] 1.1 Create `ShiftModeSetting` domain entity in Core
    - Create `Codenized.Planixor.Core/Entities/ShiftModeSetting.cs`
    - Implement sealed class with `Id` (Guid), `UserId` (string), `Enabled` (bool), `ModifiedAt` (DateTime), `SyncedAt` (DateTime?), `IsDeleted` (bool)
    - Add factory methods: `Create(userId)` (defaults enabled=false), `CreateFromSync(...)`, `ApplySync(...)`, `MarkSynced()`
    - Follow the same pattern as existing `Shift` or `Reminder` entities
    - _Requirements: 2.1_

  - [x] 1.2 Write unit tests for `ShiftModeSetting` entity
    - Test `Create` sets defaults correctly (enabled=false, modifiedAt set, syncedAt=null)
    - Test `ApplySync` overwrites fields and updates syncedAt
    - Test `MarkSynced` updates syncedAt to current UTC
    - **Property 1: Setting state management**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 1.3 Create EF Core configuration for `ShiftModeSettings` table
    - Create `Codenized.Planixor.Persistence.MySql.Efc.DataContext/Entities/ShiftModeSettingConfiguration.cs`
    - Configure table name `ShiftModeSettings`, PK on `Id` (char(36)), `UserId` varchar(50) indexed, `Enabled` tinyint(1) default 0, `ModifiedAt` datetime(6), `SyncedAt` datetime(6) nullable, `IsDeleted` tinyint(1) default 0
    - Register the entity in `ApplicationWriteContext` and `ApplicationReadContext`
    - _Requirements: 2.1_

  - [x] 1.4 Create EF Core migration for `ShiftModeSettings` table
    - Generate migration using `dotnet ef migrations add AddShiftModeSettings`
    - Verify migration creates table with correct columns, index on `UserId`
    - _Requirements: 2.1_

  - [x] 1.5 Create Sync DTOs for ShiftModeSetting
    - Create `Codenized.Planixor.Dtos/ShiftModeSetting/Sync/ShiftModeSettingSyncPushRequest.cs` with `Records` array (max 1 item)
    - Create `Codenized.Planixor.Dtos/ShiftModeSetting/Sync/ShiftModeSettingSyncPullResponse.cs` with `Records`, `Cursor`, `HasMore`
    - Create request validator (records array must have 0 or 1 record)
    - _Requirements: 2.3_

  - [x] 1.6 Create repository for ShiftModeSetting
    - Create `Codenized.Planixor.Persistence.MySql.Efc.Repositories/ShiftModeSettingRepository.cs`
    - Implement query by UserId, upsert, and filtered pull query (SyncedAt > lastSyncedAt)
    - Follow existing repository patterns (e.g., ShiftRepository)
    - _Requirements: 2.3, 2.4_

  - [x] 1.7 Implement SyncPush use case for ShiftModeSetting
    - Create `Codenized.Planixor.UseCases/ShiftModeSetting/SyncPush/ShiftModeSettingSyncPushService.cs`
    - Implement LWW upsert: if remote modifiedAt > local modifiedAt, overwrite; otherwise ignore
    - Set `SyncedAt` on successful push
    - Follow the same pattern as `Shift/SyncPush`
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 1.8 Implement SyncPull use case for ShiftModeSetting
    - Create `Codenized.Planixor.UseCases/ShiftModeSetting/SyncPull/ShiftModeSettingSyncPullService.cs`
    - Return records where `SyncedAt > lastSyncedAt` for the authenticated user
    - Support cursor-based pagination (max 100 records per page)
    - Follow the same pattern as `Shift/SyncPull`
    - _Requirements: 2.3_

  - [x] 1.9 Create API endpoints for ShiftModeSetting sync
    - Create `Codenized.Planixor.Api/Endpoints/ShiftModeSetting/ShiftModeSettingRegisterEndpoints.cs`
    - Create `ShiftModeSettingSyncPushEndpoints.cs` — POST `/api/shift-mode-settings/sync/push`
    - Create `ShiftModeSettingSyncPullEndpoints.cs` — GET `/api/shift-mode-settings/sync/pull?lastSyncedAt=&cursor=`
    - Register endpoints in `RegisterEndpoints.cs`
    - Both endpoints require API key authentication and enforce user-scoped access
    - _Requirements: 2.3_

  - [x] 1.10 Write unit tests for SyncPush and SyncPull services
    - Test push with new record creates entity
    - Test push with LWW: newer remote wins, older remote is ignored
    - Test pull returns only records modified after lastSyncedAt
    - Test pull pagination with cursor
    - **Property 2: Last-Writer-Wins conflict resolution**
    - **Validates: Requirements 2.4, 2.5**

- [x] 2. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. React Web — Shift Mode Setting & Sync
  - [x] 3.1 Create ShiftModeSetting model and IndexedDB schema
    - Create `features/shift-mode/models.ts` with `ShiftModeSetting` interface
    - Update Dexie database schema to version 9 adding `shiftModeSettings: 'id, modifiedAt'`
    - _Requirements: 2.1_

  - [x] 3.2 Create `useShiftMode` hook
    - Create `features/shift-mode/hooks/useShiftMode.ts`
    - Use Dexie `useLiveQuery` to reactively read the single ShiftModeSetting record
    - On first access, if no record exists, create one with `enabled=false`
    - Return `{ enabled, toggle, isLoading }`
    - _Requirements: 1.3, 2.1, 2.6_

  - [x] 3.3 Create `ShiftModeSection` component for Settings page
    - Create `features/shift-mode/components/ShiftModeSection.tsx`
    - Render toggle switch + localized description explaining Shift Mode effect
    - Position after user manual section in Settings page
    - Wire toggle to `useShiftMode` hook
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 3.4 Add i18n strings for Shift Mode (Spanish and English)
    - Add all Shift Mode related strings to both locale files: toggle label, description, modal texts, card labels, button texts
    - Include Day_Action_Modal date format patterns
    - _Requirements: 1.7, 9.1, 9.2, 9.7_

  - [x] 3.5 Integrate ShiftModeSetting into the sync service
    - Add `shift-mode-settings` entity to `syncServiceController.ts`
    - Implement push adapter: push records where `modifiedAt > syncedAt` (max 1 record)
    - Implement pull adapter: pull from `/api/shift-mode-settings/sync/pull`, apply LWW merge
    - Normalize DateTime ISO format (append `Z` if no timezone indicator)
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.6 Write unit tests for `useShiftMode` hook and sync adapter
    - Test default record creation on first access
    - Test toggle updates enabled and modifiedAt, nullifies syncedAt
    - Test sync pull with LWW merge (newer remote wins, older is ignored)
    - **Property 1: Setting state management**
    - **Property 2: Last-Writer-Wins conflict resolution**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

- [x] 4. React Web — Calendar View Restrictions
  - [x] 4.1 Modify View_Selector to conditionally filter views
    - When shift mode is enabled, pass only `['month', 'year']` to View_Selector
    - When shift mode is disabled, pass all four views `['day', 'week', 'month', 'year']`
    - Use `useShiftMode` hook reactively
    - _Requirements: 3.1, 4.1, 4.8_

  - [x] 4.2 Handle view transition on Shift Mode activation
    - If currently on Day or Week view when shift mode is activated, navigate to Month view preserving date context
    - If currently on Month or Year view, remain unchanged
    - Default to Month view when Calendar page loads with shift mode active
    - Handle deep links with unsupported view params by falling back to Month view
    - _Requirements: 4.3, 4.4, 4.5, 4.7_

  - [x] 4.3 Conditionally hide "New Event" button in top bar
    - When shift mode is active and user is on Calendar page, hide the "New Event" / "+" button
    - When shift mode is disabled, show the button normally
    - _Requirements: 4.2_

  - [x] 4.4 Handle Shift Mode deactivation restoration
    - Restore all four views in View_Selector
    - Restore "New Event" button in top bar
    - Set default view back to Day view
    - _Requirements: 3.2, 3.3, 4.6_

  - [x] 4.5 Write unit tests for calendar view restriction logic
    - Test View_Selector shows 2 options when enabled, 4 when disabled
    - Test navigation to Month view when on Day/Week at activation
    - Test deep link fallback to Month view
    - _Requirements: 3.1, 4.1, 4.3, 4.4, 4.7_

- [x] 5. React Web — Day-Tap Logic & Day_Action_Modal
  - [x] 5.1 Implement day-tap logic for Month view in Shift Mode
    - When shift mode active: tap empty day → prerequisite check → Calendar_Event_Form with date preselected
    - When shift mode active: tap day with content → show Day_Action_Modal
    - Prerequisite check: at least one active (non-deleted) Shift or Reminder must exist
    - If prerequisite fails → show Prerequisite_Modal
    - Adjacent month days follow same logic
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Implement day-tap logic for Year view in Shift Mode
    - Same logic as Month view: empty day → form, day with content → modal
    - On form submit/cancel from Year view, return to Year view preserving year context
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.3 Create `DayActionModal` shared component
    - Create `shared/components/day-action-modal/DayActionModal.tsx`
    - Display date header formatted by locale (Spanish: "dd de MMMM de yyyy", English: "MMMM dd, yyyy")
    - Display "Create calendar event" button at top
    - Display shift cards sorted alphabetically by name
    - Display reminder cards sorted alphabetically by name
    - Support vertical scrolling if content overflows, fixed header and create button
    - Rounded corners (12px), theme-aware (light/dark mode)
    - Dismissible by clicking outside or pressing Escape
    - _Requirements: 6.1, 6.2, 6.11, 8.1, 8.2, 8.11, 9.1, 9.2, 9.5, 9.6, 9.8, 9.9_

  - [x] 5.4 Create `ShiftCard` component
    - Create `shared/components/day-action-modal/ShiftCard.tsx`
    - Display shift name (max 50 chars, truncated with ellipsis), start time (HH:mm), end time (HH:mm)
    - 4px left border with shift's assigned color
    - Clickable — triggers `onEditShift` handler
    - _Requirements: 9.3_

  - [x] 5.5 Create `ReminderCard` component
    - Create `shared/components/day-action-modal/ReminderCard.tsx`
    - Display reminder name (max 50 chars, truncated with ellipsis), emoji icon
    - 4px left border with reminder's assigned color
    - Clickable — triggers `onEditReminder` handler
    - _Requirements: 9.4_

  - [x] 5.6 Wire Day_Action_Modal actions to navigation
    - "Create calendar event" → close modal, open Calendar_Event_Form with date preselected
    - Shift_Card tap → close modal, open Shift_Form (edit mode) for that event
    - Reminder_Card tap → close modal, open Reminder_Form (edit mode) for that event
    - On form submit/cancel from Month view → return to Month view (same month context)
    - On form submit/cancel from Year view Day_Action_Modal → return to Month view (per spec)
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 5.7 Handle Day_Action_Modal conditional sections
    - If day has shifts only → show create button + shift cards, no reminder section
    - If day has reminders only → show create button + reminder cards, no shift section
    - Handle orphaned events (deleted shift/reminder) with fallback "[Deleted]" text and disabled card
    - _Requirements: 6.9, 6.10, 8.9, 8.10_

  - [x] 5.8 Write property tests for day-tap routing logic
    - **Property 3: Empty day tap opens form in Shift Mode**
    - **Property 4: Prerequisite check failure shows modal**
    - **Property 5: Day with content shows Day_Action_Modal**
    - **Validates: Requirements 5.1, 5.2, 6.1, 7.1, 7.2, 8.1**

  - [x] 5.9 Write property tests for Day_Action_Modal ordering and rendering
    - **Property 6: Day_Action_Modal ordering**
    - **Property 7: Date header locale formatting**
    - **Property 8: Shift_Card displays all required fields**
    - **Property 9: Reminder_Card displays all required fields**
    - **Validates: Requirements 6.2, 8.2, 9.1, 9.3, 9.4, 9.5**

- [x] 6. Checkpoint — React Web complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Android App — Shift Mode Setting & Sync
  - [x] 7.1 Create Room entity, DAO, and migration for ShiftModeSetting
    - Create `data/local/ShiftModeSettingEntity.kt` with Room annotations
    - Create `data/local/ShiftModeSettingDao.kt` with CRUD + Flow observation
    - Create Room migration (version 7→8): CREATE TABLE + CREATE INDEX
    - Register in AppDatabase
    - _Requirements: 2.1_

  - [x] 7.2 Create `ShiftModeSettingRepository`
    - Create `data/local/ShiftModeSettingRepository.kt`
    - Provide `observeEnabled(): Flow<Boolean>` (creates default record on first access)
    - Provide `toggle()` method: flip enabled, update modifiedAt, set syncedAt=null
    - _Requirements: 2.1, 2.2_

  - [x] 7.3 Create ShiftModeSetting sync adapter
    - Create `data/sync/ShiftModeSettingSyncAdapter.kt`
    - Create `data/sync/ShiftModeSettingSyncApiService.kt` (Retrofit interface)
    - Implement push: send records where `modifiedAt > syncedAt` (max 1 record)
    - Implement pull: apply LWW merge, normalize DateTime ISO format (append `Z`)
    - Register in `SyncServiceController`
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 7.4 Add i18n strings for Shift Mode (Spanish and English)
    - Add all Shift Mode related strings to `strings.xml` and `strings.xml` (es)
    - Include toggle label, description, modal texts, card labels, button texts, date patterns
    - _Requirements: 1.7, 9.1, 9.2, 9.7_

  - [x] 7.5 Write unit tests for ShiftModeSettingRepository and sync adapter
    - Test default record creation on first access
    - Test toggle updates enabled/modifiedAt/syncedAt
    - Test LWW merge on pull (newer remote wins)
    - **Property 1: Setting state management**
    - **Property 2: Last-Writer-Wins conflict resolution**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

- [x] 8. Android App — Settings Toggle & Calendar View Restrictions
  - [x] 8.1 Update `SettingsViewModel` with Shift Mode toggle
    - Add shift mode state observation from `ShiftModeSettingRepository`
    - Add toggle action that calls repository `toggle()`
    - Expose `shiftModeEnabled: StateFlow<Boolean>`
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 8.2 Add Shift Mode section to Settings screen UI
    - Add toggle composable in SettingsScreen after user manual section
    - Display localized description
    - Wire to SettingsViewModel shift mode state/actions
    - Support light/dark mode rendering
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8_

  - [x] 8.3 Modify `CalendarViewModel` for view restrictions
    - When shift mode enabled, filter available views to Month + Year only
    - Default to Month view when shift mode is active
    - If currently on Day/Week when activated, navigate to Month view preserving date
    - Handle deactivation: restore all four views, set default back to Day
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.3, 4.4, 4.5, 4.6, 4.8_

  - [x] 8.4 Hide "New Event" button/FAB when Shift Mode is active
    - Conditionally hide the "+" button in top bar and FAB when shift mode is active on Calendar page
    - Restore when disabled
    - _Requirements: 3.2, 4.2_

  - [x] 8.5 Write unit tests for SettingsViewModel and CalendarViewModel shift mode logic
    - Test toggle updates database and emits new state
    - Test view filtering returns 2 views when enabled, 4 when disabled
    - Test navigation to Month on activation from Day/Week
    - _Requirements: 1.3, 1.4, 4.1, 4.3, 4.4_

- [x] 9. Android App — Day-Tap Logic & Day_Action_Modal
  - [x] 9.1 Implement day-tap logic in `CalendarViewModel`
    - When shift mode active in Month/Year view:
      - Empty day → prerequisite check → open Calendar_Event_Form or Prerequisite_Dialog
      - Day with content → show DayActionModal
    - Define "empty day" = zero non-deleted calendar events referencing a shift or reminder
    - _Requirements: 5.1, 5.2, 7.1, 7.2_

  - [x] 9.2 Create `DayActionModal` composable
    - Create `ui/components/DayActionModal.kt`
    - Display date header formatted by locale (Spanish/English patterns)
    - Display "Create calendar event" button at top
    - Display shift cards sorted alphabetically by name
    - Display reminder cards sorted alphabetically by name
    - Support vertical scrolling, fixed header and create button
    - Rounded corners (12dp), theme-aware (MaterialTheme)
    - Dismissible by back button or tapping outside
    - _Requirements: 6.1, 6.2, 6.11, 8.1, 8.2, 8.11, 9.1, 9.2, 9.5, 9.6, 9.8, 9.9, 9.10_

  - [x] 9.3 Create `ShiftCard` composable
    - Create `ui/components/ShiftCard.kt`
    - Display shift name (max 50 chars, ellipsis), start time (HH:mm), end time (HH:mm)
    - 4dp left border with shift's color
    - Clickable — triggers edit handler
    - _Requirements: 9.3_

  - [x] 9.4 Create `ReminderCard` composable
    - Create `ui/components/ReminderCard.kt`
    - Display reminder name (max 50 chars, ellipsis), emoji icon
    - 4dp left border with reminder's color
    - Clickable — triggers edit handler
    - _Requirements: 9.4_

  - [x] 9.5 Wire DayActionModal actions to navigation
    - "Create calendar event" → close modal, navigate to Calendar_Event_Form with date
    - Shift_Card tap → close modal, navigate to Shift_Form (edit) for that event
    - Reminder_Card tap → close modal, navigate to Reminder_Form (edit) for that event
    - From Month view: form submit/cancel → return to Month view (same month)
    - From Year view: form submit/cancel → return to Month view (per spec)
    - Handle conditional sections (shifts only / reminders only / orphaned events)
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 9.6 Write property tests for day-tap routing and modal rendering
    - **Property 3: Empty day tap opens form in Shift Mode**
    - **Property 4: Prerequisite check failure shows modal**
    - **Property 5: Day with content shows Day_Action_Modal**
    - **Property 6: Day_Action_Modal ordering**
    - **Validates: Requirements 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 8.1, 8.2**

- [x] 10. Checkpoint — Android App complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Cross-Platform Verification
  - [x] 11.1 Verify feature parity and sync integration
    - Verify both platforms reflect the same shift mode state after sync
    - Verify Day_Action_Modal content and ordering is identical on both platforms
    - Verify all day-tap interactions produce consistent results
    - Ensure offline functionality on both platforms (toggle, view restrictions, modal)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation per project layer
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend must be completed before clients to ensure API contract is stable
- Both frontend clients follow identical logic for day-tap routing and modal behavior
- All i18n strings must be added before UI components that use them
- Sync adapters must normalize DateTime ISO format (append `Z` if missing timezone indicator)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6"] },
    { "id": 3, "tasks": ["1.7", "1.8"] },
    { "id": 4, "tasks": ["1.9", "1.10"] },
    { "id": 5, "tasks": ["3.1", "7.1"] },
    { "id": 6, "tasks": ["3.2", "3.4", "7.2", "7.4"] },
    { "id": 7, "tasks": ["3.3", "3.5", "7.3"] },
    { "id": 8, "tasks": ["3.6", "7.5"] },
    { "id": 9, "tasks": ["4.1", "4.2", "4.3", "8.1"] },
    { "id": 10, "tasks": ["4.4", "4.5", "8.2", "8.3", "8.4"] },
    { "id": 11, "tasks": ["8.5", "5.1", "5.2"] },
    { "id": 12, "tasks": ["5.3", "5.4", "5.5", "9.1", "9.2", "9.3", "9.4"] },
    { "id": 13, "tasks": ["5.6", "5.7", "9.5"] },
    { "id": 14, "tasks": ["5.8", "5.9", "9.6"] },
    { "id": 15, "tasks": ["11.1"] }
  ]
}
```
