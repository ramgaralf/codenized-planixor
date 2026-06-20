# Requirements Document

## Introduction

Notifications enables Planixor users to receive timely alerts for upcoming calendar events across both the React Web (PWA) and Android platforms. Users can configure notification alerts when creating or modifying calendar events, choosing from predefined time offsets (at start, 10 minutes before, 1 hour before, 1 day before). Notifications are delivered through configurable channels (in-app, system-native, or both), and a dedicated notification view accessible from the top bar bell icon allows users to review and dismiss notifications. The feature runs via a background process that checks for due notifications every 1 minute (foreground), operating fully offline using local data stores.

## Glossary

- **Notification_Service**: The background process running on both platforms (Web Worker timer on PWA, AlarmManager + coroutine timer on Android) that checks every 1 minute (foreground) for scheduled notifications and triggers delivery through the configured channel. On Android, AlarmManager provides exact background delivery at each notification's scheduled time.
- **Notification_Record**: A locally persisted record representing a scheduled or delivered notification, containing reference to the calendar event, alert time offset, delivery status, and read state.
- **Notification_Store**: The local persistence layer (IndexedDB on Web, SQLite on Android) that stores all notification records on the device.
- **Notification_View**: The dedicated UI view accessible via the notification bell icon in the top bar, listing all unread notifications for the user.
- **Notification_Channel**: The delivery mechanism for notifications, one of: App (in-app only), System (native OS notification only), or Both (in-app and native OS).
- **Notification_Settings**: The user configuration that determines the active Notification_Channel for notification delivery, stored in the local settings store.
- **Alert_Config**: The set of selected time offsets for a calendar event that determine when notifications are triggered. Supports multi-selection from: at start time, 10 minutes before, 1 hour before, 1 day before.
- **System_Notification**: A native operating system notification triggered via the Web Notifications API (PWA) or Android NotificationManager (Android).
- **App_Notification**: A notification displayed exclusively within the Planixor application's Notification_View, without triggering any native OS notification.
- **Calendar_Event**: A scheduled occurrence spanning one or more days and a time range, linked to either a Shift or Reminder type (as defined in gh8-calendar-event-management).
- **Event_Form**: The UI component used for both creating and editing a calendar event (as defined in gh8-calendar-event-management).
- **Top_Bar**: The fixed global navigation bar at the top of both platforms containing the notification bell icon, user avatar, and contextual action buttons.

## Requirements

### Requirement 1: Configure Notification Alerts on Calendar Events

**User Story:** As a user, I want to configure notification alerts when creating or modifying a calendar event, so that I receive timely reminders before my scheduled events.

#### Acceptance Criteria

1. WHEN the user creates or edits a calendar event where the event start date and time are strictly in the future relative to the current device date and time, THE Event_Form SHALL display a multi-select alert configuration field with the following options: "At start time", "10 minutes before", "1 hour before", and "1 day before".
2. THE Event_Form SHALL allow the user to select zero or more alert options simultaneously from the Alert_Config field.
3. WHEN the user creates or edits a calendar event where the event start date and time are equal to or in the past relative to the current device date and time, THE Event_Form SHALL hide the Alert_Config field entirely and THE Notification_Store SHALL NOT create any Notification_Records for that event.
4. WHEN the user saves a calendar event with one or more alert options selected, THE Notification_Store SHALL create one Notification_Record per selected alert option whose computed trigger time (event start time minus the offset) is strictly in the future relative to the current device time at save. Each created Notification_Record SHALL contain the calendar event ID, the alert time offset, the computed trigger time, `isRead` set to false, `isDelivered` set to false, `modifiedAt` set to the current UTC timestamp, `syncedAt` set to null, and `isDeleted` set to false. Alert options whose computed trigger time is equal to or in the past relative to the current device time at save SHALL NOT produce a Notification_Record.
5. WHEN the user modifies an existing calendar event's Alert_Config, THE Notification_Store SHALL soft-delete all existing non-delivered Notification_Records for that event (set `isDeleted` to true and `modifiedAt` to the current UTC timestamp) and create new Notification_Records based on the updated alert selection following the rules in criterion 4.
6. WHEN the user removes all alert options from an existing calendar event, THE Notification_Store SHALL soft-delete all existing non-delivered Notification_Records for that event (set `isDeleted` to true and `modifiedAt` to the current UTC timestamp).
7. THE Event_Form SHALL persist the selected Alert_Config values as part of the calendar event record in the `alertOffsets` field, stored as an array of integers representing minutes before the event start (0 for "At start time", 10, 60, 1440). IF no alerts are selected or the event start is in the past, THEN the `alertOffsets` field SHALL be stored as an empty array.
8. WHEN the user modifies an existing calendar event's start date or start time without changing the Alert_Config, THE Notification_Store SHALL soft-delete all existing non-delivered Notification_Records for that event (set `isDeleted` to true and `modifiedAt` to the current UTC timestamp) and create new Notification_Records with recomputed trigger times based on the new start time and the existing alert selection, following the rules in criterion 4.

