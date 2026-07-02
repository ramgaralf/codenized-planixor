# Implementation Plan: Client-Side Backups (React Web + Android)

## Overview

Implement client-side backup creation and restoration for both React Web (PWA) and Android App. The feature lives in the Settings page on both platforms, exports all local data to a portable `.bak` JSON file, and supports cross-platform restore with LWW merge logic. No backend involvement.

## Tasks

- [x] 1. React Web — Shared types and models
  - [x] 1.1 Create backup models and types
    - Create `src/features/backup/models.ts` with `BackupFile`, `BackupMetadata`, `BackupData`, all entity serialization interfaces (`BackupShift`, `BackupReminder`, `BackupCalendarEvent`, `BackupNotificationRecord`, `BackupAnnualHoursConfig`, `BackupSyncConfig`), `ValidationError` union type, and `RestoreResult` interface
    - Define `CURRENT_SCHEMA_VERSION = 1` and `MAX_BACKUP_SIZE_BYTES = 50 * 1024 * 1024`
    - _Requirements: 3.1, 3.2, 3.3, 9.1, 9.2_

- [x] 2. React Web — Serialization and deserialization services
  - [x] 2.1 Implement backup serializer
    - Create `src/features/backup/services/backupSerializer.ts`
    - Read all entities from Dexie (IndexedDB): calendar events, notification records, annual hours config, shifts, reminders, sync config
    - Convert Date objects to ISO 8601 UTC strings (`toISOString()`), UUIDs to lowercase, nullable fields to `null`
    - Include soft-deleted records (`isDeleted = true`)
    - Produce the full `BackupFile` JSON string with `metadata` (createdAt, appVersion, platform='web', schemaVersion=1) and `data` object
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.1_

  - [x] 2.2 Implement backup deserializer
    - Create `src/features/backup/services/backupDeserializer.ts`
    - Parse JSON string into `BackupFile` structure
    - Convert ISO 8601 strings back to `Date` objects, preserve UUIDs, handle `null` fields
    - Ignore unknown fields at any nesting level (forward compatibility)
    - _Requirements: 9.3, 9.6, 10.4_

  - [x] 2.3 Write property test: Serialization Round-Trip (Property 1)
    - Create `src/features/backup/services/backupSerializer.property.test.ts`
    - **Property 1: Serialization Round-Trip**
    - Use fast-check arbitraries for all entity types; verify serialize → deserialize produces identical field values (UUIDs, dates to ms precision, numbers, strings, booleans, nulls)
    - **Validates: Requirements 9.7, 9.1, 9.3, 3.1, 3.2, 3.3, 3.4, 10.3**

  - [x] 2.4 Write property test: Forward Compatibility (Property 3)
    - Create `src/features/backup/services/backupDeserializer.property.test.ts`
    - **Property 3: Forward Compatibility (Unknown Fields Ignored)**
    - Generate valid backup JSON with additional random unknown fields at entity level; verify deserialization succeeds with all recognized fields correct
    - **Validates: Requirements 9.6, 10.4**

- [x] 3. React Web — Validation service
  - [x] 3.1 Implement backup validator
    - Create `src/features/backup/services/backupValidator.ts`
    - Validate: file size <= 50 MB, valid JSON, `metadata` object with required fields (`createdAt`, `appVersion`, `platform`, `schemaVersion`), all six entity arrays present, `schemaVersion` <= current supported version
    - Return typed `ValidationResult` with specific `ValidationError` on failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.2 Write property test: Validation Correctness (Property 2)
    - Create `src/features/backup/services/backupValidator.property.test.ts`
    - **Property 2: Validation Correctness**
    - Generate random file content and sizes; verify the validator accepts iff all conditions are met, and rejects with the correct error type for each failing rule
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 4. React Web — File service
  - [x] 4.1 Implement backup file service
    - Create `src/features/backup/services/backupFileService.ts`
    - `saveBackupFile(content, filename)`: use File System Access API (`showSaveFilePicker`) with `.bak` filter and default filename; fall back to Blob download if API unavailable
    - `openBackupFile()`: use `showOpenFilePicker` with `.bak` filter; fall back to hidden `<input type="file">` if API unavailable; return `{ content, size }` or `null` on cancel
    - Generate filename as `planixor-yyyyMMdd-HHmmss.bak` using local device time
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.4, 5.1, 5.2, 5.4, 5.5_

