# Implementation Plan: Synchronization Improvements

## Overview

This plan implements eight synchronization improvements across three platforms (backend .NET, React Web PWA, Android). Tasks are organized by platform with proper dependency ordering: backend purge first (it's independent), then client-side changes in parallel across web and Android, followed by integration wiring and final checkpoints.

## Tasks

- [x] 1. Backend — Notification Record Purge During Push
  - [x] 1.1 Add `PurgePastRecordsAsync` method to `INotificationRecordSyncPushCommands` interface
    - Add `Task PurgePastRecordsAsync(string userId)` to `backend/src/Codenized.Planixor.UseCases/NotificationRecord/SyncPush/Commands/INotificationRecordSyncPushCommands.cs`
    - _Requirements: 1.1, 1.6_

  - [x] 1.2 Implement `PurgePastRecordsAsync` in the repository
    - In `backend/src/Codenized.Planixor.Persistence.MySql.Efc.Repositories/NotificationRecord/SyncPush/NotificationRecordSyncPushCommands.cs`
    - Load all NotificationRecords for the userId
    - For each record, look up CalendarEvent by Id; if not found (orphaned) or CalendarEvent.EndDay < DateOnly.FromDateTime(DateTime.UtcNow), mark for purge
    - Use in-memory dictionary lookup for CalendarEvents (EF Core MySQL `.Contains()` limitation)
    - Hard delete via `context.RemoveRange()` + `SaveChangesAsync()`
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [x] 1.3 Call purge in `NotificationRecordSyncPushService` before processing the push batch
    - In `backend/src/Codenized.Planixor.UseCases/NotificationRecord/SyncPush/NotificationRecordSyncPushService.cs`
    - Wrap purge call in try/catch — log warning on failure, continue to push processing
    - Purge executes after authentication validation but before upsert logic
    - _Requirements: 1.4, 1.7_

  - [x] 1.4 Write unit tests for purge logic
    - Test correct identification of past records (EndDay < today)
    - Test orphaned record detection (CalendarEvent not found)
    - Test user-scoping (only deletes authenticated user's records)
    - Test purge failure does not abort push processing
    - Test no records to purge scenario (skip silently)
    - _Requirements: 1.1, 1.3, 1.4, 1.6_

- [x] 2. Checkpoint — Backend purge complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. React Web — SyncConfig model expansion and base path normalization
  - [x] 3.1 Expand `SyncConfig` model with `apiBasePath` and `syncIntervalMinutes`
    - In `frontend/react-web/src/features/sync/models.ts`
    - Add `apiBasePath: string` (default `"/api"`) and `syncIntervalMinutes: number` (default `5`)
    - Update sync store in `frontend/react-web/src/features/sync/stores/syncStore.ts` to include new fields
    - _Requirements: 4.2, 5.4_

  - [x] 3.2 Create API base path normalization and validation utility
    - Create `frontend/react-web/src/features/sync/services/apiBasePathUtils.ts`
    - Implement `normalizeApiBasePath(input: string): string` — prepend `/` if absent, strip trailing `/`, empty → `/api`
    - Implement `validateApiBasePath(input: string): string | null` — return error message if invalid chars or length > 128, null if valid
    - Allowed characters: `[a-zA-Z0-9\-\_\.\/]`
    - _Requirements: 4.6, 4.7, 4.10_

  - [x] 3.3 Write unit tests for API base path normalization and validation
    - **Property 8: API base path normalization**
    - **Property 9: API base path validation rejects invalid characters**
    - **Validates: Requirements 4.6, 4.7, 4.10**

- [x] 4. React Web — Notification purge service
  - [x] 4.1 Create `notificationPurgeService.ts`
    - Create `frontend/react-web/src/features/sync/services/notificationPurgeService.ts`
    - Query all local NotificationRecords from IndexedDB
    - Join with CalendarEvents to identify records where startDay < today (YYYY-MM-DD comparison) or orphaned (no matching CalendarEvent)
    - Permanently delete identified records from IndexedDB
    - Return `{ purgedCount: number; error?: string }`
    - Log errors, never throw — return error in result
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

  - [x] 4.2 Write unit tests for notification purge service
    - **Property 3: Client purge identifies correct records**
    - **Validates: Requirements 2.1, 2.3, 2.7**

- [x] 5. React Web — Update syncServiceController for dynamic interval, base path, conditional lastSyncedAt, and purge
  - [x] 5.1 Replace hardcoded `SYNC_INTERVAL_MS` with config-driven value
    - In `frontend/react-web/src/features/sync/services/syncServiceController.ts`
    - Read `syncIntervalMinutes` from sync config; compute interval as `syncIntervalMinutes * 60 * 1000`
    - On config change (interval modified), restart the interval timer with new value
    - _Requirements: 5.5, 5.6, 5.7, 5.10_

  - [x] 5.2 Replace hardcoded `/api` with `apiBasePath` in all URL constructions
    - Update all `createCalendarApiClient`, `createNotificationApiClient`, `createAnnualHoursApiClient`, `syncShifts`, `pushShifts`, `syncReminders`, `pushReminders` functions
    - Construct URLs as `${serverUrl}${apiBasePath}/{entity-kebab}/sync/{action}`
    - Read `apiBasePath` from config (with fallback to `/api`)
    - _Requirements: 4.3, 4.4, 4.5, 4.8_

  - [x] 5.3 Fix `lastSyncedAt` to only update on at least one entity success
    - Track `hasAnySuccess` boolean across entity sync calls
    - Only call `setLastSyncedAt` and persist to IndexedDB if `hasAnySuccess === true`
    - _Requirements: 3.4 (cross-platform consistency with Android fix)_

  - [x] 5.4 Add post-cycle notification purge call
    - After all entity syncs complete (and before status update), call `purgePastNotifications()`
    - Log any purge errors but do not affect sync status
    - _Requirements: 2.1, 2.4_

  - [x] 5.5 Write unit tests for syncServiceController changes
    - **Property 7: URL construction uses configured base path**
    - **Property 10: Sync interval applied to scheduler**
    - **Property 5: Failed sync preserves lastSyncedAt**
    - **Validates: Requirements 4.3, 4.4, 4.5, 5.5, 3.4**

- [x] 6. React Web — Update syncValidationService to use apiBasePath
  - [x] 6.1 Update validation URL construction
    - In `frontend/react-web/src/features/sync/services/syncValidationService.ts`
    - Construct validation URL as `${serverUrl}${apiBasePath}/security/validate`
    - Accept `apiBasePath` parameter (or read from form state)
    - _Requirements: 4.5_

- [x] 7. React Web — SyncConfigScreen updates (base path, interval, username change)
  - [x] 7.1 Add API base path input field to SyncConfigScreen
    - In `frontend/react-web/src/features/sync/components/SyncConfigScreen.tsx`
    - Text input with default value `/api`, max 128 chars
    - Apply normalization on save, show validation error for invalid characters
    - Use i18n keys for label, placeholder, and error message
    - _Requirements: 4.1, 4.6, 4.7, 4.10, 7.1, 7.6_

  - [x] 7.2 Add sync interval selector to SyncConfigScreen
    - Dropdown/select control with values: 5, 10, 15, 20, 25, 30, 45, 60 minutes
    - Default: 5 minutes
    - Use i18n keys for label and unit display
    - _Requirements: 5.1, 5.2, 5.3, 7.2, 7.6_

  - [x] 7.3 Implement username change detection and confirmation dialog
    - After successful validation, compare returned username with stored username (case-sensitive)
    - If mismatch and previous config exists: show confirmation dialog listing data categories to be deleted
    - On confirm: delete all local syncable data (calendar events, shifts, reminders, notification records, annual hours config), reset lastSyncedAt, save new config
    - On cancel: retain current config
    - If first-time config or same username: save directly
    - If deletion fails: abort, retain existing data/config, show error
    - Use i18n keys; cancel action is default/highlighted
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.3, 7.5, 7.7_

  - [x] 7.4 Write unit tests for username change detection
    - **Property 11: Username change detection triggers on mismatch**
    - **Validates: Requirements 6.1, 6.7**

- [x] 8. React Web — SyncScreen display sync interval
  - [x] 8.1 Display configured sync interval on SyncScreen
    - In `frontend/react-web/src/features/sync/components/SyncScreen.tsx`
    - Show sync interval as "{value} min" alongside other sync details
    - Use i18n keys for label
    - Reflect updated value immediately after config save
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. React Web — Add i18n translation keys
  - [x] 9.1 Add English and Spanish translation keys for all new UI strings
    - API base path: label, placeholder, error message
    - Sync interval: label, unit, options
    - Username change dialog: title, message (with usernames), confirm, cancel, data categories, error
    - Sync screen interval display label
    - _Requirements: 7.6, 8.3_

- [x] 10. Checkpoint — React Web complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Android — SyncConfig expansion and preferences persistence
  - [x] 11.1 Expand `SyncConfig.kt` with `apiBasePath` and `syncIntervalMinutes`
    - In `frontend/android-app/app/src/main/java/com/codenized/planixor/data/sync/SyncConfig.kt`
    - Add `val apiBasePath: String = "/api"` and `val syncIntervalMinutes: Int = 5`
    - _Requirements: 4.2, 5.4_

  - [x] 11.2 Update `PreferencesRepository` to persist new SyncConfig fields
    - In `frontend/android-app/app/src/main/java/com/codenized/planixor/data/local/PreferencesRepository.kt`
    - Add `KEY_SYNC_API_BASE_PATH` and `KEY_SYNC_INTERVAL_MINUTES` DataStore keys
    - Update `syncConfigFlow` to read and `saveSyncConfig` to write new fields
    - Add `KEY_SYNC_CONNECTION_STATUS` key to persist `ConnectionStatus` across restarts
    - _Requirements: 3.7, 4.2, 5.4_

- [x] 12. Android — DynamicBaseUrlInterceptor update for apiBasePath
  - [x] 12.1 Add `apiBasePath` property to `DynamicBaseUrlInterceptor`
    - In `frontend/android-app/app/src/main/java/com/codenized/planixor/data/sync/DynamicBaseUrlInterceptor.kt`
    - Add `@Volatile var apiBasePath: String?` property
    - When rewriting URLs, apply the base path segment between the host and the existing path
    - Construct URL as: `{scheme}://{host}:{port}{apiBasePath}/{original-path-after-placeholder}`
    - _Requirements: 4.9, 4.3_

  - [x] 12.2 Write unit tests for DynamicBaseUrlInterceptor with apiBasePath
    - Test base path applied to URL correctly
    - Test path segment ordering
    - Test default `/api` behavior
    - _Requirements: 4.9_

- [x] 13. Android — NotificationPurgeService
  - [x] 13.1 Add Room DAO query for past notification records
    - In `frontend/android-app/app/src/main/java/com/codenized/planixor/data/local/NotificationRecordDao.kt`
    - Add query joining notification_records with calendar_events to find records where startDay < today or orphaned
    - _Requirements: 2.6_

  - [x] 13.2 Create `NotificationPurgeService`
    - Create `frontend/android-app/app/src/main/java/com/codenized/planixor/data/sync/NotificationPurgeService.kt`
    - Inject `NotificationRecordDao` and `CalendarEventDao`
    - Implement `suspend fun purgePastNotifications(): Int` — query past/orphaned records and delete them
    - Log errors but never throw
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

  - [x] 13.3 Write unit tests for NotificationPurgeService
    - **Property 3: Client purge identifies correct records**
    - **Validates: Requirements 2.1, 2.3, 2.7**

- [x] 14. Android — SyncServiceController fixes (error classification, lastSyncedAt, interval, purge)
  - [x] 14.1 Implement error classification in `SyncServiceController`
    - In `frontend/android-app/app/src/main/java/com/codenized/planixor/data/sync/SyncServiceController.kt`
    - Classify exceptions: SocketTimeoutException, ConnectRefusedException, UnknownHostException, IOException → connectivity failure
    - Classify HTTP 5xx → connectivity failure
    - Classify HTTP 401/403 → auth error (no status change)
    - Set `ConnectionStatus.FAILING` on connectivity failure; remain unchanged on auth error
    - Persist failing state via PreferencesRepository
    - _Requirements: 3.1, 3.6, 3.7_

  - [x] 14.2 Fix `lastSyncedAt` conditional update
    - Track `hasAnySuccess` across entity sync calls
    - Only update `lastSyncedAt` when at least one entity sync succeeds
    - Recover to `ConnectionStatus.ACTIVE` when full cycle succeeds after being in `FAILING`
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 14.3 Replace hardcoded `SYNC_INTERVAL_MS` with config-driven value
    - Read `syncIntervalMinutes` from SyncConfig; compute delay as `config.syncIntervalMinutes * 60 * 1000L`
    - On config change, restart the sync schedule with new interval
    - _Requirements: 5.5, 5.6, 5.8, 5.9, 5.10_

  - [x] 14.4 Set `apiBasePath` on `DynamicBaseUrlInterceptor` from config
    - In `scheduleSyncWorker` and config observer, set `dynamicBaseUrlInterceptor.apiBasePath = config.apiBasePath`
    - _Requirements: 4.9_

  - [x] 14.5 Add post-cycle notification purge call
    - Inject `NotificationPurgeService` into `SyncServiceController`
    - After all entity syncs complete, call `purgePastNotifications()`
    - Log errors but do not affect sync status
    - _Requirements: 2.1, 2.4_

  - [x] 14.6 Write unit tests for SyncServiceController changes
    - **Property 4: Connectivity error classification drives status transition**
    - **Property 5: Failed sync preserves lastSyncedAt**
    - **Property 10: Sync interval applied to scheduler**
    - **Validates: Requirements 3.1, 3.4, 3.6, 5.5**

- [x] 15. Checkpoint — Android sync controller complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Android — SyncConfigScreen updates (base path, interval, username change)
  - [x] 16.1 Add API base path field to SyncConfigScreen
    - In `frontend/android-app/app/src/main/java/com/codenized/planixor/ui/sync/SyncConfigScreen.kt`
    - Text field with default `/api`, max 128 chars
    - Apply normalization on save, show validation error for invalid characters
    - Use string resources for label, placeholder, error
    - _Requirements: 4.1, 4.6, 4.7, 4.10, 7.1, 7.6_

  - [x] 16.2 Add sync interval dropdown to SyncConfigScreen
    - Dropdown/exposed dropdown menu with values: 5, 10, 15, 20, 25, 30, 45, 60 minutes
    - Default: 5 minutes
    - Use string resources for label and unit
    - _Requirements: 5.1, 5.2, 5.3, 7.2, 7.6_

  - [x] 16.3 Implement username change detection in SyncViewModel
    - In `frontend/android-app/app/src/main/java/com/codenized/planixor/ui/sync/SyncViewModel.kt`
    - After successful validation, compare returned username with stored username (case-sensitive)
    - If mismatch and previous config exists: trigger confirmation dialog state
    - Implement data wipe method: delete all local syncable data atomically
    - On confirm: wipe data, reset lastSyncedAt, save new config, navigate to SyncScreen
    - On cancel: retain current config
    - If first-time config or same username: save directly
    - If deletion fails: abort, retain existing data/config, emit error state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.3, 7.7_

  - [x] 16.4 Add username change confirmation dialog composable
    - Show previous and new username in dialog body
    - List data categories to be deleted
    - Cancel action highlighted as default
    - Use string resources (i18n)
    - _Requirements: 6.2, 6.8, 7.5_

  - [x] 16.5 Write unit tests for username change detection in SyncViewModel
    - **Property 11: Username change detection triggers on mismatch**
    - **Validates: Requirements 6.1, 6.7**

- [x] 17. Android — SyncScreen display sync interval
  - [x] 17.1 Display configured sync interval on SyncScreen
    - In `frontend/android-app/app/src/main/java/com/codenized/planixor/ui/sync/SyncScreen.kt`
    - Show sync interval as "{value} min" alongside other sync details
    - Use string resources for label
    - Reflect updated value immediately after config save
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 18. Android — Add i18n string resources
  - [x] 18.1 Add English and Spanish string resources for all new UI strings
    - In `res/values/strings.xml` and `res/values-es/strings.xml`
    - API base path: label, placeholder, error message
    - Sync interval: label, unit, options
    - Username change dialog: title, message (with placeholders), confirm, cancel, data categories, error
    - Sync screen interval display label
    - _Requirements: 7.6, 8.3_

- [x] 19. Android — API base path normalization and validation utility
  - [x] 19.1 Create shared normalization/validation utility for API base path
    - Create utility function (or object) in the sync data package
    - Implement `normalizeApiBasePath(input: String): String` — same rules as web (prepend `/`, strip trailing `/`, empty → `/api`)
    - Implement `validateApiBasePath(input: String): String?` — return error message if invalid chars or length > 128, null if valid
    - Allowed characters: `[a-zA-Z0-9\-\_\.\/]`
    - _Requirements: 4.6, 4.7, 4.10, 7.1_

  - [x] 19.2 Write unit tests for API base path normalization and validation
    - **Property 8: API base path normalization**
    - **Property 9: API base path validation rejects invalid characters**
    - **Validates: Requirements 4.6, 4.7, 4.10**

- [x] 20. Final checkpoint — All platforms complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The backend purge is independent and can proceed first; web and Android changes can proceed in parallel after that
- The EF Core + MySQL `.Contains()` limitation is addressed in task 1.2 using in-memory dictionary lookup
- API base path normalization logic is identical on both platforms (cross-platform consistency requirement 7.1)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "3.2", "11.1"] },
    { "id": 1, "tasks": ["1.2", "3.3", "4.1", "11.2", "19.1"] },
    { "id": 2, "tasks": ["1.3", "4.2", "5.1", "5.2", "12.1", "13.1", "19.2"] },
    { "id": 3, "tasks": ["1.4", "5.3", "5.4", "6.1", "12.2", "13.2"] },
    { "id": 4, "tasks": ["5.5", "7.1", "7.2", "9.1", "13.3", "14.1", "14.2"] },
    { "id": 5, "tasks": ["7.3", "7.4", "8.1", "14.3", "14.4", "14.5"] },
    { "id": 6, "tasks": ["14.6", "16.1", "16.2", "18.1"] },
    { "id": 7, "tasks": ["16.3", "16.4", "17.1"] },
    { "id": 8, "tasks": ["16.5"] }
  ]
}
```