### Requirement 2: Notification Delivery via Background Process

**User Story:** As a user, I want the application to automatically check for and deliver due notifications, so that I receive alerts at the configured times without manual intervention.

#### Acceptance Criteria

1. THE Notification_Service SHALL execute a check cycle unconditionally every 1 minute while the application is running in the foreground, regardless of whether due notifications exist, scanning the Notification_Store for all Notification_Records where `triggerTime` is less than or equal to the current device time, `isDelivered` is false, and `isDeleted` is false at the moment of execution, regardless of how long ago the `triggerTime` passed, processing results ordered by `triggerTime` ascending (oldest first). Additionally, an immediate check cycle SHALL be triggered after every event create/update/delete operation.
2. WHEN the Notification_Service identifies one or more due Notification_Records, THE Notification_Service SHALL deliver each notification through the channel defined in Notification_Settings and set `isDelivered` to true and `modifiedAt` to the current UTC timestamp on each successfully delivered record.
3. WHILE the Notification_Settings channel is set to "App", THE Notification_Service SHALL deliver notifications exclusively as App_Notifications visible in the Notification_View.
4. WHILE the Notification_Settings channel is set to "System", THE Notification_Service SHALL deliver notifications exclusively as System_Notifications via the native OS notification mechanism.
5. WHILE the Notification_Settings channel is set to "Both", THE Notification_Service SHALL deliver notifications as both an App_Notification in the Notification_View and a System_Notification via the native OS notification mechanism.
6. THE Notification_Service SHALL operate fully offline using only local data from the Notification_Store without requiring network connectivity.
7. WHEN the application is opened or gains focus, THE Notification_Service SHALL execute a check cycle within 5 seconds of the lifecycle event, in addition to the regular 5-minute interval.
8. IF the Notification_Service fails to deliver a System_Notification due to missing OS notification permissions, THEN THE Notification_Service SHALL retain the Notification_Record with `isDelivered` set to false and reattempt delivery on the next check cycle.
9. THE Notification_Service SHALL deliver all due Notification_Records regardless of their age, applying the same channel and marking rules to notifications whose `triggerTime` is more than 72 hours before the current device time as to recent notifications, with no expiration or discard threshold.
10. IF delivery of the App_Notification channel succeeds but the System_Notification channel fails (when channel is "Both"), THEN THE Notification_Service SHALL always mark `isDelivered` as true (ensuring the App_Notification is always visible in the Notification_View) and treat the System_Notification as best-effort — failure does not block app notification delivery and does not trigger retry.

### Requirement 3: Notification View

**User Story:** As a user, I want to view all my unread notifications in a dedicated view, so that I can review upcoming and recent event alerts in one place.

#### Acceptance Criteria

