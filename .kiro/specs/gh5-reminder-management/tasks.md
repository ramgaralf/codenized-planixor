# Implementation Plan: Reminder Management

## Overview

Implement the Reminder Management feature across all three platforms (React Web PWA, Android App, .NET 10 Backend) following the existing Shift feature patterns. The implementation proceeds backend-first (domain model + sync endpoints), then React Web (local CRUD + UI + sync integration), then Android (mirroring web functionality). Each platform's tasks are independent and can be parallelized where noted.

## Tasks

- [x] 1. Backend — Domain model and value objects
  - [x] 1.1 Create Reminder value objects (ReminderName, ReminderIcon, ReminderColor)
    - Create `ReminderName` value object in `Codenized.Planixor.Core/ValueObjects/` with 1–50 trimmed character validation (mirror ShiftName pattern)
    - Create `ReminderIcon` value object with single-emoji validation (mirror ShiftIcon pattern)
    - Create `ReminderColor` value object with Predefined_Palette membership validation (45 hex colors)
    - Each value object must throw `DomainException` on invalid input
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.2 Write property tests for ReminderName value object
    - **Property 14: Name validation accepts trimmed strings of 1–50 characters**
    - **Validates: Requirements 7.1**
    - Use FsCheck with NUnit in `UnitTest.Codenized.Planixor/Shift/ValueObjects/` (create Reminder subfolder)
    - Minimum 100 iterations

  - [x] 1.3 Write property tests for ReminderIcon value object
    - **Property 15: Icon validation accepts exactly one emoji**
    - **Validates: Requirements 7.2**
    - Use FsCheck with NUnit

  - [x] 1.4 Write property tests for ReminderColor value object
    - **Property 16: Color validation accepts only Predefined_Palette members**
    - **Validates: Requirements 7.3**
    - Use FsCheck with NUnit

  - [x] 1.5 Create Reminder entity in `Codenized.Planixor.Core/Entities/`
    - Rich domain entity with behavior: Create, Update, Deactivate, Activate, SoftDelete
    - Fields: Id, UserId, Name, Icon, BackgroundColor, IsActive, CreatedAt, ModifiedAt, SyncedAt, IsDeleted
    - Create factory method sets defaults (IsActive=true, IsDeleted=false, SyncedAt=null)
    - Update method preserves Id, SyncedAt, IsDeleted and updates ModifiedAt
    - SoftDelete method sets IsDeleted=true, SyncedAt=null, updates ModifiedAt
    - _Requirements: 1.1, 3.2, 4.2, 4.5, 5.2_

  - [x] 1.6 Write property tests for Reminder entity
    - **Property 1: Creation produces a valid reminder record**
    - **Property 6: Edit preserves system fields and updates modifiedAt**
    - **Property 7: Toggle active state updates isActive and modifiedAt**
    - **Property 10: Soft-delete sets correct field values**
    - **Validates: Requirements 1.1, 3.2, 4.2, 4.5, 4.7, 5.2**
    - Use FsCheck with NUnit in `UnitTest.Codenized.Planixor/Reminder/Domain/`

