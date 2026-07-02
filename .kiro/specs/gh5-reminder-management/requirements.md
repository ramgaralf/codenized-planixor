# Requirements Document

## Introduction

Reminder Management enables users to create, view, edit, deactivate, and delete reminders across all Planixor platforms (React Web PWA and Android App). Reminders serve as reusable templates that can later be assigned to calendar events of the "reminder" type. The feature follows the offline-first architecture — all CRUD operations happen locally first, with synchronization available for subscribed users.

## Glossary

- **Reminder**: A named reminder definition containing a name, icon, and background color. Used as a template for calendar event creation.
- **Reminder_Store**: The local persistence layer (IndexedDB on Web, SQLite on Android) that stores all reminder records on the device.
- **Sync_Service**: The cross-cutting synchronization module responsible for pushing and pulling reminder records to/from the backend API for subscribed users.
- **Reminders_Page**: The dedicated UI page accessible via the "Reminders" navigation item (AlarmClock icon on web, Alarm icon on Android) that lists all user-created reminders.
- **Reminder_Form**: The UI component used for both creating and editing a reminder, containing all configurable fields.
- **Reminder_Card**: The visual card component that displays a reminder's information on the Reminders_Page.
- **Confirmation_Modal**: A dialog that requires explicit user confirmation before executing destructive or state-changing operations.
- **Predefined_Palette**: A fixed set of colors available for reminder background selection, consistent across both platforms.

## Requirements

### Requirement 1: Create a Reminder

**User Story:** As a user, I want to create a new reminder with a name, icon, and background color, so that I can define reusable reminder templates for my calendar.

#### Acceptance Criteria

1. WHEN the user submits the Reminder_Form with all required fields populated, THE Reminder_Store SHALL persist a new reminder record with a client-generated UUID, the provided field values, `modifiedAt` set to the current UTC timestamp, `syncedAt` set to null, `isDeleted` set to false, and `isActive` set to true.
2. THE Reminder_Form SHALL require all of the following fields before allowing submission: name (text, 1 to 50 characters), icon (single emoji), and background color (from Predefined_Palette).
3. WHEN the user cancels reminder creation, THE Reminder_Form SHALL discard all entered data and navigate back to the Reminders_Page without persisting any record.
4. IF the reminder name exceeds 50 characters, THEN THE Reminder_Form SHALL prevent submission and display a validation message indicating the maximum length constraint.
5. THE Reminder_Form SHALL allow creation of a reminder with a name that already exists in the Reminder_Store, permitting duplicate reminder names.
6. IF the Reminder_Store fails to persist the reminder record, THEN THE Reminder_Form SHALL display a localized error message indicating that the reminder could not be saved, SHALL retain all entered field values, and SHALL remain on the Reminder_Form to allow the user to retry submission.

### Requirement 2: View Reminders

**User Story:** As a user, I want to view all my created reminders on a dedicated page, so that I can see an overview of my defined reminder templates.

#### Acceptance Criteria

1. THE Reminders_Page SHALL display all reminder records where `isDeleted` is false, ordered ascending by the date and time they were originally created (oldest first).
2. THE Reminders_Page SHALL render each reminder as a Reminder_Card displaying: the background color as a left-aligned color indicator, the icon and name on the first line.
3. WHEN no reminders exist with `isDeleted` set to false, THE Reminders_Page SHALL display the localized message "No reminders available".
4. THE Reminders_Page SHALL include a "New Reminder" button that navigates the user to the reminder creation Reminder_Form.
5. WHILE reminders are being retrieved from the Reminder_Store, THE Reminders_Page SHALL display a loading indicator and SHALL keep the loading indicator visible until the retrieval completes successfully or the error state is fully processed and replaced by an error message.
6. IF retrieval from the Reminder_Store fails, THEN THE Reminders_Page SHALL replace the loading indicator with a localized error message indicating that reminders could not be loaded.

### Requirement 3: Edit a Reminder

**User Story:** As a user, I want to edit an existing reminder's properties, so that I can update reminder definitions as my needs change.

#### Acceptance Criteria