1. WHEN the user taps or clicks the notification bell icon in the Top_Bar, THE Notification_View SHALL open and display all Notification_Records where `isRead` is false, `isDelivered` is true, and `isDeleted` is false, ordered by `triggerTime` descending (most recent first), limited to the most recent 100 records with scrollable access.
2. WHILE the Notification_View is displayed, THE Notification_View SHALL render each notification item with: the calendar event name (truncated to 60 characters with ellipsis if exceeded), the calendar event icon, the alert type label (localized, e.g., "At start time" / "Al inicio", "10 minutes before" / "10 minutos antes"), and the trigger time formatted as a relative duration if within the last 24 hours (e.g., "5 min ago" / "hace 5 min") or as an absolute date-time in the device locale format if older than 24 hours.
3. WHEN the user taps or clicks a single notification item, THE Notification_Store SHALL set `isRead` to true and `modifiedAt` to the current UTC timestamp on that Notification_Record, and THE Notification_View SHALL remove that notification from the displayed list.
4. WHEN the user activates the "Mark all as read" action, THE Notification_Store SHALL set `isRead` to true and `modifiedAt` to the current UTC timestamp on all currently displayed Notification_Records, and THE Notification_View SHALL remove all notifications from the list.
5. WHILE the Notification_View contains zero unread notifications, THE Notification_View SHALL display a localized empty state message indicating no pending notifications.
6. THE Top_Bar SHALL display a numeric badge on the notification bell icon indicating the count of unread delivered notifications (where `isRead` is false, `isDelivered` is true, and `isDeleted` is false), displaying the exact count up to 99 and displaying "99+" when the count exceeds 99; WHEN the count reaches zero, THE Top_Bar SHALL hide the badge immediately with no visible intermediate state between the mark-as-read action and the badge disappearing. The badge count SHALL be refreshed immediately after `markAsRead` and `markAllAsRead` operations (via `refreshBadgeCount()`) without waiting for the next check cycle.
7. IF a Notification_Record references a calendar event that has been deleted (`isDeleted` is true), THEN THE Notification_View SHALL still display the notification using the stored event name and icon, with no navigation action available on that item.

### Requirement 4: Notification Delivery Channel Settings

**User Story:** As a user, I want to configure how notifications are delivered, so that I can choose between in-app notifications, system notifications, or both based on my preference.

#### Acceptance Criteria

1. THE Settings page SHALL display a "Notifications" configuration section with three mutually exclusive channel options presented as a single-select control: "App" (in-app only), "System" (native OS only), and "Both" (in-app and native OS).
2. THE Notification_Settings SHALL default to "App" when no user selection has been previously persisted in the local settings store. This ensures users must explicitly opt-in to system notifications (which naturally triggers the permission request dialog).
3. WHEN the user selects a Notification_Channel option, THE Notification_Settings SHALL persist the selection to the local settings store within 500 milliseconds without requiring a confirmation action or page reload.
4. WHEN the user selects a Notification_Channel option, THE Top_Bar SHALL update the notification bell icon visibility immediately upon selection (before persistence completes): hidden when "System" is selected, visible when "App" or "Both" is selected.
5. WHILE the Notification_Settings channel is set to "App" or "Both", THE Top_Bar SHALL display the notification bell icon on the current device.
6. THE Notification_Settings SHALL be stored exclusively in the device-local settings store (IndexedDB/LocalStorage on React Web, SQLite on Android) and SHALL NOT be included in Sync_Service push or pull cycles.
7. WHEN the user opens the Settings page, THE Notification_Settings section SHALL display the currently persisted channel selection as the active option, reflecting the value from the local settings store.
8. IF the user selects "System" channel and the operating system has denied notification permissions, THEN THE Notification_Settings SHALL display an inline warning message indicating that system notifications are blocked and directing the user to OS settings.
9. WHEN the Notification_Settings channel selection changes, THE system SHALL apply the new delivery behavior immediately to all subsequent notifications without requiring an app restart.

### Requirement 5: System Notification Permissions and Behavior

**User Story:** As a user, I want the application to properly request and handle system notification permissions, so that native notifications work reliably on my device.

#### Acceptance Criteria

