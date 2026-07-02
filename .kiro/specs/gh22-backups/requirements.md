# Requirements Document

## Introduction

Planixor users who do not wish to install or configure the synchronization backend need a way to preserve and restore their data. The Backups feature provides client-side backup creation and restoration capabilities accessible from the Settings menu on both platforms (React Web PWA and Android App). Backups export all application data to a portable JSON file and allow users to restore that data on the same or a different device.

## Glossary

- **Backup_System**: The client-side module responsible for creating and restoring backup files on each platform (React Web and Android App).
- **Backup_File**: A JSON-structured file containing all application data, named using the pattern `planixor-yyyyMMdd-HHmmss.bak`.
- **Settings_Page**: The existing application settings screen where the Backup section will be added.
- **Application_Data**: The complete set of user data stored locally, including calendar events, notification records, annual hours configuration, shifts, reminders, and sync configuration/preferences.
- **File_Picker**: The platform-native mechanism for selecting file storage locations (File System Access API on web, Storage Access Framework on Android).
- **Merge_Restore**: A restore mode where backup data is combined with existing local data, using record IDs to avoid duplicates.

## Requirements

### Requirement 1: Backup Section in Settings

**User Story:** As a user, I want to see a Backup section in the Settings page, so that I can access backup creation and restoration functionality.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a "Backup" section containing a "Create" button and a "Restore" button, where both buttons are visible without scrolling past the section header.
2. WHEN the user taps the "Create" button, THE Settings_Page SHALL navigate to or display the backup creation flow.
3. WHEN the user taps the "Restore" button, THE Settings_Page SHALL navigate to or display the backup restoration flow.
4. THE Settings_Page SHALL render the Backup section identically on both the React Web PWA and the Android App, with the same two buttons ("Create" and "Restore"), the same section label, and the same interaction behavior (tap triggers the corresponding flow).
5. THE Settings_Page SHALL display all Backup section labels and button text in the user's selected language (Spanish or English), using the application's existing i18n mechanism.
6. THE Settings_Page SHALL render the Backup section correctly in both light mode and dark mode, following the application's current theme.

### Requirement 2: Storage Permission Request for Backup Creation

**User Story:** As a user, I want the application to request storage access permissions when I initiate backup creation, so that I can choose where to save the backup file.

#### Acceptance Criteria

1. WHEN the user activates the "Create" button, THE Backup_System SHALL invoke the platform File_Picker with the default filename `planixor-yyyyMMdd-HHmmss.bak` (timestamp captured at invocation time in local device time) and a filter restricting the visible/saveable file type to `.bak` files.
2. WHEN the user selects a destination location through the File_Picker, THE Backup_System SHALL proceed to write the backup file to the selected location.
3. IF the user denies storage permission, THEN THE Backup_System SHALL abort the backup creation process, preserve all application state unchanged, and display a dismissible message indicating that storage access is required to create a backup.
4. IF the user cancels the File_Picker without selecting a destination, THEN THE Backup_System SHALL abort the backup creation process, preserve all application state unchanged, and display a dismissible message indicating that the backup operation was cancelled.
5. IF the platform File_Picker fails to open due to an unsupported browser or system error, THEN THE Backup_System SHALL display a dismissible message indicating that the backup feature is not supported in the current environment.

### Requirement 3: Backup File Generation

**User Story:** As a user, I want the backup file to contain all my application data in a structured format, so that I can fully restore my data later.

#### Acceptance Criteria