- [x] 5. React Web — Restore service
  - [x] 5.1 Implement backup restore service
    - Create `src/features/backup/services/backupRestoreService.ts`
    - `restoreBackup(backup, hasExistingData)`: process entities in dependency order (shifts → reminders → calendar events → notification records → annual hours config → sync config)
    - Implement merge logic: for each record, look up by UUID; if not found → INSERT with `syncedAt = null`; if found → compare `modifiedAt` (LWW), update if backup is newer (set `syncedAt = null`), skip if local is equal/newer
    - Sync config special case: overwrite only if no local config exists
    - Per-entity-table atomicity: if one table fails, roll back that table, continue others
    - Set `syncedAt = null` for all inserted/updated records
    - Preserve orphaned foreign key references (e.g., calendar event referencing non-existent shift)
    - `checkExistingData()`: query all five entity tables for at least one record with `isDeleted = false`
    - Return `RestoreResult` with counts and succeeded/failed entity names
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

  - [x] 5.2 Write property tests: Merge LWW, Non-Overlapping, SyncedAt (Properties 4, 5, 6)
    - Create `src/features/backup/services/backupRestoreService.property.test.ts`
    - **Property 4: Merge Last-Writer-Wins** — Generate pairs of records with same UUID but different `modifiedAt`; verify the more recent record wins and loser is unchanged
    - **Property 5: Merge Preserves Non-Overlapping Records** — Generate backup records with UUIDs not in local store; verify all are inserted. Generate local records not in backup; verify they remain unchanged
    - **Property 6: Restored Records Have Null SyncedAt** — Verify all inserted/updated records have `syncedAt = null`
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.9**

- [x] 6. Checkpoint — React Web services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. React Web — Hook and UI
  - [x] 7.1 Implement useBackup orchestration hook
    - Create `src/features/backup/hooks/useBackup.ts`
    - Orchestrate full create flow: generate filename → open save picker → serialize → check size → write file → show success toast
    - Orchestrate full restore flow: open file picker → validate → check existing data → show confirmation dialog if needed → restore → show result notification
    - Handle all error cases: picker cancelled, permission denied, not supported, serialization failure, size exceeded, save failure, validation errors, DB read error, entity table failures
    - Implement concurrency guard: disable create/restore during operation
    - Expose loading states for UI
    - _Requirements: 2.1–2.5, 3.5, 3.6, 3.7, 4.1–4.5, 5.1–5.5, 6.4, 6.5, 7.1–7.8, 8.7, 8.8, 8.11_

  - [x] 7.2 Implement RestoreConfirmDialog component
    - Create `src/features/backup/components/RestoreConfirmDialog.tsx`
    - Presentational component with title "Restore Backup" / "Restaurar Respaldo" (i18n)
    - Body text indicating existing data was detected and merge will occur
    - Two buttons: "Cancel" / "Cancelar" and "Continue" / "Continuar"
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

  - [x] 7.3 Implement backup container component
    - Create `src/features/backup/backup.tsx`
    - Render a "Backup" section for the Settings page with "Create" and "Restore" buttons
    - Connect to `useBackup` hook
    - Disable buttons during operations (concurrency guard)
    - Show loading indicator during async operations
    - Theme-aware (light/dark mode)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [x] 7.4 Integrate backup section into Settings page
    - Import and render `<Backup />` component in the existing Settings page
    - Ensure section is visible without extra scrolling past section header
    - _Requirements: 1.1, 1.4_

