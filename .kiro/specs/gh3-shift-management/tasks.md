# Implementation Plan: Shift Management

## Overview

This plan implements the Shift Management feature across all three Planixor sub-projects: Backend (.NET 10 API), React Web PWA, and Android App. The approach follows the offline-first architecture — local CRUD operations first, then backend sync endpoints. Each platform implements its own business logic for shift creation, validation, and hours worked calculation. The backend serves only as a synchronization hub for subscribed users.

## Tasks

- [x] 1. Backend — Domain layer (Core)
  - [x] 1.1 Create Shift entity and Value Objects
    - Create `ShiftName`, `ShiftIcon`, `ShiftColor`, `ShiftTime`, `HoursWorked` value objects with validation in `Codenized.Planixor.Core`
    - Create `Shift` entity with all fields: Id, UserId, Name, Icon, BackgroundColor, StartTime, EndTime, HoursWorked, IsActive, ModifiedAt, SyncedAt, IsDeleted, CreatedAt
    - Implement factory method for creating a new Shift with system-generated fields (modifiedAt = UTC now, syncedAt = null, isDeleted = false, isActive = true)
    - Implement update methods that enforce immutability of id, set modifiedAt on change
    - Implement soft-delete method setting isDeleted = true, syncedAt = null, modifiedAt = UTC now
    - Implement toggle-active method that flips isActive and updates modifiedAt
    - _Requirements: 1.1, 1.2, 4.7, 5.2, 6.2_

  - [x] 1.2 Write property tests for Shift entity (FsCheck)
    - **Property 1: Shift creation persists correct system fields**
    - **Property 5: Shift update preserves identity fields**
    - **Property 6: Toggle active status**
    - **Property 7: Soft delete sets correct flags**
    - **Validates: Requirements 1.1, 3.2, 4.2, 4.5, 4.7, 5.2**

  - [x] 1.3 Write property tests for Value Objects validation (FsCheck)
    - **Property 2: Shift validation rejects invalid input**
    - Test ShiftName (1–50 chars after trim, not whitespace-only)
    - Test ShiftIcon (exactly 1 emoji)
    - Test ShiftColor (must be in predefined palette)
    - Test ShiftTime (hours 0–23, minutes 0–59)
    - Test HoursWorked (1–1440 minutes)
    - **Validates: Requirements 1.2, 1.6, 7.1, 7.2, 7.3, 7.4, 7.5**

  - [x] 1.4 Write property test for Hours Worked calculation (FsCheck)
    - **Property 3: Hours worked calculation**
    - For any (startTime, endTime) as minutes from midnight: if equal → 1440; else → (endTime - startTime + 1440) % 1440
    - **Validates: Requirements 1.3, 9.1, 9.4**

- [x] 2. Backend — Persistence layer
  - [x] 2.1 Create Shift EF Core configuration and migration
    - Create `ShiftConfiguration` in `Codenized.Planixor.Persistence.MySql.Efc.DataContext` with MySQL column mapping
    - Add `DbSet<Shift>` to ApplicationWriteContext and ApplicationReadContext
    - Create EF Core migration for the Shifts table with indexes (UserId, UserId+ModifiedAt)
    - _Requirements: 6.2_

  - [x] 2.2 Implement ShiftSyncPushCommands repository
    - Create repository in `Codenized.Planixor.Persistence.MySql.Efc.Repositories` for upserting shift records on push
    - Implement conflict resolution: last-writer-wins based on `modifiedAt`; on tie (identical `modifiedAt`), the incoming client record wins over the existing server record (i.e., the push payload takes precedence)
    - _Requirements: 6.1, 6.3_

  - [x] 2.3 Implement ShiftSyncPullQueries repository
    - Create repository for querying shifts by userId where modifiedAt > lastSyncedAt
    - Support pagination with cursor (max 100 records per page)
    - _Requirements: 6.1, 6.5_