1. WHEN the user selects "System" or "Both" as the Notification_Channel and the application does not have system notification permission, THE application SHALL request notification permission from the operating system using the platform-specific API (Notification.requestPermission() on PWA, POST_NOTIFICATIONS runtime permission on Android 13+).
2. IF the user denies the system notification permission, THEN THE application SHALL display a localized message explaining that system notifications require permission and provide guidance on how to enable notifications in system settings, and THE Notification_Settings SHALL revert to "App" channel; the guidance display and channel revert SHALL be treated as an atomic operation — if either fails, neither is applied.
3. IF the user dismisses the permission dialog without granting or denying (browser "default" state on PWA), THEN THE application SHALL treat it as a denial and apply the same behavior as criterion 2.
4. WHILE the application has system notification permission granted, THE Notification_Service SHALL deliver System_Notifications using the native notification mechanism (Web Notifications API for PWA, NotificationManager for Android).
5. THE System_Notification SHALL display: the Planixor app icon (192×192 PNG), the calendar event emoji + event name as the notification title (truncated to 65 characters), and a multiline body containing the event date + time (line 1) and a localized time-remaining label (line 2). Example: Title "☀️ Turno Mañana", Body "20 jun 2025 · 10:00\nEn 10 minutos". Android uses `BigTextStyle` for multiline display; Web uses `\n` in the body text.
6. IF system notification permission was previously granted but has been revoked at the OS level, THEN THE Notification_Service SHALL detect the revocation on the next check cycle, skip System_Notification delivery, and display an inline warning in the Notification_Settings section.

### Requirement 6: PWA Installability and Background Process

**User Story:** As a user, I want the React Web app to be installable and run background notification checks, so that I receive timely notifications even when the browser tab is not actively focused.

#### Acceptance Criteria

1. THE React Web application SHALL be configured as an installable Progressive Web App with a valid web app manifest including: the application name ("Planixor"), at least two icon sizes (192×192 and 512×512 in PNG format), a start URL, display mode set to "standalone", theme color, and background color.
2. WHEN the React Web application is loaded for the first time after installation or page load, THE Notification_Service SHALL register a Web Worker that sends timer messages at an interval of 1 minute (±5 seconds tolerance). The Web Worker acts as a pure timer — it sends `RUN_CYCLE` messages to the main thread, which executes `runCheckCycle()` where the Notification API is available. The worker is registered via `registerNotificationWorker()` called in `App.tsx` `useEffect` on mount.
3. WHILE the React Web application is running in the background (installed standalone PWA without focus, or browser tab without focus), THE Notification_Service SHALL maintain the Web Worker registration and accept browser-imposed throttling on check cycle intervals; the guarantee is that the Web Worker remains registered and resumes normal interval execution when the application regains focus.
4. IF the browser does not support Web Worker execution while the application is in the background, THEN THE Notification_Service SHALL execute the pending check cycle within 5 seconds of the application regaining visibility (document `visibilitychange` event to "visible").
5. IF the Web Worker terminates unexpectedly or fails to execute a scheduled check cycle, THEN THE Notification_Service SHALL detect the failure and immediately re-register the Web Worker without waiting for a visibility change or user interaction, and execute an immediate check cycle upon successful re-registration.
6. WHEN a notification check cycle executes, THE Notification_Service SHALL compare the current UTC time against all active notification schedules in the local store and flag as "due" any notification whose scheduled time is equal to or earlier than the current time and has not yet been delivered.

### Requirement 7: Android Background Process

**User Story:** As a user, I want the Android app to run background notification checks, so that I receive timely notifications even when the app is not in the foreground.

#### Acceptance Criteria

1. WHEN the Android application is installed, THE Notification_Service SHALL use AlarmManager with `setExactAndAllowWhileIdle()` to schedule exact alarms for each NotificationRecord's trigger time. Alarms are scheduled when NotificationRecords are created, cancelled when records are soft-deleted, and rescheduled on device boot via a BootReceiver. This replaces the originally planned WorkManager approach because Samsung/OneUI aggressively delays WorkManager periodic tasks beyond acceptable tolerances. Required permissions: `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`.
2. WHILE the Android application is in the foreground, THE Notification_Service SHALL use an in-process timer (coroutine-based) with a 1-minute interval to scan for due notifications, providing more responsive delivery than AlarmManager alone. The timer includes try-catch around `runCheckCycle()` calls to prevent app crashes if DataStore or DB has issues during startup.
3. WHILE the Android application is in the background, THE Notification_Service SHALL continue delivering due notifications via the channel defined in Notification_Settings through AlarmManager exact alarms that fire at each notification's scheduled `triggerTime`.
4. THE Android application SHALL create a dedicated notification channel (Android OS notification channel) named "Planixor Alerts" with channel ID "planixor_alerts" for all System_Notifications, with default importance level set to HIGH.
5. IF the user has disabled notifications for the Planixor app at the Android system level, THEN THE Notification_Service SHALL skip System_Notification delivery and deliver only App_Notifications if the channel permits.
6. WHEN the Android application transitions from background to foreground (defined as the process moving from a state where no Activity is visible to the user back to having a visible Activity, excluding Activity resume events caused by configuration changes such as screen rotation or returning from another Activity within the same task), THE Notification_Service SHALL execute an immediate check cycle within 5 seconds of the qualifying transition.

