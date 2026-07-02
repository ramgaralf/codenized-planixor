# Implementation Plan: Synchronization Configuration & Management

## Overview

This plan implements synchronization configuration and management UI across the React Web PWA and Android app. It covers data models, persistence, state management, validation services, UI components (SyncButton, SyncConfigScreen, SyncScreen), navigation routes, and i18n strings. No backend changes are needed — the existing `GET /api/security/validate` endpoint is reused.

## Tasks

- [x] 1. Web — Data model, persistence, and sync store
  - [x] 1.1 Add SyncConfig model and Dexie v8 schema upgrade
    - Create `src/features/sync/models.ts` with `SyncConfig` interface and `ConnectionStatus` type
    - Upgrade `src/data/db.ts` to version 8 adding the `syncConfig: 'key'` table
    - Add a `syncConfig` table property to the `PlanixorDatabase` class
    - _Requirements: 7.1, 7.2_

  - [x] 1.2 Create syncStore (Zustand)
    - Create `src/features/sync/stores/syncStore.ts` implementing `SyncState` interface from design
    - Implement `loadConfig`, `saveConfig`, `clearConfig`, `pause`, `resume`, `setConnectionStatus`, `setLastSyncedAt` actions
    - Persist config to Dexie `syncConfig` table on save/clear
    - Derive `connectionStatus` from config presence and `isPaused` flag
    - _Requirements: 7.1, 10.3, 10.4_

  - [x] 1.3 Write unit tests for syncStore
    - Test state transitions: unconfigured → active, active → paused, paused → active, active → failing
    - Test loadConfig/saveConfig/clearConfig persistence round-trip
    - Test pause/resume toggle behavior
    - _Requirements: 7.1, 10.3, 10.4_

- [x] 2. Web — Validation service
  - [x] 2.1 Implement syncValidationService
    - Create `src/features/sync/services/syncValidationService.ts`
    - Implement `validateConnection(url: string, apiKey: string): Promise<ValidationResult>` function
    - Construct GET request to `{url}/api/security/validate` with `Authorization: Bearer {apiKey}` header
    - Map responses: 200 → success with username, non-200 → error with message, network errors → error
    - Implement 10-second timeout
    - _Requirements: 5.1, 5.2, 6.1_

  - [x] 2.2 Write property test for validation request construction (Property 4)
    - **Property 4: Validation request construction**
    - For any valid URL and API key, verify the service constructs the correct GET request to `{url}/api/security/validate` with `Authorization: Bearer {apiKey}` header
    - **Validates: Requirements 5.1**

  - [x] 2.3 Write property test for empty field rejection (Property 9)
    - **Property 9: Empty fields rejected by input validation**
    - For any whitespace-only or empty string as URL or API key, verify no network request is sent and a validation error is returned
    - **Validates: Requirements 12.1, 12.2**

  - [x] 2.4 Write unit tests for syncValidationService
    - Test success response parsing (extracts username)
    - Test 401/403/404/5xx error mapping to user-friendly messages
    - Test network timeout handling
    - _Requirements: 5.1, 5.2, 6.1, 6.3_

- [x] 3. Web — SyncButton component
  - [x] 3.1 Implement SyncButton component
    - Create `src/features/sync/components/SyncButton.tsx`
    - Accept `status: ConnectionStatus` and `onClick: () => void` props
    - Map status to Lucide icons: `unconfigured` → `CloudOff`, `active` → `Cloud` (with check style), `failing` → `CloudOff` (error tint), `paused` → `PauseCircle`
    - Apply color from design (secondary, success, error, secondary)
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Replace user avatar with SyncButton in HeaderBar
    - In `src/components/layout/HeaderBar.tsx`, replace the `<User>` icon button with `<SyncButton>`
    - Connect to `syncStore` for `connectionStatus`
    - On click: if config absent → navigate to `/sync/config`; if config present → navigate to `/sync`
    - _Requirements: 1.1, 2.1, 2.2_

  - [x] 3.3 Write property tests for SyncButton (Properties 1 & 2)
    - **Property 1: Sync button icon reflects connection status**
    - For any ConnectionStatus value, verify the correct icon variant is rendered
    - **Property 2: Sync button navigation depends on config presence**
    - For any state, verify navigation targets config screen when config absent, sync screen when config present
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 2.1, 2.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Web — SyncConfigScreen
  - [x] 5.1 Implement SyncConfigScreen component
    - Create `src/features/sync/components/SyncConfigScreen.tsx`
    - Layout: back button, title, URL input, API key input (masked), error area, Cancel and Validate buttons
    - Client-side validation: both fields must be non-empty/non-whitespace before sending request
    - On Validate: call `syncValidationService.validateConnection()`, disable button during request
    - On 200: persist config via syncStore, navigate to `/sync`
    - On non-200: display i18n error message, retain field values, keep buttons active
    - On Cancel: clear fields, navigate back
    - Pre-populate URL and API key when navigating from Sync Screen (edit flow per Requirement 9.2)
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 12.1, 12.2, 12.3_

  - [x] 5.2 Write property test for cancel clears form (Property 3)
    - **Property 3: Cancel action clears form state**
    - For any non-empty URL and API key entered, verify cancel action results in both fields being empty
    - **Validates: Requirements 4.1**

  - [x] 5.3 Write property test for non-200 preserves form state (Property 6)
    - **Property 6: Non-200 response preserves form state and shows error**
    - For any HTTP status code != 200 and any URL/API key values, verify fields retain original values and error message is present
    - **Validates: Requirements 6.1, 6.3**