- [x] 3. Backend — DTOs and Use Cases
  - [x] 3.1 Create Shift sync DTOs and validators
    - Create `ShiftSyncPushRequest`, `ShiftSyncItem`, `ShiftSyncPullResponse` records in `Codenized.Planixor.Dtos`
    - Add FluentValidation or manual validation for sync payload (batch max 100 records, field constraints)
    - _Requirements: 6.1, 6.2_

  - [x] 3.2 Implement ShiftSyncPush use case
    - Create use case in `Codenized.Planixor.UseCases` that receives a batch of shift records, validates, and upserts with conflict resolution
    - Set syncedAt on successfully persisted records
    - _Requirements: 6.1, 6.3_

  - [x] 3.3 Implement ShiftSyncPull use case
    - Create use case that returns shifts modified after a given timestamp for the authenticated user
    - Support cursor-based pagination (max 100 per page)
    - _Requirements: 6.1, 6.5_

  - [x] 3.4 Write property tests for sync logic (FsCheck)
    - **Property 8: Sync push filter selects unsynced records**
    - **Property 9: Conflict resolution — last writer wins with remote tie-break**
    - **Property 10: Pull merge inserts new remote records**
    - **Validates: Requirements 6.1, 6.3, 6.5**

- [x] 4. Backend — API endpoints
  - [x] 4.1 Create Shift sync API endpoints
    - Add `POST /api/v1/shifts/sync/push` endpoint accepting `ShiftSyncPushRequest`
    - Add `GET /api/v1/shifts/sync/pull` endpoint with `lastSyncedAt` and cursor query params
    - Enforce authentication (401) and active subscription (403) on both endpoints
    - Register endpoints in `RegisterEndpoints.cs`
    - _Requirements: 6.1, 6.4_

  - [x] 4.2 Write unit tests for sync endpoints (NUnit)
    - Test unauthenticated → 401
    - Test no subscription → 403
    - Test invalid payload → 400
    - Test batch exceeds 100 → 400
    - _Requirements: 6.1, 6.4_

- [x] 5. Checkpoint — Backend complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 6. React Web — Data layer and models
  - [x] 6.1 Create Shift model, constants, and Dexie schema
    - Create `src/features/shifts/models.ts` with Shift interface (id, name, icon, backgroundColor, startTime, endTime, hoursWorked, isActive, createdAt, modifiedAt, syncedAt, isDeleted)
    - Create `src/features/shifts/constants.ts` with PREDEFINED_PALETTE, validation limits, i18n keys
    - Add `shifts` table to existing Dexie database (increment Dexie version from current) with indexes: `id, createdAt, isDeleted, isActive`
    - _Requirements: 1.1, 6.2, 8.5_

  - [x] 6.2 Implement Shift validation schema (Zod)
    - Create validation schema in `src/features/shifts/services/shiftValidation.ts`
    - Validate name (1–50 chars after trim, not whitespace-only), icon (1 emoji), color (in palette), startTime/endTime (0–1439 minutes), hoursWorked (1–1440 minutes)
    - Return field-level error keys for i18n
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 6.3 Write property tests for Shift validation (fast-check)
    - **Property 2: Shift validation rejects invalid input**
    - Generate arbitrary invalid inputs and verify rejection with correct field identification
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

  - [x] 6.4 Implement Hours Worked calculation utility
    - Create `src/features/shifts/services/hoursWorkedCalculation.ts`
    - Implement: if startTime == endTime → 1440; else → (endTime - startTime + 1440) % 1440
    - Maximum computed result for unequal times: 1439 minutes
    - _Requirements: 1.3, 9.1, 9.4_

  - [x] 6.5 Write property tests for Hours Worked calculation (fast-check)
    - **Property 3: Hours worked calculation**
    - **Property 11: Time change after manual override triggers recalculation**
    - **Validates: Requirements 1.3, 9.1, 9.3, 9.4**