1. WHEN creating a backup, THE Backup_System SHALL export all Application_Data into a single UTF-8 encoded JSON file containing one top-level object with two keys: `metadata` (object) and `data` (object with one array per entity table).
2. THE Backup_File `data` object SHALL include one array for each entity table: calendar events, notification records, annual hours configuration, shifts, reminders, and sync configuration. IF an entity table contains zero records, THEN THE Backup_System SHALL include that entity key with an empty array.
3. THE Backup_File `metadata` object SHALL contain: the backup creation timestamp in ISO 8601 UTC format, the application version in SemVer format (MAJOR.MINOR.PATCH), the platform identifier as one of the literal strings `web` or `android`, and a `schemaVersion` integer (starting at `1`).
4. THE Backup_File SHALL include soft-deleted records (isDeleted = true) to preserve the complete data state for restoration.
5. THE Backup_File SHALL be named following the pattern `planixor-yyyyMMdd-HHmmss.bak`, where the timestamp reflects the moment of backup creation in the device's local timezone.
6. IF backup generation fails at any stage (serialization errors, memory issues, file writing failures, or any other failure), THEN THE Backup_System SHALL discard any partial file, abort the operation with no partial recovery path, and display an error message indicating the backup could not be completed.
7. WHEN backup generation completes successfully, THE Backup_System SHALL produce a file whose total size does not exceed 50 MB. IF the exported data exceeds 50 MB, THEN THE Backup_System SHALL abort the operation and display an error message indicating the backup exceeds the maximum allowed size.

### Requirement 4: Backup File Storage

**User Story:** As a user, I want to save the backup file to a location of my choosing, so that I can manage my backup files according to my preferences.

#### Acceptance Criteria

1. WHEN the backup file is generated, THE Backup_System SHALL save the file to the location selected by the user via the platform File_Picker (React Web: File System Access API with download fallback; Android: Storage Access Framework).
2. WHEN the backup file is saved successfully, THE Backup_System SHALL display a toast/snackbar notification confirming that the backup was created successfully, visible for 3 to 5 seconds.
3. IF the backup file fails to save due to a storage error (insufficient space, permission denied, or write failure), THEN THE Backup_System SHALL display a toast/snackbar notification with a message indicating the category of failure (e.g., storage full, permission denied, write error) without exposing internal details.
4. IF the user cancels the File_Picker without selecting a location, THEN THE Backup_System SHALL abort the save operation, discard the generated backup data, and return the user to the previous screen without displaying an error notification. Cancellation takes priority over any concurrent storage errors — no error notification SHALL be shown when the user cancels, regardless of other errors that may have occurred.
5. WHILE the backup file is being written to the selected location, THE Backup_System SHALL prevent the user from initiating another backup operation until the current write completes or fails.

### Requirement 5: Storage Permission Request for Backup Restoration

**User Story:** As a user, I want the application to request storage access permissions when I initiate backup restoration, so that I can select the backup file to restore.

#### Acceptance Criteria

1. WHEN the user activates the "Restore" button, THE Backup_System SHALL request access to local or cloud storage through the platform File_Picker, filtering selectable files to the `.bak` extension only.
2. WHEN the user grants storage permission, THE Backup_System SHALL present the platform File_Picker allowing the user to select exactly one Backup_File.
3. WHEN the user denies storage permission, THE Backup_System SHALL abort the restore process and display a localized message indicating that storage access is required to select a backup file.
4. WHEN the user cancels the file selection without choosing a file, THE Backup_System SHALL abort the restore process, display a localized message indicating that the operation was cancelled, and return the user to the previous screen with no data modified.
5. IF the platform does not support file-type filtering (`.bak` extension), THEN THE Backup_System SHALL present all files without filtering and allow the user to select any file.

### Requirement 6: Backup File Validation

**User Story:** As a user, I want the application to validate the backup file before restoration, so that I am protected from restoring corrupted or invalid data.

#### Acceptance Criteria

1. WHEN a file is selected for restoration, THE Backup_System SHALL validate that the file contains valid JSON (parseable without syntax errors) and does not exceed 50 MB in size.
2. WHEN a file is selected for restoration, THE Backup_System SHALL validate that the JSON structure conforms to the expected Backup_File schema: presence of a `metadata` object (containing `createdAt`, `appVersion`, `platform`, `schemaVersion`) and all six entity sections (`calendarEvents`, `notificationRecords`, `annualHoursConfig`, `shifts`, `reminders`, `syncConfig`), each being an array.
3. WHEN a file is selected for restoration, THE Backup_System SHALL validate that the `schemaVersion` in metadata is less than or equal to the schema version supported by the current application version.
4. IF the file exceeds 50 MB, or is not valid JSON, or does not conform to the expected schema structure, or has a schema version newer than the application supports, THEN THE Backup_System SHALL track which specific validation rule failed and display an error message indicating the precise reason for rejection (file too large, invalid JSON, missing required sections, or incompatible version) and abort the restore process without modifying any local data.
5. WHEN the file passes all validation checks (valid JSON, correct schema structure, compatible schema version, within size limit), THE Backup_System SHALL proceed with the restoration process.