- [x] 2. Backend — Sync DTOs, use cases, and endpoints
  - [x] 2.1 Create Reminder sync DTOs
    - Create `ReminderSyncPushRequest`, `ReminderSyncPullRequest`, `ReminderSyncPullResponse`, `ReminderSyncRecord` in `Codenized.Planixor.Dtos/Reminder/Sync/`
    - Mirror the existing Shift sync DTO patterns
    - _Requirements: 6.1, 6.5, 6.7_

  - [x] 2.2 Create Reminder sync use case services
    - Create `ReminderSyncPushService` in `Codenized.Planixor.UseCases/Reminder/SyncPush/`
    - Create `ReminderSyncPullService` in `Codenized.Planixor.UseCases/Reminder/SyncPull/`
    - Implement `IReminderSyncPushCommands` and `IReminderSyncPullQueries` interfaces
    - Push: validate batch size ≤100, upsert records, apply last-writer-wins conflict resolution
    - Pull: return records modified after `since` timestamp, paginated with cursor, max 100 per page
    - _Requirements: 6.1, 6.3, 6.5, 6.7_

  - [x] 2.3 Write property tests for sync push/pull logic
    - **Property 11: Push sync selects correct records and respects batch size**
    - **Property 12: Conflict resolution applies last-writer-wins with remote tie-break**
    - **Property 13: Pull merge inserts new and overwrites unmodified locals**
    - **Validates: Requirements 6.1, 6.3, 6.5**
    - Use FsCheck with NUnit in `UnitTest.Codenized.Planixor/Reminder/Sync/`

  - [x] 2.4 Create EF Core entity configuration and migration
    - Create `ReminderConfiguration` in `Codenized.Planixor.Persistence.MySql.Efc.DataContext/`
    - Define table mapping, indexes (UserId, UserId+ModifiedAt), column constraints
    - Register in DbContext
    - _Requirements: 6.2_

  - [x] 2.5 Create Reminder repository
    - Create repository implementation in `Codenized.Planixor.Persistence.MySql.Efc.Repositories/`
    - Implement UpsertBatch and GetModifiedAfter methods
    - _Requirements: 6.1, 6.5, 6.7_

  - [x] 2.6 Create Reminder sync API endpoints
    - Create `ReminderSyncPushEndpoints` and `ReminderSyncPullEndpoints` in `Codenized.Planixor.Api/Endpoints/Reminder/`
    - POST `/api/v1/reminders/sync/push` — accepts batch push request
    - GET `/api/v1/reminders/sync/pull` — returns modified records after timestamp
    - Apply authentication and subscription authorization guards
    - Register endpoints in `RegisterEndpoints.cs`
    - _Requirements: 6.1, 6.5, 6.7_

  - [x] 2.7 Write unit tests for sync endpoints
    - Test authentication guard (401 for unauthenticated)
    - Test subscription guard (403 for unsubscribed)
    - Test batch size validation (400 for >100 records)
    - Test happy path push and pull
    - _Requirements: 6.1, 6.4_

- [x] 3. Checkpoint — Backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. React Web — Data layer and services
  - [x] 4.1 Create Reminder model, constants, and Dexie schema
    - Create `features/reminders/models.ts` with Reminder interface
    - Create `features/reminders/constants.ts` with Predefined_Palette (45 colors), validation limits
    - Upgrade Dexie schema version to add `reminders` table with indexes (id, createdAt, isDeleted, isActive)
    - _Requirements: 1.1, 6.2, 7.1, 7.2, 7.3, 8.5_

  - [x] 4.2 Create Reminder service (CRUD against IndexedDB)
    - Create `features/reminders/services/reminderService.ts` implementing the ReminderService interface
    - Implement: getAll (filter isDeleted=false, order by createdAt ASC), getById, create, update, softDelete, deactivate, activate, getUnsynced, applyRemoteRecords
    - Create generates client-side UUID, sets defaults (isActive=true, isDeleted=false, syncedAt=null, modifiedAt=now)
    - Update preserves id, syncedAt, isDeleted, updates modifiedAt
    - SoftDelete sets isDeleted=true, syncedAt=null, updates modifiedAt
    - _Requirements: 1.1, 2.1, 3.2, 4.2, 4.5, 5.2_

  - [x] 4.3 Write property tests for Reminder service
    - **Property 1: Creation produces a valid reminder record**
    - **Property 3: Display excludes deleted and orders by creation date**
    - **Property 6: Edit preserves system fields and updates modifiedAt**
    - **Property 7: Toggle active state updates isActive and modifiedAt**
    - **Property 10: Soft-delete sets correct field values**
    - **Validates: Requirements 1.1, 2.1, 3.2, 4.2, 4.5, 4.7, 5.2**
    - Use fast-check with Vitest and fake-indexeddb in `features/reminders/services/reminderService.property.test.ts`

  - [x] 4.4 Create Reminder validation service (Zod)
    - Create `features/reminders/services/reminderValidation.ts` with Zod schemas
    - Name: 1–50 chars after trim, required
    - Icon: exactly one emoji, required
    - BackgroundColor: must be member of Predefined_Palette
    - Export validation function that returns field-level errors
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.5 Write property tests for Reminder validation
    - **Property 2: Form submission requires all fields valid**
    - **Property 14: Name validation accepts trimmed strings of 1–50 characters**
    - **Property 15: Icon validation accepts exactly one emoji**
    - **Property 16: Color validation accepts only Predefined_Palette members**
    - **Validates: Requirements 1.2, 3.4, 7.1, 7.2, 7.3**
    - Use fast-check with Vitest in `features/reminders/services/reminderValidation.property.test.ts`

  - [x] 4.6 Create Reminder sync integration
    - Create `features/reminders/services/reminderSync.ts`
    - Implement push: select records where syncedAt is null or modifiedAt > syncedAt, batch into 100, send to API
    - Implement pull: request records modified after lastSyncedAt, paginate with cursor, merge into local store
    - Conflict resolution: last-writer-wins by modifiedAt, remote wins ties
    - Register with existing cross-cutting sync service
    - _Requirements: 6.1, 6.3, 6.5, 6.6, 6.7, 6.8_

  - [x] 4.7 Write property tests for Reminder sync logic
    - **Property 11: Push sync selects correct records and respects batch size**
    - **Property 12: Conflict resolution applies last-writer-wins with remote tie-break**
    - **Property 13: Pull merge inserts new and overwrites unmodified locals**
    - **Validates: Requirements 6.1, 6.3, 6.5**
    - Use fast-check with Vitest in `features/reminders/services/reminderSync.property.test.ts`

