# Requirements Document

## Introduction

This feature addresses several synchronization improvements for the Planixor application across all three platforms (backend, React Web PWA, and Android). The improvements cover: automatic purging of past notification records during sync cycles, accurate connectivity monitoring on Android, configurable API base path in the sync URL, configurable sync interval, and safe username-change detection when sync configuration is modified.

## Glossary

- **Sync_Service**: The background service on each client responsible for executing bidirectional data synchronization with the backend API.
- **NotificationRecord**: A syncable entity representing a notification instance tied to a calendar event. Past notifications are those whose associated event date has already occurred.
- **Sync_Config**: The locally-stored configuration data containing the server URL, API base path, API key, linked username, and sync preferences. This data is never synchronized and remains exclusive to the device.
- **API_Base_Path**: The configurable path segment appended to the server URL to form the full API endpoint base (e.g., `/api`, `/custom-api`). Previously hardcoded as `/api`.
- **Sync_Interval**: The time in minutes between automatic background sync cycles. Configurable in multiples of 5 with a minimum of 5 minutes.
- **DynamicBaseUrlInterceptor**: The OkHttp interceptor on Android that rewrites request URLs at runtime using the configured server URL and API base path.
- **Connection_Status**: An enumeration representing the current state of the synchronization connection: unconfigured, active, failing, or paused.
- **Purge_Threshold**: The point in time (current UTC date/time) before which notification records are considered past and eligible for deletion.

## Requirements

### Requirement 1: Purge Past Notification Records During Sync — Backend

**User Story:** As a subscribed user, I want past notification records to be automatically deleted from the server during synchronization, so that the database does not accumulate stale notification data indefinitely.

#### Acceptance Criteria

1. WHEN a sync push request is received for notification records from an authenticated user, THE backend SHALL identify all NotificationRecord entities belonging to that user whose associated CalendarEvent's `EndDay` is strictly before the current UTC date (i.e., `CalendarEvent.EndDay < DateOnly from DateTime.UtcNow`). THE backend SHALL skip identification and purge of past notification records entirely for unauthenticated requests.
2. WHEN past NotificationRecord entities are identified during a push operation, THE backend SHALL permanently delete (hard delete) those records from the database before processing the incoming push batch.
3. IF a NotificationRecord's associated CalendarEvent does not exist in the database (orphaned record), THEN THE backend SHALL treat that NotificationRecord as eligible for purge and permanently delete it.
4. IF the purge operation fails (e.g., database error), THEN THE backend SHALL log the failure and continue processing the push batch normally without aborting the sync request.
5. WHEN a sync pull request is received for notification records, THE backend SHALL exclude permanently deleted NotificationRecord entities from the pull response (since they no longer exist in the database, they are inherently excluded).
6. THE backend SHALL only delete NotificationRecord entities belonging to the authenticated user (identified by the `UserId` field matching the username from the validated API key) during the purge operation.
7. THE backend SHALL execute the purge within the same push endpoint handler, after authentication and request validation, but before processing the incoming push records (upsert logic).

### Requirement 2: Purge Past Notification Records During Sync — Clients

**User Story:** As a user, I want past notification records to be automatically cleaned up from my device during synchronization, so that my local storage remains efficient.

#### Acceptance Criteria

1. WHEN the Sync_Service completes a full sync cycle (after all entity push, pull, and merge operations finish), THE client SHALL query all local NotificationRecord entries and identify those whose associated CalendarEvent has a `startDay` value strictly before the current device date (local time, compared as `YYYY-MM-DD` date strings).
2. WHEN the Sync_Service identifies 1 or more past NotificationRecord entries after a completed sync cycle, THE client SHALL permanently delete (physical removal, not soft-delete) all identified entries from local storage within the same async operation, regardless of their `syncedAt` value.
3. IF the associated CalendarEvent for a NotificationRecord does not exist in local storage (orphaned record), THEN THE client SHALL include that NotificationRecord in the purge set (treat missing event reference as past).
4. IF the purge operation fails (storage I/O error), THEN THE client SHALL log the error and continue normal operation without retrying until the next sync cycle completes.
5. THE React Web PWA SHALL perform the physical deletion from IndexedDB after each completed sync cycle, querying the `calendarEvents` table to resolve each NotificationRecord's associated `startDay`.
6. THE Android application SHALL perform the physical deletion from SQLite (Room) after each completed sync cycle, joining or querying the `calendar_events` table to resolve each NotificationRecord's associated `startDay`.
7. THE client SHALL NOT purge NotificationRecord entries whose associated CalendarEvent has a `startDay` equal to or after the current device date, even if the event's `startTime` has already passed within the current day.

### Requirement 3: Android Connectivity Monitoring Accuracy

