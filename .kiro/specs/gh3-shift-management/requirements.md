# Requirements Document

## Introduction

Shift Management enables users to create, view, edit, deactivate, and delete work shifts across all Planixor platforms (React Web PWA and Android App). Shifts serve as reusable templates that can later be assigned to calendar events. The feature follows the offline-first architecture — all CRUD operations happen locally first, with synchronization available for subscribed users.

## Glossary

- **Shift**: A named work period definition containing a name, icon, background color, start time, end time, and hours worked. Used as a template for calendar event creation.
- **Shift_Store**: The local persistence layer (IndexedDB on Web, SQLite on Android) that stores all shift records on the device.
- **Sync_Service**: The cross-cutting synchronization module responsible for pushing and pulling shift records to/from the backend API for subscribed users.
- **Shifts_Page**: The dedicated UI page accessible via the "Shifts" navigation item that lists all user-created shifts.
- **Shift_Form**: The UI component used for both creating and editing a shift, containing all configurable fields.
- **Shift_Card**: The visual card component that displays a shift's information on the Shifts_Page.
- **Confirmation_Modal**: A dialog that requires explicit user confirmation before executing destructive or state-changing operations.
- **Predefined_Palette**: A fixed set of colors available for shift background selection, consistent across both platforms.
- **Hours_Worked**: The duration value representing actual working hours for a shift, defaulting to the difference between End_Time and Start_Time but user-modifiable.

## Requirements

### Requirement 1: Create a Shift

**User Story:** As a user, I want to create a new work shift with a name, icon, background color, start time, end time, and hours worked, so that I can define reusable shift templates for my calendar.

#### Acceptance Criteria

1. WHEN the user submits the Shift_Form with all required fields populated, THE Shift_Store SHALL persist a new shift record with a client-generated UUID, the provided field values, `modifiedAt` set to the current UTC timestamp, `syncedAt` set to null, `isDeleted` set to false, and `isActive` set to true.
2. THE Shift_Form SHALL require all of the following fields before allowing submission: name (text, 1 to 50 characters), icon (single emoji), background color (from Predefined_Palette), start time (hours and minutes), and end time (hours and minutes).
3. WHEN the user sets both a start time and an end time, THE Shift_Form SHALL calculate and display the Hours_Worked field as the positive duration from start time to end time, treating an end time earlier than or equal to the start time as crossing midnight into the next day.
4. WHEN the Hours_Worked field displays a calculated value, THE Shift_Form SHALL allow the user to manually override the Hours_Worked value using a time picker for hours and minutes.
5. WHEN the user cancels shift creation, THE Shift_Form SHALL discard all entered data and navigate back to the Shifts_Page without persisting any record.
6. IF the shift name exceeds 50 characters, THEN THE Shift_Form SHALL prevent submission and display a validation message indicating the maximum length constraint.
7. THE Shift_Form SHALL allow creation of a shift with a name that already exists in the Shift_Store, permitting duplicate shift names.

### Requirement 2: View Shifts

**User Story:** As a user, I want to view all my created shifts on a dedicated page, so that I can see an overview of my defined work periods.

#### Acceptance Criteria

1. THE Shifts_Page SHALL display all shift records where `isDeleted` is false, ordered ascending by the date and time they were originally created (oldest first).
2. THE Shifts_Page SHALL render each shift as a Shift_Card displaying: the background color as a left-aligned color indicator, the icon and name on the first line, and the start time (formatted per device locale), end time (formatted per device locale), and hours worked (displayed as duration in hours and minutes) on the second line.
3. WHEN no shifts exist with `isDeleted` set to false, THE Shifts_Page SHALL display the localized message "No shifts available".
4. THE Shifts_Page SHALL include a "New Shift" button that navigates the user to the shift creation Shift_Form.
5. WHILE shifts are being retrieved from the Shift_Store, THE Shifts_Page SHALL display a loading indicator and SHALL keep the loading indicator visible until the retrieval completes successfully or the error state is fully processed and replaced by an error message.
6. IF retrieval from the Shift_Store fails, THEN THE Shifts_Page SHALL replace the loading indicator with a localized error message indicating that shifts could not be loaded.

### Requirement 3: Edit a Shift

**User Story:** As a user, I want to edit an existing shift's properties, so that I can update shift definitions as my schedule changes.