- [x] 5. React Web — UI components
  - [x] 5.1 Create ReminderCard component
    - Create `features/reminders/components/ReminderCard.tsx`
    - Display: left-aligned color indicator, icon, name on first line
    - Actions: edit, deactivate/activate toggle, delete
    - Deactivated state: reduced opacity + localized "Deactivated" badge
    - Support light/dark theme
    - _Requirements: 2.2, 4.4, 8.2_

  - [x] 5.2 Write unit tests for ReminderCard
    - Test rendering of all data elements (color, icon, name)
    - Test deactivated visual indicators (opacity, badge)
    - Test action callbacks (edit, deactivate, delete)
    - Test accessibility (ARIA labels)
    - **Property 4: Card renders all required data elements**
    - **Property 8: Inactive reminder card displays deactivated visual indicators**
    - **Validates: Requirements 2.2, 4.4**

  - [x] 5.3 Create ColorPicker component
    - Create `features/reminders/components/ColorPicker.tsx`
    - Display 9 families × 5 shades grid
    - Theme-aware shade recommendations (dark mode → lighter shades recommended, light mode → darker shades)
    - Non-recommended shades at 50% opacity but selectable
    - _Requirements: 7.3, 8.5_

  - [x] 5.4 Create EmojiPicker component
    - Create `features/reminders/components/EmojiPicker.tsx`
    - Wrapper around `emoji-picker-react` library
    - Category-based selection (Faces, Gestures, Nature, Animals, Food, Sports, Travel, Objects, Symbols)
    - _Requirements: 7.2_

  - [x] 5.5 Create ReminderForm component
    - Create `features/reminders/components/ReminderForm.tsx`
    - Fields: name (text input), icon (EmojiPicker), backgroundColor (ColorPicker)
    - Real-time validation with inline error messages (within 1 second of input)
    - Submit disabled when any field invalid
    - Support create mode (empty form) and edit mode (pre-populated with existing values)
    - Cancel navigates back to Reminders_Page without persisting
    - On save failure: display localized error, retain form values, stay on form
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 3.1, 3.3, 3.4, 7.4, 7.5, 7.6_

  - [x] 5.6 Create useReminderForm hook
    - Create `features/reminders/hooks/useReminderForm.ts`
    - Manage form state, validation trigger on field change, submission logic
    - Handle pre-population for edit mode
    - _Requirements: 3.1, 7.5, 7.6_

  - [x] 5.7 Write unit tests for ReminderForm
    - Test create mode renders empty fields
    - Test edit mode pre-populates all fields (Property 5)
    - Test validation error display on invalid input
    - Test validation error clears on correction
    - Test submit disabled when fields invalid
    - Test cancel discards data
    - **Property 5: Edit pre-populates all current field values**
    - **Validates: Requirements 1.2, 1.3, 3.1, 3.4, 7.4, 7.5**