**User Story:** As an Android user, I want the synchronization icon and status screen to accurately reflect connectivity failures, so that I am not misled into believing synchronization is running when the server is unreachable.

#### Acceptance Criteria

1. WHEN the Sync_Service attempts a sync cycle and receives a connection timeout (no response within 30 seconds), a connection refused error, a DNS resolution failure, or an HTTP 5xx server error, AND the Sync_Service sets an explicit error detection flag indicating a connectivity failure has occurred, THE Android application SHALL update the Connection_Status to failing within 2 seconds of the error occurring. Both the error type classification (timeout, refused, DNS failure, 5xx) and the error detection flag are required to trigger the failing status.
2. WHEN the Connection_Status changes to failing, THE Sync_Button in the top navigation bar SHALL update its icon to the failing state indicator before the next UI frame is rendered (within 100 milliseconds of the state change).
3. WHEN the Connection_Status changes to failing, THE Sync_Screen SHALL display the Connection_Status as failing and SHALL preserve the previously stored last synchronization date without modification.
4. IF a sync cycle fails due to a connectivity error (connection timeout, connection refused, DNS failure, or HTTP 5xx), THEN THE Android application SHALL NOT update the last synchronization date, and any records that were not confirmed as successfully pushed SHALL remain marked as unsynced locally.
5. WHEN the Sync_Service successfully completes a full sync cycle (both push and pull complete with HTTP 2xx responses) after the Connection_Status was failing, THE Android application SHALL update the Connection_Status back to active and update the last synchronization date to the current UTC time.
6. IF the Sync_Service receives an HTTP 401 or HTTP 403 response, THEN THE Android application SHALL NOT change the Connection_Status to failing, and SHALL handle the error as an authentication failure distinct from connectivity failure.
7. WHEN the Android application is restarted while Connection_Status is failing, THE Android application SHALL persist the failing state and display it upon restart until a subsequent sync cycle succeeds.

### Requirement 4: Configurable API Base Path

**User Story:** As a user, I want to specify the API base path in my synchronization configuration, so that the client can connect to backends that do not use the default `/api` path.

#### Acceptance Criteria

1. THE Sync_Configuration_Screen SHALL display a text input field for the API base path with a pre-populated default value of `/api` (the field value is `/api`, not a placeholder or hint text) and a maximum length of 128 characters.
2. WHEN the user saves sync configuration, THE application SHALL persist the API base path as part of the Sync_Config.
3. WHEN constructing sync endpoint URLs, THE Sync_Service SHALL use the configured API base path instead of a hardcoded `/api` segment.
4. THE Sync_Service SHALL construct sync URLs in the format `{server_url}{api_base_path}/{entity-kebab}/sync/push` and `{server_url}{api_base_path}/{entity-kebab}/sync/pull`.
5. THE Sync_Service SHALL construct the validation URL as `{server_url}{api_base_path}/security/validate`.
6. WHEN the API base path field is left empty during configuration, THE application SHALL use `/api` as the default value.
7. WHEN the user saves sync configuration, THE application SHALL normalize the API base path by prepending `/` if absent and removing any trailing `/` before persisting.
8. THE React Web PWA SHALL apply the configured API base path to all synchronization HTTP requests.
9. THE Android DynamicBaseUrlInterceptor SHALL apply the configured API base path when rewriting request URLs.
10. IF the API base path contains characters other than alphanumeric characters, hyphens, underscores, dots, and forward slashes, THEN THE Sync_Configuration_Screen SHALL reject the value and display an error message indicating only path-safe characters are allowed.

### Requirement 5: Configurable Sync Interval

**User Story:** As a user, I want to configure how often automatic synchronization runs, so that I can balance between data freshness and resource usage.

#### Acceptance Criteria

1. THE Sync_Configuration_Screen SHALL display a control for selecting the sync interval with the following selectable values: 5, 10, 15, 20, 25, 30, 45, and 60 minutes.
2. THE sync interval control SHALL have a minimum selectable value of 5 minutes and a maximum selectable value of 60 minutes.
3. THE sync interval control SHALL have a default value of 5 minutes when no user preference has been previously saved.
4. WHEN the user saves sync configuration, THE application SHALL persist the selected sync interval as part of the Sync_Config and the persisted value SHALL be retrievable after application restart.
5. WHEN the Sync_Service schedules the next automatic sync cycle, THE Sync_Service SHALL use the configured sync interval from the Sync_Config as the delay between the end of one cycle and the start of the next.
6. WHEN the sync interval is modified and saved, THE Sync_Service SHALL apply the new interval starting from the next scheduled cycle without requiring application restart.
7. THE React Web PWA SHALL execute periodic background sync within a tolerance of ±30 seconds of the configured sync interval.
8. IF the configured sync interval is less than 15 minutes on Android, THEN THE Android application SHALL use an alternative scheduling mechanism (not WorkManager periodic work) to honor the configured interval within a tolerance of ±60 seconds.
9. IF the configured sync interval is 15 minutes or greater on Android, THEN THE Android application SHALL use WorkManager periodic work to execute background sync within the platform's standard tolerance for the configured interval.
10. THE configured sync interval SHALL affect only automatic periodic sync and SHALL NOT alter the behavior of manual sync, app-open sync, app-close sync, or connectivity-restored sync triggers.