#### Acceptance Criteria

1. WHEN the user taps the edit action on a Shift_Card, THE Shifts_Page SHALL navigate to the Shift_Form pre-populated with all current field values of the selected shift.
2. WHEN the user submits the Shift_Form with modified values, THE Shift_Store SHALL update the existing shift record with the new field values, set `modifiedAt` to the current UTC timestamp, and preserve the existing `id`, `syncedAt`, and `isDeleted` values unchanged.
3. WHEN the user cancels the edit, THE Shift_Form SHALL discard all changes and navigate back to the Shifts_Page without modifying the existing shift record.
4. WHILE the Shift_Form is in edit mode, THE Shift_Form SHALL enforce the same field validation rules as during shift creation (name between 1 and 50 characters, exactly one emoji icon, a color from the Predefined_Palette, start time and end time set, and Hours_Worked of at least 1 minute).
5. IF the user attempts to submit an edit for a shift whose `isDeleted` field is true, THEN THE Shift_Store SHALL reject the update and THE Shift_Form SHALL navigate back to the Shifts_Page without persisting changes.

### Requirement 4: Deactivate a Shift

**User Story:** As a user, I want to deactivate a shift without deleting it, so that I can temporarily disable shifts I am not currently using while preserving them for future use.

#### Acceptance Criteria

1. WHEN the user toggles the deactivate control on a Shift_Card, THE Shifts_Page SHALL display a Confirmation_Modal asking the user to confirm the deactivation.
2. WHEN the user confirms deactivation in the Confirmation_Modal, THE Shift_Store SHALL set the shift's `isActive` field to false and update `modifiedAt` to the current UTC timestamp.
3. WHEN the user cancels the Confirmation_Modal, THE Shifts_Page SHALL make no changes to the shift record.
4. WHILE a shift has `isActive` set to false, THE Shift_Card SHALL apply reduced opacity to the card content and display a localized "Deactivated" badge to distinguish it from active shifts.
5. WHEN the user toggles the activate control on a deactivated Shift_Card, THE Shift_Store SHALL set the shift's `isActive` field to true and update `modifiedAt` to the current UTC timestamp without displaying a Confirmation_Modal.
6. WHILE a shift has `isActive` set to false, THE Shift_Form SHALL exclude that shift from the list of selectable shifts when the user is creating a new calendar event.
7. WHEN the Shift_Store persists a new shift record, THE Shift_Store SHALL set the `isActive` field to true by default.

### Requirement 5: Delete a Shift

**User Story:** As a user, I want to permanently delete a shift I no longer need, so that I can keep my shift list clean and relevant.

#### Acceptance Criteria

1. WHEN the user activates the delete control on a Shift_Card, THE Shifts_Page SHALL display a Confirmation_Modal that communicates the deletion is permanent and cannot be undone, and offers confirm and cancel actions.
2. WHEN the user confirms deletion in the Confirmation_Modal, THE Shift_Store SHALL set the shift's `isDeleted` field to true, update `modifiedAt` to the current UTC timestamp, set `syncedAt` to null, and THE Shifts_Page SHALL dismiss the Confirmation_Modal.
3. WHEN the user dismisses the Confirmation_Modal by any means other than confirming (including cancelling, clicking outside the modal, or pressing the escape key), THE Shifts_Page SHALL dismiss the Confirmation_Modal and make no changes to the shift record.
4. WHILE a shift has `isDeleted` set to true, THE Shifts_Page SHALL exclude that shift from the displayed list.

### Requirement 6: Shift Data Synchronization

**User Story:** As a subscribed user, I want my shifts to synchronize across all my devices, so that I have a consistent view of my shift definitions regardless of which device I use.

#### Acceptance Criteria