- [x] 6. React Web — Reminders page (container)
  - [x] 6.1 Create Reminders page container
    - Create `features/reminders/reminders.tsx`
    - Orchestrate: load reminders, display list/empty/error/loading states
    - "New Reminder" button navigates to create form
    - Edit action navigates to edit form with pre-populated data
    - Deactivate shows Confirmation_Modal, confirm toggles isActive=false
    - Activate toggles isActive=true without confirmation
    - Delete shows Confirmation_Modal with permanent warning and reminder name, confirm soft-deletes
    - Dismiss modal (cancel, click outside, Escape) makes no changes
    - Loading indicator visible until retrieval completes or error processed
    - _Requirements: 1.3, 2.1, 2.3, 2.4, 2.5, 2.6, 3.1, 3.3, 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Create useReminders hook
    - Create `features/reminders/hooks/useReminders.ts`
    - CRUD operations wrapper around reminderService
    - State management for loading, error, reminders list
    - _Requirements: 2.1, 2.5, 2.6_

  - [x] 6.3 Write unit tests for Reminders page
    - Test loading state displays indicator
    - Test empty state shows "No reminders available" message
    - Test error state shows localized error message
    - Test reminders render as ReminderCards ordered by createdAt ASC
    - Test deactivation confirmation modal flow
    - Test reactivation without confirmation
    - Test delete confirmation modal with permanent warning
    - Test cancel/dismiss modal makes no changes
    - **Property 3: Display excludes deleted and orders by creation date**
    - **Validates: Requirements 2.1, 2.3, 2.5, 2.6, 4.1, 4.3, 5.1, 5.3**

  - [x] 6.4 Add i18n strings for Reminder feature
    - Add English and Spanish translation keys for all reminder UI text
    - Keys: validation messages, empty state, confirmation dialogs, badge text, error messages
    - Follow existing i18n pattern in the project
    - _Requirements: 8.4_

  - [x] 6.5 Register Reminders page in routing and navigation
    - Add route for `/reminders` and `/reminders/new` and `/reminders/:id/edit`
    - Add "Reminders" item to sidebar navigation with AlarmClock icon (lucide-react)
    - _Requirements: 2.4, 8.6_