- [x] 7. React Web — Shift service (IndexedDB CRUD)
  - [x] 7.1 Implement shiftService with CRUD operations
    - Create `src/features/shifts/services/shiftService.ts` implementing: getAll, getById, create, update, softDelete, deactivate, activate
    - `create`: generate UUID, set modifiedAt = now, syncedAt = null, isDeleted = false, isActive = true, createdAt = now; duplicate names are permitted (no uniqueness check on name)
    - `update`: preserve id/syncedAt/isDeleted, update modifiedAt
    - `softDelete`: set isDeleted = true, syncedAt = null, update modifiedAt
    - `getAll`: filter isDeleted = false, order by createdAt ASC
    - _Requirements: 1.1, 1.7, 2.1, 3.2, 4.2, 4.5, 5.2, 5.4_

  - [x] 7.2 Write property tests for shiftService (fast-check)
    - **Property 1: Shift creation persists correct system fields**
    - **Property 4: Shift listing filter and ordering**
    - **Property 5: Shift update preserves identity fields**
    - **Property 6: Toggle active status**
    - **Property 7: Soft delete sets correct flags**
    - **Validates: Requirements 1.1, 2.1, 3.2, 4.2, 4.5, 4.7, 5.2, 5.4**

- [x] 8. React Web — Sync logic
  - [x] 8.1 Implement shift sync filter and conflict resolution
    - Create `src/features/shifts/services/shiftSync.ts`
    - Push filter: select records where syncedAt is null OR modifiedAt > syncedAt
    - Conflict resolution on pull: last-writer-wins based on modifiedAt, remote wins on tie
    - Pull merge: insert new remote records with syncedAt = now
    - _Requirements: 6.1, 6.3, 6.5_

  - [x] 8.2 Write property tests for sync logic (fast-check)
    - **Property 8: Sync push filter selects unsynced records**
    - **Property 9: Conflict resolution — last writer wins with remote tie-break**
    - **Property 10: Pull merge inserts new remote records**
    - **Validates: Requirements 6.1, 6.3, 6.5**

- [x] 9. React Web — i18n strings
  - [x] 9.1 Add shift-related i18n translation keys
    - Add English and Spanish translation entries for all shift validation errors, empty state, confirmation modals, and form labels
    - Keys: shift.validation.name.required, shift.validation.name.maxLength, shift.validation.icon.required, shift.validation.color.required, shift.validation.startTime.required, shift.validation.endTime.required, shift.validation.hoursWorked.range, shift.error.loadFailed, shift.empty, shift.deactivate.confirm, shift.delete.confirm
    - _Requirements: 8.4_

- [x] 10. React Web — UI components
  - [x] 10.1 Create ShiftCard component
    - Create `src/features/shifts/components/ShiftCard.tsx`
    - Display: left-aligned color indicator, icon + name on first line, start time + end time + hours worked on second line
    - Show reduced opacity + "Deactivated" badge when isActive = false
    - Include edit, deactivate/activate toggle, and delete action controls
    - Format times per device locale
    - _Requirements: 2.2, 4.4_

  - [x] 10.2 Write unit tests for ShiftCard (Vitest + RTL)
    - Test rendering with active shift data
    - Test deactivated shift shows reduced opacity and badge
    - Test action button callbacks
    - Test accessibility (roles, labels)
    - _Requirements: 2.2, 4.4_

  - [x] 10.3 Create ShiftForm component
    - Create `src/features/shifts/components/ShiftForm.tsx`
    - Fields: name (text input, max 50), icon (emoji picker), backgroundColor (color palette selector), startTime (time picker), endTime (time picker), hoursWorked (time picker, auto-calculated with manual override)
    - Display per-field validation errors adjacent to invalid fields
    - Support both create mode and edit mode (pre-populated values)
    - Debounced field validation (within 1 second of change)
    - IF the user clears or removes either start time or end time, THEN clear the Hours_Worked value
    - Cancel action discards data and navigates back
    - _Requirements: 1.2, 1.4, 1.5, 3.1, 3.3, 7.6, 7.7, 7.8, 9.2, 9.3, 9.5_

  - [x] 10.4 Write unit tests for ShiftForm (Vitest + RTL)
    - Test form submission with valid data
    - Test validation error display for each field
    - Test hours worked auto-calculation when times change
    - Test manual override of hours worked
    - Test recalculation after time change post-override
    - Test cancel navigation
    - Test edit mode pre-population
    - _Requirements: 1.2, 1.4, 1.5, 7.6, 7.7, 7.8, 9.2, 9.3, 9.5_

  - [x] 10.5 Create ConfirmationModal component
    - Create `src/features/shifts/components/ConfirmationModal.tsx` (or reuse shared if exists)
    - Accept title, message, confirm/cancel callbacks
    - Dismiss on cancel, clicking outside, or pressing escape — all make no changes
    - _Requirements: 4.1, 5.1, 5.3_