### Requirement 6: Username Change Detection on Configuration Modification

**User Story:** As a user, I want to be warned when changing sync configuration results in a different username, so that I understand my existing local data will be deleted before proceeding.

#### Acceptance Criteria

1. WHEN the user validates a new sync configuration and the returned username differs (case-sensitive comparison) from the previously stored username in Sync_Config, THE application SHALL display a confirmation dialog warning the user that proceeding will delete all existing local data.
2. THE confirmation dialog SHALL list the specific data categories that will be deleted: calendar events, shifts, reminders, notification records, and annual hours configuration, and SHALL identify the previous username and the new username in the dialog message.
3. WHEN the user confirms the data deletion in the dialog, THE application SHALL delete all local syncable data (calendar events, shifts, reminders, notification records, annual hours configuration) and reset the lastSyncedAt timestamp to null, then save the new Sync_Config, and only after the data is successfully deleted SHALL navigate to the Sync_Screen.
4. IF the deletion of local syncable data fails for any entity category during the confirmed username change, THEN THE application SHALL abort the configuration change, retain all existing data and current Sync_Config, display an error message indicating the data reset failed, and remain on the Sync_Configuration_Screen.
5. WHEN the user cancels the confirmation dialog, THE application SHALL discard the new configuration and return to the Sync_Configuration_Screen with the current values retained.
6. IF no previous Sync_Config exists (first-time configuration), THEN THE application SHALL NOT display the username change confirmation dialog regardless of the returned username, and SHALL NOT perform any data deletion operations.
7. IF the returned username matches the previously stored username (case-sensitive comparison), THEN THE application SHALL save the configuration and proceed without displaying the confirmation dialog.
8. THE confirmation dialog SHALL use i18n-externalized strings and provide both a confirm action and a cancel action, with the cancel action as the default/highlighted option to prevent accidental data loss.

### Requirement 7: Cross-Platform Consistency for Improvements

**User Story:** As a user, I want these synchronization improvements to behave identically on both client platforms, so that I have a consistent experience regardless of the device I use.

#### Acceptance Criteria

1. THE React Web PWA and THE Android application SHALL enforce the same validation rules for API base path configuration: must start with `/`, maximum 128 characters, only path-safe characters (alphanumeric, hyphens, underscores, dots, forward slashes).
2. THE React Web PWA and THE Android application SHALL enforce the same selectable values for sync interval configuration: 5, 10, 15, 20, 25, 30, 45, and 60 minutes with a default of 5 minutes.
3. THE React Web PWA and THE Android application SHALL apply the same username change detection logic: case-sensitive comparison of the username returned by the validation endpoint against the locally stored username, triggering a confirmation dialog when a mismatch is detected.
4. THE React Web PWA and THE Android application SHALL execute the same notification purge behavior: permanently deleting all local NotificationRecord entries whose associated CalendarEvent `startDay` is before the current device date, after each completed sync cycle.
5. THE confirmation dialog for username change detection SHALL display the previous username and the new username in the dialog body, and provide a confirm action and a cancel action with the cancel action highlighted as default, using externalized i18n strings available in both Spanish and English on both platforms.
6. THE API base path field, sync interval field, and their associated labels, placeholders, and validation error messages SHALL use externalized i18n strings available in both Spanish and English on both platforms, with no user-facing text hardcoded in source code.
7. IF the user cancels the username change confirmation dialog, THEN THE system SHALL retain all existing local data unchanged and continue using the previously stored Sync_Config. IF the user confirms the username change dialog, THEN THE system SHALL replace the existing Sync_Config with the new configuration after successfully deleting all local data.

### Requirement 8: Sync Screen — Display Sync Interval

**User Story:** As a user, I want to see the configured sync interval on the synchronization screen, so that I can verify the current automatic sync frequency.

#### Acceptance Criteria

1. THE Sync_Screen SHALL display the currently configured sync interval value (in minutes) alongside other synchronization details (connection status, last sync date, server URL, username).
2. THE Sync_Screen SHALL display the sync interval in the format "{value} min" (e.g., "5 min", "30 min").
3. THE Sync_Screen SHALL display the sync interval label and value using externalized i18n strings in both Spanish and English.
4. WHEN the sync interval is updated in the Sync_Configuration_Screen and saved, THE Sync_Screen SHALL reflect the new value immediately upon navigation back to the screen.