### Requirement 7: Existing Data Detection and User Confirmation

**User Story:** As a user, I want to be informed when existing data will be affected by a restore operation, so that I can decide whether to continue or cancel.

#### Acceptance Criteria

1. WHEN the backup file passes validation, THE Backup_System SHALL check whether Application_Data already exists in the local store by querying all five entity tables (calendar events, notification records, annual hours config, shifts, reminders) for at least one record with `isDeleted = false`.
2. WHEN no existing data is found (zero non-deleted records across all five entity tables), THE Backup_System SHALL proceed with the restoration immediately without displaying any confirmation dialog.
3. WHEN existing data is found (at least one non-deleted record in any entity table), THE Backup_System SHALL display a confirmation dialog with the title "Restore Backup" / "Restaurar Respaldo" (localized) that states existing data was detected and that continuing will merge backup data with current data, presenting exactly two action buttons: "Cancel" / "Cancelar" (to abort) and "Continue" / "Continuar" (to merge backup data with existing data).
4. WHILE the confirmation dialog is actively displayed, WHEN the user selects "Continue", THE Backup_System SHALL dismiss the dialog and proceed with Merge_Restore.
5. WHILE the confirmation dialog is actively displayed, WHEN the user selects "Cancel", THE Backup_System SHALL dismiss the dialog, abort the restore process without modifying any existing data in local storage, and return the user to the previous screen state.
6. THE confirmation dialog SHALL be displayed in the user's currently selected application language (Spanish or English) using the application's i18n mechanism.
7. IF the existing-data check query fails (e.g., database read error), THEN THE Backup_System SHALL abort the restore process without modifying any data and display an error message indicating that data verification could not be completed.
8. WHILE the existing-data check is executing, THE Backup_System SHALL display a loading indicator and prevent the user from initiating another restore operation until the check completes or fails within 10 seconds.

### Requirement 8: Data Restoration

**User Story:** As a user, I want the backup data to be restored into the application, so that I can recover my previously saved information.

#### Acceptance Criteria

1. WHEN restoring with no existing data, THE Backup_System SHALL insert all records from the Backup_File into the local store, processing entities in dependency order: (1) shifts, (2) reminders, (3) calendar events, (4) notification records, (5) annual hours configuration, (6) sync configuration.
2. WHEN performing a Merge_Restore, THE Backup_System SHALL insert records from the Backup_File that do not already exist in the local store (matched by UUID), and SHALL preserve all local records that are not present in the Backup_File (no deletions of local-only data).
3. WHEN performing a Merge_Restore and a record with the same UUID exists locally, THE Backup_System SHALL update the local record with the backup record's data only if the backup record's modifiedAt timestamp is strictly more recent than the local record's modifiedAt timestamp; otherwise the local record SHALL remain unchanged.
4. WHEN performing a Merge_Restore, THE Backup_System SHALL also merge soft-deleted records (isDeleted = true), applying the same last-writer-wins rule based on modifiedAt.
5. WHEN performing a Merge_Restore for sync configuration (which has no UUID or modifiedAt), THE Backup_System SHALL overwrite the local sync configuration with the backup's sync configuration only if no local sync configuration exists; otherwise the local sync configuration SHALL remain unchanged.
6. THE Backup_System SHALL process each entity table independently and atomically: IF one entity table fails during restoration, THEN the failed entity table SHALL be rolled back (no partial writes for that table), and the remaining entity tables SHALL still be attempted.
7. WHEN restoration completes successfully for all entity tables, THE Backup_System SHALL display a success notification indicating the number of records restored.
8. IF restoration fails for one or more entity tables, THEN THE Backup_System SHALL display an error notification listing which entity table(s) failed, while preserving all entities that were restored successfully.
9. WHEN restoration completes (full or partial, meaning at least one entity table succeeded — including scenarios where only a single entity table succeeds), THE Backup_System SHALL reset the syncedAt field to null for all restored or updated records, ensuring they will be pushed to the server on the next sync cycle.
10. IF a restored calendar event references a shift UUID or reminder UUID that does not exist in the local store after restoration, THEN THE Backup_System SHALL still insert the calendar event (preserving the foreign key reference as-is) without failing the calendar events entity table.
11. WHEN restoration results in a mixed outcome (some entity tables succeed and others fail), THE Backup_System SHALL display both a success notification (indicating which entities were restored and record count) and an error notification (listing which entity tables failed) simultaneously.