- [x] 11. React Web — Shifts page (container)
  - [x] 11.1 Implement Shifts page container
    - Create `src/features/shifts/shifts.tsx` as the main container
    - Load all non-deleted shifts ordered by createdAt ASC
    - Display loading indicator while retrieving from IndexedDB
    - Display error message if retrieval fails
    - Display "No shifts available" empty state when no shifts exist
    - Include "New Shift" button navigating to create form
    - Handle deactivation flow (show confirmation modal, toggle isActive)
    - Handle reactivation flow (toggle isActive without confirmation)
    - Handle delete flow (show permanent warning modal, soft-delete)
    - Handle edit navigation (navigate to edit form)
    - Reject edit of deleted shift (navigate back silently)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 3.5, 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3_

  - [x] 11.2 Write unit tests for Shifts page (Vitest + RTL)
    - Test loading state display
    - Test empty state message
    - Test error state display
    - Test shift list rendering in correct order
    - Test deactivation confirmation flow
    - Test delete confirmation with permanent warning
    - Test dismiss delete modal makes no changes
    - _Requirements: 2.1, 2.3, 2.5, 2.6, 4.1, 4.3, 5.1, 5.3_

  - [x] 11.3 Implement useShiftForm hook
    - Create `src/features/shifts/hooks/useShiftForm.ts`
    - Manage form state, field-level validation (debounced), hours worked calculation + manual override tracking
    - Handle create and edit submission through shiftService
    - _Requirements: 1.1, 3.2, 7.7, 7.8, 9.2, 9.3_

- [x] 12. React Web — Routing and page registration
  - [x] 12.1 Register Shifts routes and navigation
    - Add route for `/shifts` (list page) and `/shifts/new` (create form) and `/shifts/:id/edit` (edit form) in the app router
    - Ensure the "Shifts" navigation item in the sidebar links to `/shifts`
    - Verify that existing theme (light/dark) and language (es/en) mechanisms apply correctly to all new Shifts pages (no custom implementation needed if global theming already exists)
    - _Requirements: 2.4, 8.3, 8.4_

- [x] 13. Checkpoint — React Web complete
  - Ensure all React Web tests pass (`pnpm vitest --run`), lint clean (`pnpm run lint`), type check clean (`pnpm tsc --noEmit`), build succeeds (`pnpm run build`). Ask the user if questions arise.

- [x] 14. Android — Data layer
  - [x] 14.1 Create ShiftEntity and ShiftDao (Room)
    - Create `data/local/ShiftEntity.kt` with Room annotations (@Entity, @PrimaryKey)
    - Fields: id (String), name, icon, backgroundColor, startTime (Int, minutes from midnight), endTime (Int), hoursWorked (Int), isActive (Boolean), createdAt (Long, epoch millis), modifiedAt (Long), syncedAt (Long?), isDeleted (Boolean)
    - Create `data/local/ShiftDao.kt` with queries: getAllActive (isDeleted = 0, ORDER BY createdAt ASC), getById, upsert, softDelete, setActive
    - Add ShiftDao to the existing Room database
    - _Requirements: 1.1, 2.1, 5.4, 6.2_

  - [x] 14.2 Create Shift domain model and repository
    - Create `domain/model/Shift.kt` domain model
    - Create `data/local/ShiftRepository.kt` wrapping ShiftDao with business logic: create (UUID generation, system fields; duplicate names are permitted — no uniqueness check), update (preserve id/syncedAt/isDeleted), softDelete, toggleActive
    - _Requirements: 1.1, 1.7, 3.2, 4.2, 4.5, 5.2_

  - [x] 14.3 Write property tests for ShiftRepository (Kotest)
    - **Property 1: Shift creation persists correct system fields**
    - **Property 4: Shift listing filter and ordering**
    - **Property 5: Shift update preserves identity fields**
    - **Property 6: Toggle active status**
    - **Property 7: Soft delete sets correct flags**
    - **Validates: Requirements 1.1, 2.1, 3.2, 4.2, 4.5, 4.7, 5.2, 5.4**