- [x] 7. Checkpoint — React Web tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Android — Data layer
  - [x] 8.1 Create Reminder domain model and Room entity
    - Create `domain/model/Reminder.kt` domain model
    - Create `data/local/ReminderEntity.kt` Room entity with all fields
    - Create `data/local/ReminderDao.kt` with Room DAO interface (getAllActive, getById, upsert, softDelete, setActive)
    - Add reminders table to Room database schema
    - _Requirements: 1.1, 6.2_

  - [x] 8.2 Create Reminder repository
    - Create repository handling CRUD operations against Room/SQLite
    - Create: generate UUID, set defaults (isActive=true, isDeleted=false, syncedAt=null, modifiedAt=now)
    - Update: preserve id, syncedAt, isDeleted, update modifiedAt
    - SoftDelete: set isDeleted=true, syncedAt=null, update modifiedAt
    - Deactivate/Activate: toggle isActive, update modifiedAt
    - getAll: filter isDeleted=false, order by createdAt ASC
    - _Requirements: 1.1, 2.1, 3.2, 4.2, 4.5, 5.2_

  - [x] 8.3 Write property tests for Reminder repository
    - **Property 1: Creation produces a valid reminder record**
    - **Property 3: Display excludes deleted and orders by creation date**
    - **Property 6: Edit preserves system fields and updates modifiedAt**
    - **Property 7: Toggle active state updates isActive and modifiedAt**
    - **Property 10: Soft-delete sets correct field values**
    - **Validates: Requirements 1.1, 2.1, 3.2, 4.2, 4.5, 4.7, 5.2**
    - Use Kotest property testing module with JUnit 4

  - [x] 8.4 Create Reminder validation logic (Kotlin)
    - Validate name: 1–50 chars after trim, non-blank
    - Validate icon: exactly one emoji
    - Validate backgroundColor: member of Predefined_Palette set
    - Return field-level error messages
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 8.5 Write property tests for Reminder validation (Android)
    - **Property 2: Form submission requires all fields valid**
    - **Property 14: Name validation accepts trimmed strings of 1–50 characters**
    - **Property 15: Icon validation accepts exactly one emoji**
    - **Property 16: Color validation accepts only Predefined_Palette members**
    - **Validates: Requirements 1.2, 3.4, 7.1, 7.2, 7.3**
    - Use Kotest property testing module

  - [x] 8.6 Create Reminder sync integration (Android)
    - Implement push: select records where syncedAt is null or modifiedAt > syncedAt, batch ≤100
    - Implement pull: request records modified after lastSyncedAt, paginate with cursor, merge into local store
    - Conflict resolution: last-writer-wins, remote wins ties
    - Register with existing cross-cutting sync service
    - _Requirements: 6.1, 6.3, 6.5, 6.6, 6.7, 6.8_

  - [x] 8.7 Write property tests for Reminder sync (Android)
    - **Property 11: Push sync selects correct records and respects batch size**
    - **Property 12: Conflict resolution applies last-writer-wins with remote tie-break**
    - **Property 13: Pull merge inserts new and overwrites unmodified locals**
    - **Validates: Requirements 6.1, 6.3, 6.5**
    - Use Kotest property testing module

- [x] 9. Android — UI layer
  - [x] 9.1 Create RemindersViewModel and RemindersUiState
    - Create `ui/reminders/RemindersViewModel.kt` for state management
    - Create `ui/reminders/RemindersUiState.kt` immutable UI state (loading, error, reminders list)
    - Handle CRUD operations, confirmation dialogs state
    - _Requirements: 2.1, 2.5, 2.6_

  - [x] 9.2 Create ReminderFormViewModel and ReminderFormUiState
    - Create `ui/reminders/ReminderFormViewModel.kt` for form state + validation
    - Create `ui/reminders/ReminderFormUiState.kt` immutable form state
    - Real-time validation on field change (within 1 second)
    - Support create mode and edit mode (pre-populated)
    - _Requirements: 3.1, 7.5, 7.6_

  - [x] 9.3 Write unit tests for ViewModels
    - Test RemindersViewModel state transitions (loading → loaded, loading → error)
    - Test ReminderFormViewModel validation trigger timing
    - Test form pre-population in edit mode
    - Test deactivation/activation state changes
    - _Requirements: 2.5, 2.6, 3.1, 4.2, 4.5_

  - [x] 9.4 Create ReminderCard composable
    - Create `ui/components/ReminderCard.kt`
    - Display: left-aligned color indicator, icon, name
    - Actions: edit, deactivate/activate, delete
    - Deactivated state: reduced opacity + "Deactivated" badge
    - Support Material3 theming (light/dark)
    - _Requirements: 2.2, 4.4, 8.2_

  - [x] 9.5 Create ColorPickerDialog and EmojiPickerDialog composables
    - Create `ui/components/ColorPickerDialog.kt` — 9×5 grid with theme-aware shade recommendations
    - Create `ui/components/EmojiPickerDialog.kt` — category-based emoji grid (tabs for Faces, Gestures, Nature, etc.)
    - _Requirements: 7.2, 7.3, 8.5_

  - [x] 9.6 Create ReminderFormScreen composable
    - Create `ui/reminders/ReminderFormScreen.kt`
    - Fields: name (text), icon (EmojiPickerDialog), backgroundColor (ColorPickerDialog)
    - Inline validation errors adjacent to fields
    - Submit disabled when invalid
    - Cancel navigates back without persisting
    - On save failure: display error, retain values, stay on form
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 3.1, 3.3, 3.4, 7.4, 7.5, 7.6_

  - [x] 9.7 Create RemindersScreen composable
    - Create `ui/reminders/RemindersScreen.kt`
    - Display reminders list, empty state ("No reminders available"), loading indicator, error state
    - Deactivation Confirmation_Modal, Delete Confirmation_Modal (permanent warning with name)
    - Reactivation without confirmation
    - Navigation to form (create/edit)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 4.1, 4.3, 5.1, 5.3_

  - [x] 9.8 Add i18n strings and register navigation
    - Add Spanish and English string resources for all reminder UI text
    - Register RemindersScreen in navigation graph
    - Add "Reminders" to bottom navigation with `Icons.Outlined.Alarm` icon
    - _Requirements: 8.4, 8.6_

  - [x] 9.9 Write unit tests for composables
    - Test ReminderCard renders all data elements
    - Test deactivated card shows badge and reduced opacity
    - Test RemindersScreen empty state message
    - Test RemindersScreen loading indicator
    - Test ReminderFormScreen validation error display
    - Use Compose Testing library
    - _Requirements: 2.2, 2.3, 2.5, 4.4_