### Requirement 9: Backup File Schema — Serialization and Deserialization

**User Story:** As a developer, I want a well-defined backup file schema, so that backups are portable across platforms and versions.

#### Acceptance Criteria

1. THE Backup_System SHALL serialize all date fields as ISO 8601 UTC strings with the `Z` suffix (e.g., `2025-06-20T13:07:59.878Z`), all UUID fields as lowercase hyphenated strings (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`), all integer fields (including time-in-minutes) as JSON numbers, all enum fields as their string name, and all nullable fields as JSON `null` when no value is present.
2. THE Backup_System SHALL include a `schemaVersion` integer field (starting at `1`) in the `metadata` object of every Backup_File to identify the serialization format version.
3. THE Backup_System SHALL deserialize a valid Backup_File produced by either platform (web or android) into the correct local data models such that every field value is logically equal to the original (same UUID, same date to millisecond precision, same numeric value, same enum name, same null/non-null state).
4. IF the Backup_System encounters a Backup_File with a `schemaVersion` higher than the application supports, THEN THE Backup_System SHALL reject the file and indicate that the application must be updated to restore this backup.
5. IF the Backup_System encounters a Backup_File that is not valid JSON or whose structure does not conform to the expected schema (missing required fields, wrong field types), THEN THE Backup_System SHALL reject the file and indicate that the backup is invalid or corrupt.
6. WHEN the Backup_System deserializes a Backup_File containing fields not recognized by the current schema version, THE Backup_System SHALL ignore the unknown fields without error and restore all recognized fields.
7. FOR ALL valid Application_Data states, serializing to a Backup_File and then deserializing SHALL produce data where every entity has identical field values to the original — verified by comparing each field (UUIDs, dates to millisecond precision, numbers, strings, booleans, and null states) — with no data loss or mutation.

### Requirement 10: Cross-Platform Compatibility

**User Story:** As a user, I want to restore a backup created on one platform to the other platform, so that I can migrate my data between devices.

#### Acceptance Criteria

1. THE Backup_System on React Web SHALL produce Backup_Files that, when restored on the Android App, result in all five entity types (calendar events, notification records, annual hours config, shifts, reminders) being persisted and readable in local storage with identical field values (id, modifiedAt, syncedAt, isDeleted, and all entity-specific fields) as the source device.
2. THE Backup_System on Android App SHALL produce Backup_Files that, when restored on the React Web PWA, result in all five entity types (calendar events, notification records, annual hours config, shifts, reminders) being persisted and readable in local storage with identical field values (id, modifiedAt, syncedAt, isDeleted, and all entity-specific fields) as the source device.
3. THE Backup_System SHALL use a platform-agnostic data format in the Backup_File that does not depend on platform-specific storage internals (IndexedDB structure or Room schema), using camelCase JSON keys for all field names and ISO 8601 UTC format with Z suffix for all DateTime fields.
4. IF the Backup_File contains JSON keys not recognized by the restoring platform, THEN THE Backup_System SHALL ignore unrecognized keys without error and restore all recognized entity data successfully. THE Backup_System SHALL also restore successfully when no unrecognized keys are present (normal operation).
5. WHEN a Backup_File created on one platform is restored on the other platform, THE Backup_System SHALL apply the same merge/insert rules defined in Requirement 8 regardless of the source platform.