- [x] 8. React Web — i18n strings
  - [x] 8.1 Add backup i18n keys for English and Spanish
    - Add all backup-related strings to existing i18n files (both `en` and `es` locales)
    - Keys: `backup.sectionTitle`, `backup.create`, `backup.restore`, `backup.createCancelled`, `backup.permissionRequired`, `backup.notSupported`, `backup.createFailed`, `backup.fileTooLarge`, `backup.saveFailed`, `backup.createSuccess`, `backup.restoreCancelled`, `backup.invalidJson`, `backup.invalidSchema`, `backup.incompatibleVersion`, `backup.verificationFailed`, `backup.restoreFailed`, `backup.restoreSuccess`, `backup.restorePartial`, `backup.confirmTitle`, `backup.confirmMessage`, `backup.confirmCancel`, `backup.confirmContinue`
    - _Requirements: 1.5, 7.6_

- [x] 9. Checkpoint — React Web complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Android — Domain layer models and serializer
  - [x] 10.1 Create backup domain models
    - Create `domain/backup/BackupFile.kt` with data classes: `BackupFile`, `BackupMetadata`, `BackupData`, and all entity serialization models (`BackupShift`, `BackupReminder`, `BackupCalendarEvent`, `BackupNotificationRecord`, `BackupAnnualHoursConfig`, `BackupSyncConfig`)
    - Define `CURRENT_SCHEMA_VERSION = 1` and `MAX_BACKUP_SIZE_BYTES = 50L * 1024 * 1024`
    - _Requirements: 3.1, 3.2, 3.3, 9.1, 9.2_

  - [x] 10.2 Implement BackupSerializer
    - Create `domain/backup/BackupSerializer.kt`
    - Inject repositories for all entities (CalendarEventRepository, ShiftRepository, ReminderRepository, AnnualHoursConfigRepository, NotificationRecordDao, PreferencesRepository)
    - Read all records (including soft-deleted) from Room/DataStore
    - Convert `Long` (epoch millis) to ISO 8601 UTC strings, UUIDs to lowercase, nullable fields to `null`
    - Produce JSON string using kotlinx.serialization or Gson with `metadata` (createdAt, appVersion, platform='android', schemaVersion=1) and `data` object
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.1_

  - [x] 10.3 Implement BackupDeserializer
    - Create `domain/backup/BackupDeserializer.kt`
    - Parse JSON string into `BackupFile` structure
    - Convert ISO 8601 strings to `Long` (epoch millis), preserve UUIDs, handle nullable fields
    - Ignore unknown JSON fields (forward compatibility via `ignoreUnknownKeys = true` or Gson lenient mode)
    - _Requirements: 9.3, 9.6, 10.4_

- [x] 11. Android — Validation and restore services
  - [x] 11.1 Implement BackupValidator
    - Create `domain/backup/BackupValidator.kt`
    - Validate: file size <= 50 MB, valid JSON, `metadata` with required fields, all six entity arrays, `schemaVersion` <= supported
    - Return `Result<BackupFile>` — success with parsed backup or failure with typed `ValidationError` (sealed class)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 11.2 Implement BackupRestoreService
    - Create `domain/backup/BackupRestoreService.kt`
    - Inject repositories for all entities
    - `restore(backup, hasExistingData)`: process in dependency order (shifts → reminders → calendar events → notification records → annual hours config → sync config)
    - Implement LWW merge: lookup by UUID, insert if new (syncedAt = null), update if backup.modifiedAt > local.modifiedAt (syncedAt = null), skip otherwise
    - Sync config: overwrite only if no local config exists
    - Per-entity-table atomicity using Room transactions
    - Set `syncedAt = null` for all inserted/updated records
    - Preserve orphaned FK references
    - `checkExistingData()`: query all five entity tables for at least one non-deleted record
    - Return `RestoreResult` data class
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