- [x] 10. Checkpoint — Android tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Cross-platform integration and wiring
  - [x] 11.1 Wire inactive reminders exclusion from calendar event selection
    - React Web: filter selectable reminders to isActive=true in calendar event creation flow
    - Android: filter selectable reminders to isActive=true in calendar event creation flow
    - **Property 9: Inactive reminders excluded from calendar event selection**
    - _Requirements: 4.6_

  - [x] 11.2 Wire edit rejection for deleted reminders
    - React Web: reject edit submission if reminder isDeleted=true, navigate back
    - Android: reject edit submission if reminder isDeleted=true, navigate back
    - _Requirements: 3.5_

  - [x] 11.3 Write integration tests for sync flow
    - React Web: end-to-end push/pull with mocked API
    - Backend: full CRUD lifecycle through API endpoints
    - Backend: sync endpoint authorization checks
    - _Requirements: 6.1, 6.4, 6.5_

- [x] 12. Final checkpoint — All platform tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation across platforms
- Property tests validate universal correctness properties (Properties 1–16 from design)
- Unit tests validate specific examples and edge cases
- The implementation mirrors the existing Shift feature patterns across all layers
- Backend uses .NET 10 (C#), React Web uses TypeScript, Android uses Kotlin
- All platforms share the same Predefined_Palette constant (45 colors)
- Sync logic reuses the existing cross-cutting sync service infrastructure

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1", "8.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "4.2", "4.4", "8.2", "8.4"] },
    { "id": 2, "tasks": ["1.6", "2.1", "4.3", "4.5", "4.6", "8.3", "8.5", "8.6"] },
    { "id": 3, "tasks": ["2.2", "2.4", "4.7", "5.1", "5.3", "5.4", "8.7", "9.1", "9.2"] },
    { "id": 4, "tasks": ["2.3", "2.5", "5.2", "5.5", "5.6", "9.3", "9.4", "9.5"] },
    { "id": 5, "tasks": ["2.6", "5.7", "6.1", "6.2", "6.4", "9.6", "9.7", "9.8"] },
    { "id": 6, "tasks": ["2.7", "6.3", "6.5", "9.9"] },
    { "id": 7, "tasks": ["11.1", "11.2"] },
    { "id": 8, "tasks": ["11.3"] }
  ]
}
```