- [x] 15. Android — Validation and calculation
  - [x] 15.1 Implement shift validation logic
    - Create `domain/validation/ShiftValidator.kt`
    - Validate: name (1–50 chars after trim, not whitespace-only), icon (exactly 1 emoji), color (in predefined palette), startTime/endTime (hours 0–23, minutes 0–59), hoursWorked (1–1440 minutes)
    - Return field-level error keys for i18n
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.2 Implement hours worked calculation utility
    - Create `domain/util/HoursWorkedCalculator.kt`
    - Same logic: if startTime == endTime → 1440; else → (endTime - startTime + 1440) % 1440
    - _Requirements: 1.3, 9.1, 9.4_

  - [x] 15.3 Write property tests for validation and calculation (Kotest)
    - **Property 2: Shift validation rejects invalid input**
    - **Property 3: Hours worked calculation**
    - **Property 11: Time change after manual override triggers recalculation**
    - **Validates: Requirements 1.3, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.3, 9.4**

- [x] 16. Android — Sync logic
  - [x] 16.1 Implement shift sync filter and conflict resolution
    - Create `data/sync/ShiftSyncManager.kt`
    - Push filter: select records where syncedAt is null OR modifiedAt > syncedAt
    - Conflict resolution: last-writer-wins, remote wins on tie
    - Pull merge: insert new remote records with syncedAt = now
    - _Requirements: 6.1, 6.3, 6.5_

  - [x] 16.2 Write property tests for Android sync logic (Kotest)
    - **Property 8: Sync push filter selects unsynced records**
    - **Property 9: Conflict resolution — last writer wins with remote tie-break**
    - **Property 10: Pull merge inserts new remote records**
    - **Validates: Requirements 6.1, 6.3, 6.5**