- [x] 6. Web — SyncScreen
  - [x] 6.1 Implement SyncScreen component
    - Create `src/features/sync/components/SyncScreen.tsx`
    - Display: connection status indicator, server URL, masked API key, username, last synced date
    - Pause button (when active/failing) → calls `syncStore.pause()`
    - Resume button (when paused) → calls `syncStore.resume()`
    - Configuration button → navigates to `/sync/config` with pre-populated values
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 6.2 Write property test for pause/resume (Property 8)
    - **Property 8: Pause/resume toggles sync execution**
    - For any state with config present, verify pausing prevents sync operations and resuming permits them
    - **Validates: Requirements 10.3, 10.4**

- [x] 7. Web — Navigation routes and i18n
  - [x] 7.1 Add routes for /sync/config and /sync
    - In `src/app/routes.tsx`, add routes for `/sync/config` → `SyncConfigScreen` and `/sync` → `SyncScreen`
    - Both routes wrapped in `AppShell`
    - Update `getPageTitleKey` in `HeaderBar.tsx` for sync routes
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Add i18n strings (Spanish + English) for sync feature
    - Add sync-related keys to `src/infrastructure/i18n/locales/en.json` and `es.json`
    - Keys: `sync.configTitle`, `sync.title`, `sync.serverUrl`, `sync.apiKey`, `sync.username`, `sync.lastSynced`, `sync.status.*`, `sync.actions.validate`, `sync.actions.cancel`, `sync.actions.pause`, `sync.actions.resume`, `sync.actions.configuration`, `sync.errors.*`, `sync.validation.*`
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 8. Web — Sync service controller and config exclusion
  - [x] 8.1 Implement sync service controller bridge
    - Create `src/features/sync/services/syncServiceController.ts`
    - Bridge between syncStore (config, isPaused) and existing sync worker/adapter patterns
    - When paused: signal existing sync infrastructure to stop push/pull operations
    - When resumed and config present: signal sync infrastructure to resume
    - _Requirements: 10.3, 10.4_

  - [x] 8.2 Write property test for config excluded from sync (Property 7)
    - **Property 7: Sync config excluded from sync operations**
    - Verify syncConfig table/records never appear in push candidate selection logic
    - **Validates: Requirements 7.1, 7.2**

  - [x] 8.3 Write property test for config persistence round-trip (Property 5)
    - **Property 5: Config persistence round-trip**
    - For any valid SyncConfig (non-empty serverUrl, apiKey, username), verify persisting and reading back produces equivalent values
    - **Validates: Requirements 5.3, 7.1**

- [x] 9. Checkpoint - Ensure all web tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Android — Data model and persistence
  - [x] 10.1 Add SyncConfig data model and DataStore persistence
    - Create `data/sync/SyncConfig.kt` data class with `serverUrl`, `apiKey`, `username`, `isPaused`, `lastSyncedAt` fields
    - Create `data/sync/ConnectionStatus.kt` enum class (UNCONFIGURED, ACTIVE, FAILING, PAUSED)
    - Add sync preference keys to `PreferencesRepository.kt`: `sync_server_url`, `sync_api_key`, `sync_username`, `sync_is_paused`, `sync_last_synced_at`
    - Add read flows and write methods for sync config to `PreferencesRepository`
    - _Requirements: 7.1, 7.2_

  - [x] 10.2 Create SyncValidationService
    - Create `data/sync/SyncValidationService.kt` interface and `data/sync/SyncValidationServiceImpl.kt` implementation
    - Implement `suspend fun validate(url: String, apiKey: String): ValidationResult`
    - Construct GET request to `{url}/api/security/validate` with Bearer token header
    - Map responses: 200 → success, non-200 → error with message
    - Register in Hilt DI module
    - _Requirements: 5.1, 5.2, 6.1_

  - [x] 10.3 Write unit tests for SyncValidationService and PreferencesRepository sync methods
    - Test request construction with mock OkHttp/Retrofit
    - Test response mapping (success, 401, 404, 500, timeout)
    - Test config persistence round-trip via DataStore
    - _Requirements: 5.1, 6.1, 7.1_