### Requirement 8: Notification Data Model

**User Story:** As a developer, I want a well-defined data model for notifications, so that all platforms persist and manage notification records consistently.

#### Acceptance Criteria

1. THE Notification_Store SHALL persist each Notification_Record with the following fields: `id` (UUID, client-generated, required), `calendarEventId` (UUID, referencing the calendar event, required), `alertOffset` (integer, minutes before event start — 0, 10, 60, or 1440, required), `triggerTime` (DateTime UTC, computed as event start time minus alertOffset, required), `isDelivered` (boolean, required, defaults to false), `isRead` (boolean, required, defaults to false), `modifiedAt` (DateTime UTC, required), `syncedAt` (DateTime UTC or null), and `isDeleted` (boolean, required, defaults to false). THE Notification_Store SHALL enforce a uniqueness constraint on the combination of `calendarEventId` and `alertOffset` among non-deleted records, preventing duplicate notifications for the same event and offset.
2. THE Notification_Store SHALL generate the `id` field client-side as a UUID at the moment of record creation.
3. THE Notification_Store SHALL update the `modifiedAt` field to the current UTC timestamp on every local write operation (create, update, or soft-delete).
4. THE Notification_Store SHALL derive the display fields (event name, event icon) from the referenced calendar event and its associated shift or reminder definition at read time. IF the referenced calendar event is soft-deleted or does not exist, THEN THE Notification_View SHALL still display the notification using cached event name data, with no navigation action available.
5. WHEN a calendar event is soft-deleted (`isDeleted` set to true), THE Notification_Store SHALL soft-delete all associated Notification_Records for that event by setting their `isDeleted` to true and `modifiedAt` to the current UTC timestamp.
6. THE calendar event record SHALL include a new `alertOffsets` field (array of integers, optional, defaults to empty array, maximum 4 elements) that stores the user's selected alert configuration values (0, 10, 60, 1440).
7. WHEN the `alertOffsets` array on a calendar event is modified, THE Notification_Store SHALL create a new Notification_Record for each added offset value and soft-delete the Notification_Record for each removed offset value, updating `modifiedAt` to the current UTC timestamp on all affected records.
8. WHEN the start time of a calendar event is modified, THE Notification_Store SHALL recompute the `triggerTime` field for all non-deleted Notification_Records associated with that event (triggerTime = new event start time minus alertOffset) and update their `modifiedAt` to the current UTC timestamp.

### Requirement 9: Calendar Event Alert Configuration Update on Edit

**User Story:** As a user, I want my notification alerts to stay synchronized with my calendar event changes, so that I always receive alerts at the correct times.

#### Acceptance Criteria

1. WHEN the user modifies the start day or start time of a calendar event that has Alert_Config values set, THE Notification_Store SHALL recalculate `triggerTime` for all non-delivered Notification_Records associated with that event using the formula: triggerTime = new event start DateTime (UTC) minus alertOffset minutes.
2. WHEN a recalculated `triggerTime` falls in the past (less than or equal to the current device UTC time), THE Notification_Store SHALL soft-delete that specific Notification_Record (set `isDeleted` to true and `modifiedAt` to the current UTC timestamp).
3. WHEN the user modifies a calendar event's start day or start time such that the entire event start moves to the past (event start DateTime ≤ current device UTC time), THE Notification_Store SHALL soft-delete all non-delivered Notification_Records for that event and THE Event_Form SHALL hide the Alert_Config field.
4. WHEN a calendar event is soft-deleted, THE Notification_Store SHALL soft-delete all associated Notification_Records regardless of their delivery or read state, setting `isDeleted` to true and `modifiedAt` to the current UTC timestamp.
5. WHEN the user modifies a calendar event's start to a future time after it was previously in the past (restoring the event to the future), THE Event_Form SHALL display the Alert_Config field and THE Notification_Store SHALL create new Notification_Records for any previously configured alertOffsets whose trigger times are now in the future.