1. WHEN the user taps the edit action on a Reminder_Card, THE Reminders_Page SHALL navigate to the Reminder_Form pre-populated with all current field values of the selected reminder.
2. WHEN the user submits the Reminder_Form with modified values, THE Reminder_Store SHALL update the existing reminder record with the new field values, set `modifiedAt` to the current UTC timestamp, and preserve the existing `id`, `syncedAt`, and `isDeleted` values unchanged.
3. WHEN the user cancels the edit, THE Reminder_Form SHALL discard all changes and navigate back to the Reminders_Page without modifying the existing reminder record.
4. WHILE the Reminder_Form is in edit mode, THE Reminder_Form SHALL enforce the same field validation rules as during reminder creation (name between 1 and 50 characters, exactly one emoji icon, and a color from the Predefined_Palette).
5. IF the user attempts to submit an edit for a reminder whose `isDeleted` field is true, THEN THE Reminder_Store SHALL reject the update and THE Reminder_Form SHALL navigate back to the Reminders_Page without persisting changes.

### Requirement 4: Deactivate a Reminder

**User Story:** As a user, I want to deactivate a reminder without deleting it, so that I can temporarily disable reminders I am not currently using while preserving them for future use.

#### Acceptance Criteria

1. WHEN the user toggles the deactivate control on a Reminder_Card, THE Reminders_Page SHALL display a Confirmation_Modal asking the user to confirm the deactivation.
2. WHEN the user confirms deactivation in the Confirmation_Modal, THE Reminder_Store SHALL set the reminder's `isActive` field to false and update `modifiedAt` to the current UTC timestamp.
3. WHEN the user cancels the Confirmation_Modal, THE Reminders_Page SHALL make no changes to the reminder record.
4. WHILE a reminder has `isActive` set to false, THE Reminder_Card SHALL apply reduced opacity to the card content and display a localized "Deactivated" badge to distinguish it from active reminders.
5. WHEN the user toggles the activate control on a deactivated Reminder_Card, THE Reminder_Store SHALL set the reminder's `isActive` field to true and update `modifiedAt` to the current UTC timestamp without displaying a Confirmation_Modal.
6. WHILE a reminder has `isActive` set to false, THE Reminder_Form SHALL exclude that reminder from the list of selectable reminders when the user is creating a new calendar event.
7. WHEN the Reminder_Store persists a new reminder record, THE Reminder_Store SHALL set the `isActive` field to true by default.

### Requirement 5: Delete a Reminder

**User Story:** As a user, I want to permanently delete a reminder I no longer need, so that I can keep my reminder list clean and relevant.

#### Acceptance Criteria

1. WHEN the user activates the delete control on a Reminder_Card, THE Reminders_Page SHALL display a Confirmation_Modal that communicates the deletion is permanent and cannot be undone, includes the reminder name for clarity, and offers confirm and cancel actions.
2. WHEN the user confirms deletion in the Confirmation_Modal, THE Reminder_Store SHALL set the reminder's `isDeleted` field to true, update `modifiedAt` to the current UTC timestamp, set `syncedAt` to null, and THE Reminders_Page SHALL dismiss the Confirmation_Modal.
3. WHEN the user dismisses the Confirmation_Modal by any means other than confirming (including cancelling, clicking outside the modal, or pressing the escape key), THE Reminders_Page SHALL dismiss the Confirmation_Modal and make no changes to the reminder record.
4. WHILE a reminder has `isDeleted` set to true, THE Reminders_Page SHALL exclude that reminder from the displayed list.

### Requirement 6: Reminder Data Synchronization

**User Story:** As a subscribed user, I want my reminders to synchronize across all my devices, so that I have a consistent view of my reminder definitions regardless of which device I use.

#### Acceptance Criteria

