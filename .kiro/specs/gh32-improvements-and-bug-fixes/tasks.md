# Implementation Plan: GH-32 Improvements and Bug Fixes

## Overview

This plan implements 14 requirements spanning all three Planixor sub-projects. Tasks are organized by sub-project and concern, with independent tasks grouped into parallel waves. The implementation follows existing patterns: Zustand stores + Dexie for React Web, ViewModel + DataStore for Android, and EF Core + StyleCop for Backend.

## Tasks

- [x] 1. Backend: Remove compilation/analyzer warnings and update NuGet packages
  - [x] 1.1 Fix all compiler and StyleCop warnings in the Backend API
    - Run `dotnet build` and identify all warnings
    - Fix each warning in source code; suppress with `[SuppressMessage]` or `#pragma warning disable` with justification where appropriate
    - Verify `dotnet build` produces zero warning lines matching `warning [A-Z]+[0-9]+`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Update all Codenized.* NuGet packages to latest stable versions
    - Update `PackageReference` entries in `.csproj` files to latest stable versions
    - Run `dotnet build` to verify zero errors and zero new warnings
    - Run `dotnet test` to verify existing tests pass
    - Pin any incompatible versions with a code comment explaining the reason
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. React Web: Update dependencies
  - [x] 2.1 Update all React Web dependencies to latest compatible versions
    - Run `pnpm update` or manually update `package.json` versions
    - Regenerate `pnpm-lock.yaml`
    - Adapt any breaking API changes in application code and tests
    - Verify `tsc -b && vite build` completes with zero errors
    - Verify `pnpm vitest --run` passes with no failures
    - Verify `pnpm run lint` produces zero ESLint errors
    - Verify `tsc --noEmit` passes with zero errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. React Web: Persist sync pause state across restarts
  - [x] 3.1 Update SyncStore pause/resume actions to persist to IndexedDB
    - Modify `pause()` in `syncStore.ts` to persist `isPaused: true` to IndexedDB (SyncConfig) before updating UI state
    - Modify `resume()` to persist `isPaused: false`, set connectionStatus to 'active', and trigger a full sync cycle
    - Update `loadConfig()` to restore `isPaused` from persisted SyncConfig on app startup
    - Set connectionStatus to 'paused' when loaded config has `isPaused: true`
    - Ensure UNCONFIGURED state takes precedence over any persisted pause state
    - Ensure Reset Application clears the persisted pause state
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7_

  - [x] 3.2 Guard SyncServiceController against paused state
    - Add pause check before all sync triggers (periodic timer, visibility change, connectivity restore, manual trigger)
    - When `isPaused` is true, do not schedule timers, do not execute app-open sync, do not attempt push/pull
    - On resume subscription change, trigger full push+pull cycle
    - _Requirements: 4.2, 4.3_

  - [x] 3.3 Write property tests for sync pause persistence (Properties 1–4)
    - **Property 1: Sync pause blocks all operations** — for any trigger type and isPaused=true, verify no push/pull executes
    - **Property 2: Sync pause persistence round-trip** — pause → reload config → verify isPaused=true and connectionStatus='paused'
    - **Property 3: Unconfigured takes precedence over paused** — no SyncConfig record → connectionStatus='unconfigured'
    - **Property 4: Resume triggers sync and persists active state** — resume → verify isPaused=false, connectionStatus='active', sync triggered
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

- [x] 4. Checkpoint - Backend and React Web foundations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. React Web: Calendar event prerequisite check
  - [x] 5.1 Implement prerequisite check service and hook
    - Create `features/calendar-events/services/prerequisiteService.ts` with `checkPrerequisites(activeShiftCount, activeReminderCount)` pure function
    - Create `features/calendar-events/hooks/usePrerequisiteCheck.ts` hook that queries Dexie for active (isDeleted=false) shifts and reminders
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.8_

  - [x] 5.2 Create PrerequisiteModal component
    - Create `features/calendar-events/components/PrerequisiteModal.tsx`
    - Display message indicating which prerequisites are missing (shifts, reminders, or both)
    - Provide navigation actions to Shifts page and/or Reminders page for each missing type
    - Provide dismiss action that closes modal and returns to Calendar view
    - Use Poppins font, 12px border-radius, theme-aware colors, i18n strings (Spanish/English)
    - _Requirements: 6.5, 6.6, 6.7_

  - [x] 5.3 Wire prerequisite check into "New Event" button flow
    - Before opening Calendar_Event_Form, run prerequisite check
    - If `canCreate: false`, show PrerequisiteModal instead of form
    - If `canCreate: true`, show form directly
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.4 Write property tests for prerequisite classification (Properties 5–6)
    - **Property 5: Calendar event prerequisite classification** — for any (shiftCount, reminderCount) pair, verify correct PrerequisiteResult
    - **Property 6: Prerequisite check uses only non-deleted records** — for mixed isDeleted collections, verify only isDeleted=false counted
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.8**