### Requirement 10: Notification Data Synchronization

**User Story:** As a subscribed user, I want my notification records and alert configurations to synchronize across devices, so that I have consistent notification state regardless of which device I use.

#### Acceptance Criteria

1. WHILE the user has an active subscription and connectivity is available, THE Sync_Service SHALL push Notification_Records where `syncedAt` is null or `modifiedAt` is greater than `syncedAt` in batches of no more than 100 records per request, and upon successful API acknowledgment SHALL set `syncedAt` to the current UTC timestamp on each pushed record.
2. WHILE the user has an active subscription and connectivity is available, THE Sync_Service SHALL pull Notification_Records from the API modified after the client's persisted `lastSyncedAt` timestamp, paginated at a maximum of 100 records per response using a cursor; WHEN a response contains exactly 100 records, THE Sync_Service SHALL issue subsequent pull requests using the returned cursor until a response contains fewer than 100 records, and upon completion of all pull pages SHALL update the client's `lastSyncedAt` to the current UTC timestamp.
3. WHEN a pulled Notification_Record does not exist in the local Notification_Store (matched by `id`), THE Sync_Service SHALL insert the remote record into the local store with `syncedAt` set to the current UTC timestamp.
4. WHEN a conflict occurs during pull synchronization where the local record has `modifiedAt` greater than its `syncedAt` and the remote record has a different `modifiedAt` value for the same notification ID, THE Sync_Service SHALL retain the record with the later `modifiedAt` timestamp; IF both `modifiedAt` timestamps are identical, THEN THE Sync_Service SHALL prefer the remote record.
5. WHEN a pulled Notification_Record has `isDeleted` set to true and a local record with the same `id` exists, THE Sync_Service SHALL set the local record's `isDeleted` flag to true and set `syncedAt` to the current UTC timestamp; THE Sync_Service SHALL NOT physically remove soft-deleted records from the local store until `syncedAt` is not null.
6. THE `alertOffsets` field on the calendar event record SHALL be an ordered list of integer values representing minutes before event start (minimum value: 0, maximum value: 1440, maximum list length: 4), included in the existing calendar event sync push and pull payloads, requiring no separate sync endpoint for alert configurations.
7. IF a push request fails due to network error or non-success API response, THEN THE Sync_Service SHALL leave `syncedAt` unchanged on the affected records so they remain eligible for the next sync cycle, and SHALL NOT halt the overall sync cycle for other entity types.
8. WHILE the user lacks an active subscription or connectivity is unavailable, THE Notification_Store SHALL operate fully offline with all operations persisted locally and no synchronization attempts.

### Requirement 11: Cross-Platform Consistency

**User Story:** As a user, I want the notification experience to be consistent across the React Web and Android platforms, so that I can use either platform interchangeably.

#### Acceptance Criteria

1. THE Event_Form SHALL present the same Alert_Config multi-select field with the same four options ("At start time", "10 minutes before", "1 hour before", "1 day before") and the same validation rules on both React Web and Android platforms.
2. THE Notification_View SHALL display the same notification list layout, mark-as-read interactions (tap/click individual item), and mark-all-as-read action on both platforms.
3. THE Notification_Settings section SHALL present the same three channel options (App, System, Both) with the same default ("App") and persistence behavior on both platforms.
4. THE notification bell icon visibility logic (hidden when channel is "System") SHALL apply consistently on both platforms.
5. THE Notification_Record data model, field types, and validation rules SHALL be identical on both platforms (IndexedDB on React Web, SQLite on Android).
6. WHEN a user creates or modifies notification-related data on one platform and syncs, THEN THE other platform SHALL display the same logical state after completing its own sync cycle, with no data loss or field truncation.