1. WHILE the user has an active subscription and connectivity is available, THE Sync_Service SHALL push reminder records where `syncedAt` is null or `modifiedAt` is greater than `syncedAt` in batches of no more than 100 records per request, and upon successful API acknowledgment SHALL set `syncedAt` to the current UTC timestamp on each pushed record; IF more than 100 records are pending push, THEN THE Sync_Service SHALL send sequential push requests until all pending records are pushed.
2. THE Reminder_Store SHALL include the following change tracking fields on every reminder record: `id` (UUID, client-generated), `modifiedAt` (DateTime UTC), `syncedAt` (DateTime UTC or null), and `isDeleted` (boolean).
3. WHEN a conflict occurs during pull synchronization where the local record has `modifiedAt` greater than its `syncedAt` and the remote record has a different `modifiedAt` value for the same reminder ID, THE Sync_Service SHALL retain the record with the later `modifiedAt` timestamp; IF both `modifiedAt` timestamps are identical, THEN THE Sync_Service SHALL always prefer and retain the remote record as the tie-breaking rule.
4. WHILE the user lacks an active subscription (including expired subscriptions) or connectivity is unavailable, THE Reminder_Store SHALL operate fully offline with all CRUD operations persisted locally and no synchronization attempts SHALL be made.
5. WHEN a pulled reminder record does not exist in the local Reminder_Store, THE Sync_Service SHALL insert the remote record into the local store with `syncedAt` set to the current UTC timestamp; WHEN a pulled reminder record already exists in the local Reminder_Store and the local record's `modifiedAt` is equal to or less than its `syncedAt`, THE Sync_Service SHALL overwrite the local record with the remote record's field values and set `syncedAt` to the current UTC timestamp.
6. IF a push request fails due to network error or server error response, THEN THE Sync_Service SHALL retain all unpushed records in their current unsynced state (with `syncedAt` unchanged) and SHALL reattempt the push on the next sync cycle without discarding or modifying the pending records.
7. WHEN a pull synchronization completes successfully, THE Sync_Service SHALL request records modified after the client's persisted `lastSyncedAt` timestamp in pages of no more than 100 records using a pagination cursor, SHALL send subsequent pull requests until fewer than 100 records are returned, and SHALL update the client's `lastSyncedAt` to the current UTC timestamp only after all pages have been processed and merged.
8. IF a pull request fails due to network error or server error response, THEN THE Sync_Service SHALL preserve the existing `lastSyncedAt` timestamp unchanged and SHALL reattempt the pull from the same `lastSyncedAt` value on the next sync cycle.

### Requirement 7: Reminder Field Validation

**User Story:** As a user, I want immediate feedback when I enter invalid data in the reminder form, so that I can correct mistakes before submission.

#### Acceptance Criteria

1. THE Reminder_Form SHALL validate that the name field contains between 1 and 50 characters after trimming leading and trailing whitespace, rejecting values that are empty or contain only whitespace.
2. THE Reminder_Form SHALL validate that exactly one emoji is selected in the icon field.
3. THE Reminder_Form SHALL validate that a color is selected from the Predefined_Palette for the background field.
4. IF any required field fails validation, THEN THE Reminder_Form SHALL display a localized error message adjacent to the invalid field and prevent form submission.
5. WHEN a field that previously failed validation is corrected to a valid value, THE Reminder_Form SHALL remove the error message for that field and re-enable form submission if all fields are valid. THE Reminder_Form SHALL also enable submission when all fields contain valid values from the initial state without requiring a prior validation failure.
6. WHEN the user modifies a field value, THE Reminder_Form SHALL validate that field within 1 second of the input change and display any resulting error message without requiring form submission.

### Requirement 8: Cross-Platform Consistency

**User Story:** As a user, I want the reminder management experience to be consistent across the React Web and Android platforms, so that I can use either platform interchangeably.

#### Acceptance Criteria

1. THE Reminder_Form SHALL present the same fields, validation rules, and default behaviors on both React Web and Android platforms.
2. THE Reminder_Card SHALL display the same data elements (color indicator, icon, name) in the same order on both platforms, rendered using each platform's native UI components.
3. WHEN the user changes the theme setting, THE Reminders_Page SHALL apply the selected theme (light mode or dark mode) immediately without requiring an application restart on both platforms.
4. WHEN the user changes the language setting, THE Reminders_Page SHALL render all user-facing text in the selected language (Spanish or English) immediately without requiring an application restart, using externalized i18n string resources on both platforms.
5. THE Reminders_Page SHALL use the Predefined_Palette color values consistently across both platforms so that the same reminder displays the same color indicator regardless of platform.
6. THE Reminders_Page SHALL provide the same user actions (create, edit, deactivate, activate, and delete) with the same navigation flows on both platforms, so that managing a reminder on one platform follows the same sequence of steps on the other platform.