- [x] 17. Android — UI layer
  - [x] 17.1 Create ShiftsViewModel and ShiftsUiState
    - Create `ui/shifts/ShiftsUiState.kt` with sealed states: Loading, Empty, Error, Success(shifts)
    - Create `ui/shifts/ShiftsViewModel.kt` managing shift list loading, deactivation (with confirmation), reactivation (no confirmation), and deletion (with confirmation)
    - _Requirements: 2.1, 2.3, 2.5, 2.6, 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3_

  - [x] 17.2 Create ShiftFormViewModel and ShiftFormUiState
    - Create `ui/shifts/ShiftFormUiState.kt` with form field states and validation errors
    - Create `ui/shifts/ShiftFormViewModel.kt` managing form state, debounced field validation, hours worked auto-calculation, manual override tracking, create/edit submission
    - Handle recalculation when time changes after manual override
    - Handle clearing hours worked when a time field is cleared
    - _Requirements: 1.1, 1.4, 3.2, 7.7, 7.8, 9.2, 9.3, 9.5_

  - [x] 17.3 Write unit tests for ViewModels (JUnit)
    - Test ShiftsViewModel state transitions (loading → success, loading → error, loading → empty)
    - Test ShiftFormViewModel validation trigger timing (within 1s of field change)
    - Test hours worked recalculation after override
    - _Requirements: 2.5, 2.6, 7.8, 9.3_

  - [x] 17.4 Create ShiftCard composable
    - Create `ui/components/ShiftCard.kt`
    - Display: left-aligned color indicator, icon + name, start time + end time + hours worked
    - Show reduced opacity + "Deactivated" badge when isActive = false
    - Include edit, toggle active, and delete action controls
    - _Requirements: 2.2, 4.4_

  - [x] 17.5 Create ShiftsScreen composable
    - Create `ui/shifts/ShiftsScreen.kt`
    - Render loading indicator, error message, empty state ("No shifts available"), or shift card list
    - Include "New Shift" FAB/button navigating to shift form
    - Include ConfirmationDialog for deactivation and deletion
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 4.1, 5.1_

  - [x] 17.6 Create ShiftFormScreen composable
    - Create `ui/shifts/ShiftFormScreen.kt`
    - Fields: name (text), icon (emoji picker), backgroundColor (palette grid), startTime (time picker), endTime (time picker), hoursWorked (time picker with auto-calculation)
    - Display per-field validation errors (delegates validation logic, debounce timing, and hours worked calculation to ShiftFormViewModel)
    - Support create and edit modes
    - Cancel discards and navigates back
    - _Requirements: 1.2, 1.4, 1.5, 3.1, 3.3, 7.6, 9.2_

  - [x] 17.7 Write Compose UI tests
    - Test ShiftCard rendering and interactions
    - Test ShiftsScreen empty/loading/error states
    - Test ShiftFormScreen validation display
    - _Requirements: 2.2, 2.3, 2.5, 4.4_

- [x] 18. Android — Navigation and i18n
  - [x] 18.1 Register Shifts navigation and i18n strings
    - Add Shifts destination to the bottom navigation graph
    - Add shift form navigation (create and edit routes)
    - Add all shift-related string resources in `strings.xml` (English) and `strings-es.xml` (Spanish)
    - Ensure theme and language changes apply immediately without restart
    - _Requirements: 2.4, 8.3, 8.4_

- [x] 19. Checkpoint — Android complete
  - Ensure all Android tests pass, build succeeds. Ask the user if questions arise.

- [x] 20. Cross-platform consistency verification
  - [x] 20.1 Verify cross-platform field and behavior parity
    - Confirm same fields, validation rules, and default behaviors on React Web and Android
    - Confirm same data elements in same order on ShiftCard across platforms
    - Confirm same Predefined_Palette color values used on both platforms
    - _Requirements: 8.1, 8.2, 8.5_

- [x] 21. Final checkpoint
  - Ensure all tests pass across all three sub-projects, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation per sub-project
- Property tests validate universal correctness properties from the design document (Properties 1–11)
- Unit tests validate specific examples, edge cases, and UI rendering
- The backend is sync-only — all CRUD business logic lives in the clients (offline-first)
- The React Web workflow `#react-web-workflow-add-feature` MUST be loaded before implementing React Web tasks
- All i18n strings are externalized from day one (Spanish + English)
- **Future work (Req 4.6):** Deactivated shifts should be excluded from selectable shifts when creating calendar events. This will be implemented as part of the Calendar Events feature, not in this spec.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "6.1", "9.1", "14.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.1", "6.2", "6.4", "14.2", "15.1", "15.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1", "6.3", "6.5", "7.1", "14.3", "15.3"] },
    { "id": 3, "tasks": ["3.2", "3.3", "7.2", "8.1", "16.1"] },
    { "id": 4, "tasks": ["3.4", "4.1", "8.2", "10.1", "10.5", "16.2"] },
    { "id": 5, "tasks": ["4.2", "10.2", "10.3", "11.3", "17.1", "17.2"] },
    { "id": 6, "tasks": ["10.4", "11.1", "17.3", "17.4"] },
    { "id": 7, "tasks": ["11.2", "12.1", "17.5", "17.6"] },
    { "id": 8, "tasks": ["17.7", "18.1"] },
    { "id": 9, "tasks": ["20.1"] }
  ]
}
```