- [x] 12. Android — ViewModel and UI
  - [x] 12.1 Create BackupUiState and BackupViewModel
    - Create `ui/backup/BackupUiState.kt` — immutable data class with `isCreating`, `isRestoring`, `showConfirmDialog`, `error`, `successMessage` fields
    - Create `ui/backup/BackupViewModel.kt` — orchestrate create and restore flows
    - Create flow: generate filename → open SAF save picker (via Activity result) → serialize → check size → write → show success
    - Restore flow: open SAF picker → read file → validate → check existing data → show dialog if needed → restore → show notifications
    - Handle all error cases with i18n string resource references
    - Concurrency guard: prevent double-operations
    - _Requirements: 2.1–2.5, 3.5, 3.6, 3.7, 4.1–4.5, 5.1–5.5, 6.4, 6.5, 7.1–7.8, 8.7, 8.8, 8.11_

  - [x] 12.2 Integrate backup section into Settings screen
    - Add a "Backup" section to the existing SettingsScreen composable (or a sub-composable)
    - Render "Create" and "Restore" buttons
    - Connect to `BackupViewModel` (injected via Hilt)
    - Show confirmation dialog when `showConfirmDialog = true`
    - Show loading indicators during operations
    - Disable buttons during operations (concurrency guard)
    - Theme-aware (Material 3 light/dark)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [x] 12.3 Register SAF Activity Result contracts
    - Register `ActivityResultContracts.CreateDocument` for backup save (MIME type `application/octet-stream`, default filename `planixor-yyyyMMdd-HHmmss.bak`)
    - Register `ActivityResultContracts.OpenDocument` for backup restore (MIME type filter for `.bak`)
    - Wire results to ViewModel methods
    - _Requirements: 2.1, 4.1, 5.1, 5.2_

- [x] 13. Android — i18n strings
  - [x] 13.1 Add backup string resources for English and Spanish
    - Add strings to `res/values/strings.xml` (English) and `res/values-es/strings.xml` (Spanish)
    - Keys: `backup_section_title`, `backup_create`, `backup_restore`, `backup_create_cancelled`, `backup_permission_required`, `backup_not_supported`, `backup_create_failed`, `backup_file_too_large`, `backup_save_failed`, `backup_create_success`, `backup_restore_cancelled`, `backup_invalid_json`, `backup_invalid_schema`, `backup_incompatible_version`, `backup_verification_failed`, `backup_restore_failed`, `backup_restore_success`, `backup_restore_partial`, `backup_confirm_title`, `backup_confirm_message`, `backup_confirm_cancel`, `backup_confirm_continue`
    - _Requirements: 1.5, 7.6_

- [x] 14. Android — Unit tests
  - [x] 14.1 Write unit tests for BackupSerializer
    - Test serialization of each entity type
    - Test ISO 8601 conversion from epoch millis
    - Test soft-deleted records are included
    - Test empty entity tables produce empty arrays
    - _Requirements: 3.1, 3.2, 3.4, 9.1_

  - [x] 14.2 Write unit tests for BackupDeserializer
    - Test deserialization of each entity type
    - Test ISO 8601 string → Long conversion
    - Test unknown fields are ignored
    - Test cross-platform JSON (web-produced backup)
    - _Requirements: 9.3, 9.6, 10.1, 10.2_

  - [x] 14.3 Write unit tests for BackupValidator
    - Test each validation error case (too large, invalid JSON, missing fields, incompatible version)
    - Test valid backup passes all checks
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 14.4 Write unit tests for BackupRestoreService
    - Test fresh insert (no existing data)
    - Test LWW merge (backup wins, local wins, equal timestamps)
    - Test soft-deleted record merge
    - Test sync config merge (local exists → skip, local empty → insert)
    - Test dependency order
    - Test per-entity atomicity (one table fails, others succeed)
    - Test syncedAt reset to null
    - Test orphaned FK references preserved
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.9, 8.10_

- [x] 15. Final checkpoint — All platforms complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests (fast-check) validate universal correctness properties on React Web
- Android uses standard JVM unit tests (no property-based testing library specified for Android)
- Both platforms produce and consume identical JSON format — cross-platform compatibility is validated by the shared schema
- The React Web feature module lives at `src/features/backup/`
- The Android domain layer lives at `domain/backup/` and UI at `ui/backup/`
- File I/O uses platform-native APIs: File System Access API (web) and Storage Access Framework (Android)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "10.1", "8.1", "13.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "4.1", "10.2", "10.3", "11.1"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.2", "5.1", "11.2"] },
    { "id": 3, "tasks": ["5.2", "7.1", "7.2", "12.1"] },
    { "id": 4, "tasks": ["7.3", "7.4", "12.2", "12.3"] },
    { "id": 5, "tasks": ["14.1", "14.2", "14.3", "14.4"] }
  ]
}
```