- [x] 11. Android — SyncViewModel
  - [x] 11.1 Create SyncViewModel
    - Create `ui/sync/SyncViewModel.kt` with `SyncUiState` (config, connectionStatus, isPaused, lastSyncedAt, isValidating, validationError)
    - Implement: `loadConfig()`, `validateAndSave(url, apiKey)`, `pause()`, `resume()`, `clearConfig()`
    - Expose `StateFlow<SyncUiState>` for UI consumption
    - Integrate with `PreferencesRepository` and `SyncValidationService` via constructor injection (Hilt)
    - _Requirements: 7.1, 10.3, 10.4_

  - [x] 11.2 Write unit tests for SyncViewModel
    - Test state transitions: unconfigured → validating → active, validating → error
    - Test pause/resume updates `isPaused` and `connectionStatus`
    - Test clearConfig resets to unconfigured state
    - _Requirements: 10.3, 10.4_

- [x] 12. Android — SyncButton and TopBar integration
  - [x] 12.1 Implement SyncButton composable and integrate into TopBar
    - Create `ui/components/SyncButton.kt` composable
    - Map `ConnectionStatus` to Material icons: UNCONFIGURED → `CloudOff`, ACTIVE → `Cloud`, FAILING → `CloudOff` (error color), PAUSED → `PauseCircle`
    - Replace `Icons.Outlined.Person` IconButton in `AppNavigation.kt` TopAppBar with `SyncButton`
    - On click: navigate to `sync/config` if config absent, `sync` if config present
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2_

- [x] 13. Android — SyncConfigScreen
  - [x] 13.1 Implement SyncConfigScreen
    - Create `ui/sync/SyncConfigScreen.kt` composable
    - Layout: URL TextField, API key TextField (masked), error text area, Cancel and Validate buttons
    - Client-side validation: reject empty/whitespace-only fields
    - On Validate: call viewModel.validateAndSave(), disable button during validation
    - On success: navigate to `sync` route
    - On failure: display localized error message, retain field values
    - On Cancel: clear fields, navigate back
    - Pre-populate fields when editing existing config (per Requirement 9.2)
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.3, 5.4, 6.1, 6.2, 6.3, 9.2, 12.1, 12.2, 12.3_

- [x] 14. Android — SyncScreen
  - [x] 14.1 Implement SyncScreen
    - Create `ui/sync/SyncScreen.kt` composable
    - Display: status indicator, server URL, masked API key, username, last synced timestamp
    - Pause button (when active/failing) and Resume button (when paused)
    - Configuration button → navigate to `sync/config` with pre-populated fields
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15. Android — Navigation and i18n
  - [x] 15.1 Add Screen sealed class entries and navigation routes
    - Add `data object SyncConfig : Screen("sync/config")` and `data object Sync : Screen("sync")` to Screen sealed class
    - Add composable routes in AppNavigation NavHost for both screens
    - Pass `SyncViewModel` (scoped to activity or nav graph) to both screens
    - _Requirements: 2.1, 2.2_

  - [x] 15.2 Add i18n strings (Spanish + English) for sync feature
    - Add sync-related strings to `res/values/strings.xml` (English) and `res/values-es/strings.xml` (Spanish)
    - Keys: `sync_config_title`, `sync_title`, `sync_server_url`, `sync_api_key`, `sync_username`, `sync_last_synced`, `sync_status_*`, `sync_action_validate`, `sync_action_cancel`, `sync_action_pause`, `sync_action_resume`, `sync_action_configuration`, `sync_error_*`, `sync_validation_*`
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 16. Android — Sync service controller
  - [x] 16.1 Implement sync service controller bridge
    - Create `data/sync/SyncServiceController.kt`
    - Bridge config and pause/resume state to existing WorkManager-based sync adapters
    - On pause: cancel scheduled periodic sync WorkManager tasks
    - On resume with config present: enqueue periodic sync WorkManager tasks
    - Register in Hilt DI module
    - _Requirements: 10.3, 10.4_

  - [x] 16.2 Write unit tests for SyncServiceController
    - Test that pausing cancels sync scheduling
    - Test that resuming with config enqueues sync scheduling
    - Test that resuming without config does not enqueue
    - _Requirements: 10.3, 10.4_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (fast-check for web, kotlin-test/kotest for Android)
- Unit tests validate specific examples and edge cases
- No backend tasks required — existing `GET /api/security/validate` endpoint is reused as-is
- The web uses Zustand stores (following `calendarStore`/`reportsStore` pattern); Android uses ViewModel + DataStore (following existing `PreferencesRepository` pattern)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "10.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "10.2", "7.2", "15.2"] },
    { "id": 2, "tasks": ["1.3", "2.2", "2.3", "2.4", "3.1", "10.3", "11.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "5.1", "11.2", "12.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1", "7.1", "13.1"] },
    { "id": 5, "tasks": ["6.2", "8.1", "14.1", "15.1"] },
    { "id": 6, "tasks": ["8.2", "8.3", "16.1"] },
    { "id": 7, "tasks": ["16.2"] }
  ]
}
```