1. WHILE the user has an active subscription and connectivity is available, THE Sync_Service SHALL push shift records where `syncedAt` is null or `modifiedAt` is greater than `syncedAt`, and upon successful API acknowledgment SHALL set `syncedAt` to the current UTC timestamp on each pushed record.
2. THE Shift_Store SHALL include the following change tracking fields on every shift record: `id` (UUID, client-generated), `modifiedAt` (DateTime UTC), `syncedAt` (DateTime UTC or null), and `isDeleted` (boolean).
3. WHEN a conflict occurs during pull synchronization where the local record has `modifiedAt` greater than its `syncedAt` and the remote record has a different `modifiedAt` value for the same shift ID, THE Sync_Service SHALL retain the record with the later `modifiedAt` timestamp; IF both `modifiedAt` timestamps are identical, THEN THE Sync_Service SHALL always prefer and retain the remote record as the tie-breaking rule.
4. WHILE the user lacks an active subscription (including expired subscriptions) or connectivity is unavailable, THE Shift_Store SHALL operate fully offline with all CRUD operations persisted locally and no synchronization attempts SHALL be made.
5. WHEN a pulled shift record does not exist in the local Shift_Store, THE Sync_Service SHALL insert the remote record into the local store with `syncedAt` set to the current UTC timestamp.

### Requirement 7: Shift Field Validation

**User Story:** As a user, I want immediate feedback when I enter invalid data in the shift form, so that I can correct mistakes before submission.

#### Acceptance Criteria

1. THE Shift_Form SHALL validate that the name field contains between 1 and 50 characters after trimming leading and trailing whitespace, rejecting values that are empty or contain only whitespace.
2. THE Shift_Form SHALL validate that exactly one emoji is selected in the icon field.
3. THE Shift_Form SHALL validate that a color is selected from the Predefined_Palette for the background field.
4. THE Shift_Form SHALL validate that both start time and end time are set using a time picker with hours (0–23) and minutes (0–59).
5. THE Shift_Form SHALL validate that the Hours_Worked field contains a value between 1 minute and 24 hours (1440 minutes) inclusive.
6. IF any required field fails validation, THEN THE Shift_Form SHALL display a localized error message adjacent to the invalid field and prevent form submission.
7. WHEN a field that previously failed validation is corrected to a valid value, THE Shift_Form SHALL remove the error message for that field and re-enable form submission if all fields are valid. THE Shift_Form SHALL also enable submission when all fields contain valid values from the initial state without requiring a prior validation failure.
8. WHEN the user modifies a field value, THE Shift_Form SHALL validate that field within 1 second of the input change and display any resulting error message without requiring form submission.

### Requirement 8: Cross-Platform Consistency

**User Story:** As a user, I want the shift management experience to be consistent across the React Web and Android platforms, so that I can use either platform interchangeably.

#### Acceptance Criteria

1. THE Shift_Form SHALL present the same fields, validation rules, and default behaviors on both React Web and Android platforms.
2. THE Shift_Card SHALL display the same data elements (color indicator, icon, name, start time, end time, hours worked) in the same order on both platforms, rendered using each platform's native UI components.
3. WHEN the user changes the theme setting, THE Shifts_Page SHALL apply the selected theme (light mode or dark mode) immediately without requiring an application restart on both platforms.
4. WHEN the user changes the language setting, THE Shifts_Page SHALL render all user-facing text in the selected language (Spanish or English) immediately without requiring an application restart, using externalized i18n string resources on both platforms.
5. THE Shifts_Page SHALL use the Predefined_Palette color values consistently across both platforms so that the same shift displays the same color indicator regardless of platform.

### Requirement 9: Hours Worked Calculation

**User Story:** As a user, I want the hours worked to be automatically calculated from my start and end times, so that I save time during shift creation while retaining the ability to adjust for breaks or overtime.

#### Acceptance Criteria

1. WHEN the user sets both start time and end time to different values, THE Shift_Form SHALL compute Hours_Worked as the positive duration from start time to end time, treating end time before start time as crossing midnight, with a maximum computed result of 23 hours and 59 minutes.
2. WHEN the computed Hours_Worked value is displayed, THE Shift_Form SHALL allow the user to override the value manually to any duration between 1 minute and 24 hours (1440 minutes) inclusive without recalculating from start and end times.
3. WHEN the user modifies either start time or end time after a manual override, THE Shift_Form SHALL recalculate Hours_Worked from the new time values, replacing the manual override.
4. IF the user sets start time equal to end time, THEN THE Shift_Form SHALL compute Hours_Worked as 24 hours (1440 minutes), which is a special case that exceeds the 23:59 maximum applied to unequal start/end time calculations.
5. IF the user clears or removes either start time or end time after Hours_Worked has been calculated or manually overridden, THEN THE Shift_Form SHALL clear the Hours_Worked value.