- [x] 6. React Web: Form validation for mandatory fields
  - [x] 6.1 Implement useFormValidation hook and ValidationError component
    - Create `shared/hooks/useFormValidation.ts` with generic validation logic
    - Create `shared/components/ValidationError.tsx` for inline error display
    - Support: validate on submit, clear error on field change, focus first error on submit
    - Style errors in red text using Planixor design system (Poppins font, theme-aware)
    - All error messages via i18n (Spanish/English)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 6.2 Integrate form validation into all existing forms
    - Apply `useFormValidation` to Shift form, Reminder form, Calendar Event form, Sync Config form
    - Prevent submission when mandatory fields are empty/whitespace
    - Display inline errors below each invalid field
    - Clear field error immediately on input change
    - Scroll to and focus first error field on submit failure
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

  - [x] 6.3 Write property tests for form validation (Properties 7–9)
    - **Property 7: Form validation rejects empty mandatory fields** — any form with N mandatory fields, at least one empty → errors produced
    - **Property 8: Form validation passes when all mandatory fields are valid** — all fields valid → zero errors
    - **Property 9: Field modification clears its error** — modify errored field → error removed immediately
    - **Validates: Requirements 8.1, 8.3, 8.5**

- [x] 7. React Web: Replace browser alerts with modal system
  - [x] 7.1 Implement Modal system (ModalProvider, useModal, InfoModal, ConfirmModal)
    - Create `shared/components/modal/ModalProvider.tsx` with context provider and FIFO queue
    - Create `shared/components/modal/useModal.ts` hook to trigger modals
    - Create `shared/components/modal/InfoModal.tsx` for info/error modals (dismiss via close button, overlay click, Escape)
    - Create `shared/components/modal/ConfirmModal.tsx` for confirmations (dismiss only via explicit buttons, no overlay/Escape)
    - Implement focus trap (Tab/Shift+Tab cycles within modal, focus returns to trigger on dismiss)
    - Style with Poppins font, 12px border-radius, theme-aware colors
    - All text via i18n (Spanish/English)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 7.2 Replace all browser alert/confirm/prompt calls with modal system
    - Find and replace all `alert()`, `confirm()`, `prompt()` usages
    - Use InfoModal for success/info/error notifications
    - Use ConfirmModal for destructive or decision-requiring actions (include affected item name)
    - _Requirements: 10.1, 10.2_

  - [x] 7.3 Write property test for modal queue ordering (Property 10)
    - **Property 10: Modal queue ordering** — for any sequence of N triggers, modals display one at a time in FIFO order
    - **Validates: Requirements 10.7**

- [x] 8. React Web: Display version in Settings
  - [x] 8.1 Inject app version at build time and display in Settings
    - Add `define` in `vite.config.ts` to inject version from `package.json`
    - Add version display at bottom of Settings page below all other sections
    - Format as "v{MAJOR}.{MINOR}.{PATCH}" with Poppins Medium (500), text-secondary color
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 9. Checkpoint - React Web complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Android: Update dependencies
  - [x] 10.1 Update all Android dependencies in gradle/libs.versions.toml
    - Update all version entries to latest stable (no alpha/beta/RC/SNAPSHOT)
    - Update Android Gradle Plugin to latest stable
    - Update Kotlin version (verify Compose compatibility)
    - Adapt any breaking API changes
    - Verify `./gradlew assembleDebug` completes with zero errors
    - Verify `./gradlew testDebug` passes with zero failures
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 11. Android: Persist sync pause state across restarts
  - [x] 11.1 Update SyncViewModel pause/resume to persist to DataStore
    - Modify `pause()` to persist `isPaused=true` to DataStore via PreferencesRepository BEFORE updating UI state
    - Set ConnectionStatus to PAUSED via `saveConnectionStatus()`
    - Modify `resume()` to persist `isPaused=false`, set ConnectionStatus to ACTIVE, trigger immediate full sync cycle
    - _Requirements: 5.1, 5.4_

  - [x] 11.2 Ensure SyncServiceController respects persisted pause state on startup
    - On app process start, read isPaused from DataStore
    - If paused: do not schedule periodic sync, do not execute any push/pull regardless of triggers
    - Display ConnectionStatus as PAUSED in top bar
    - Do not show pause/resume controls if sync not configured
    - _Requirements: 5.2, 5.3, 5.5, 5.6_

- [x] 12. Android: Calendar event prerequisite check
  - [x] 12.1 Implement prerequisite check in CalendarViewModel
    - Add `checkPrerequisites(activeShiftCount, activeReminderCount)` function
    - Query Room for active shifts (isDeleted=false) and active reminders (isDeleted=false)
    - Update CalendarUiState with prerequisite modal state fields
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 12.2 Create PrerequisiteDialog composable
    - Create `ui/components/PrerequisiteDialog.kt` reusable dialog
    - Display message indicating which prerequisites are missing
    - Provide navigation to Shifts screen and/or Reminders screen
    - Provide dismiss button to close and return to Calendar
    - Use Poppins font, Material Design 3 styling, i18n strings (Spanish/English)
    - _Requirements: 7.5, 7.6, 7.7_

  - [x] 12.3 Write property tests for Android prerequisite classification (Properties 5–6)
    - **Property 5: Calendar event prerequisite classification** — for any (shiftCount, reminderCount) pair, verify correct PrerequisiteResult
    - **Property 6: Prerequisite check uses only non-deleted records** — verify only isDeleted=false counted
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 13. Android: Form validation for mandatory fields
  - [x] 13.1 Implement form validation in ViewModels
    - Add `fieldErrors: Map<String, Int>` and `hasAttemptedSubmit` to each form UiState (Shift, Reminder, CalendarEvent, SyncConfig)
    - Validate on submit: prevent submission and show errors for empty mandatory fields
    - Clear field error immediately when field value becomes valid
    - Scroll to first error field if not visible
    - Do not show errors before first submit attempt
    - Retain all user-entered data on validation failure
    - Use Material Design 3 text field error states
    - All error messages via i18n string resources (Spanish/English)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 13.2 Write property tests for Android form validation (Properties 7–8)
    - **Property 7: Form validation rejects empty mandatory fields** — any form with empty mandatory fields → errors produced
    - **Property 8: Form validation passes when all mandatory fields are valid** — all fields valid → zero errors
    - **Validates: Requirements 9.1, 9.2**

- [x] 14. Android: Display version in Settings
  - [x] 14.1 Add version display to Android Settings screen
    - Add Text composable at bottom of SettingsScreen showing `"v${BuildConfig.VERSION_NAME}"`
    - Style with Poppins Medium (500), text-secondary color (#6B7280 light / #9CA3AF dark)
    - Position below all other settings sections
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 15. Android: Fix sync URL parsing after field merge
  - [x] 15.1 Fix URL parsing in ApiBasePathUtils and DynamicBaseUrlInterceptor
    - Implement/fix `parseServerUrl(rawUrl)` in `ApiBasePathUtils.kt`: trim, validate scheme, parse host+port as serverUrl, extract path as apiBasePath (default `/api` if empty)
    - Verify `DynamicBaseUrlInterceptor` constructs URLs with no double slashes: `{serverUrl}{apiBasePath}/{entity}/sync/{action}`
    - Add URL validation: reject missing scheme, whitespace, invalid host with field-level error
    - Ensure Authorization header included on all sync requests
    - Verify successful sync updates syncedAt and lastSyncedAt
    - Entity failures do not block other entities
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 15.2 Write property tests for URL parsing (Properties 11–13)
    - **Property 11: URL parsing produces correct components** — valid URL → correct serverUrl + apiBasePath; serverUrl + apiBasePath reconstructs original
    - **Property 12: URL construction produces no double slashes** — for any valid serverUrl, apiBasePath, entity, action → no `//` in path
    - **Property 13: Invalid URLs are rejected** — missing scheme, whitespace, invalid host → error result
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.6**

- [x] 16. Final checkpoint - All platforms complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation across sub-projects
- Property tests validate universal correctness properties from the design document
- Backend tasks (wave 0) are independent of frontend tasks and can start immediately
- React Web and Android tasks are largely independent and can be parallelized
- All UI strings must use i18n (Spanish + English) — no hardcoded user-facing text
- Modal and form validation components follow Planixor design system (Poppins font, theme-aware colors, 12px border-radius)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "10.1"] },
    { "id": 1, "tasks": ["1.2", "3.1", "11.1", "14.1"] },
    { "id": 2, "tasks": ["3.2", "5.1", "6.1", "7.1", "8.1", "11.2", "12.1", "13.1", "15.1"] },
    { "id": 3, "tasks": ["3.3", "5.2", "5.3", "6.2", "7.2", "12.2", "13.2", "15.2"] },
    { "id": 4, "tasks": ["5.4", "6.3", "7.3", "12.3"] }
  ]
}
```
