# Requirements Document

## Introduction

Shift Mode is a specialized operating mode for users who primarily use Planixor for shift management. When activated, it simplifies the calendar interface by removing Day and Week views, hiding the top-bar "New Event" button, and providing a streamlined day-tap interaction model in Month and Year views. This feature must be available on both React Web PWA and Android App with identical functionality. The setting persists locally and syncs across devices when synchronization is configured.

## Glossary

- **Shift_Mode_Setting**: A boolean syncable entity (with id, modifiedAt, syncedAt, isDeleted fields) that determines whether Shift Mode is active. Stored locally and synced when sync is configured.
- **Settings_Page**: The existing application settings screen where the Shift Mode toggle will be added.
- **Calendar_System**: The calendar module responsible for rendering Day, Week, Month, and Year views, and handling user interactions within those views.
- **View_Selector**: The UI component that allows users to switch between calendar view modes (Day, Week, Month, Year).
- **Day_Action_Modal**: A modal dialog displayed when a user taps a day that has existing shifts and/or reminders in Shift Mode, presenting ordered action options.
- **Calendar_Event_Form**: The existing form for creating or editing calendar events.
- **Shift_Form**: The existing form for modifying a shift's calendar event.
- **Reminder_Form**: The existing form for modifying a reminder's calendar event.
- **Shift_Card**: A compact card displaying shift information within the Day_Action_Modal.
- **Reminder_Card**: A compact card displaying reminder information within the Day_Action_Modal.
- **Top_Bar**: The fixed top navigation bar containing the "New Event" button, notifications, and user avatar.

## Requirements

### Requirement 1: Shift Mode Toggle in Settings

**User Story:** As a user who primarily manages shifts, I want to activate Shift Mode from the Settings page, so that my calendar interface is streamlined for shift-focused workflows.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a "Shift Mode" section positioned after the user manual section, containing a toggle switch (on/off) and a localized description explaining the effect of activating Shift Mode.
2. THE Settings_Page SHALL display a localized description informing the user that activating Shift Mode will disable the Day and Week views of the calendar and hide the "New Event" top-bar button.
3. WHEN the Settings_Page is loaded, THE toggle switch SHALL reflect the current persisted value of Shift_Mode_Setting (enabled or disabled), defaulting to disabled (false) if no Shift_Mode_Setting record exists in local storage.
4. WHEN the user activates the Shift Mode toggle, THE Settings_Page SHALL persist the Shift_Mode_Setting as enabled (true) in local storage without requiring network connectivity.
5. WHEN the user deactivates the Shift Mode toggle, THE Settings_Page SHALL persist the Shift_Mode_Setting as disabled (false) in local storage without requiring network connectivity.
6. THE Settings_Page SHALL display the Shift Mode section on both the React Web PWA and the Android App, with the same toggle control type, informational description content, and interaction behavior.
7. THE Settings_Page SHALL render all Shift Mode section labels and descriptions in the user's selected language (Spanish or English) using the application's existing i18n mechanism.
8. THE Settings_Page SHALL render the Shift Mode section correctly in both light mode and dark mode, following the application's current theme.

### Requirement 2: Shift Mode Setting Persistence and Sync

**User Story:** As a user with multiple devices, I want my Shift Mode preference to sync across devices, so that my calendar experience is consistent everywhere.

#### Acceptance Criteria

1. THE Shift_Mode_Setting SHALL be stored as a syncable entity with the following fields: id (UUID, generated client-side), enabled (boolean, default false), modifiedAt (DateTime UTC), syncedAt (DateTime UTC or null), and isDeleted (boolean). Exactly one Shift_Mode_Setting record SHALL exist per device; if no record exists when the Settings_Page is first accessed, the system SHALL create one with enabled=false and modifiedAt set to the current UTC timestamp.
2. WHEN the Shift_Mode_Setting is modified (toggled on or off), THE Settings_Page SHALL update the enabled field to the new value and set the modifiedAt field to the current UTC timestamp, and set syncedAt to null to mark the record as pending sync.
3. WHEN sync is configured and active, THE Shift_Mode_Setting SHALL participate in the standard bidirectional sync cycle (push and pull) using the API endpoint path `shift-mode-settings/sync/push` (POST) and `shift-mode-settings/sync/pull` (GET), with the push request body using the field name `records` (array containing at most 1 record).
4. WHEN a Shift_Mode_Setting is received during a pull sync cycle with a modifiedAt value strictly greater than the local record's modifiedAt, THE Calendar_System SHALL overwrite the local record's enabled and modifiedAt fields with the pulled values and update syncedAt to the current UTC timestamp.
5. IF a Shift_Mode_Setting is received during a pull sync cycle with a modifiedAt value equal to or less than the local record's modifiedAt, THEN THE Calendar_System SHALL discard the pulled record and retain the local state unchanged.
6. WHEN the local Shift_Mode_Setting's enabled value changes as a result of a sync pull (pulled value differs from current local value), THE Calendar_System on the receiving device SHALL apply the new Shift Mode state on the next UI render cycle (within the same sync callback) without requiring an application restart or manual page refresh. IF the pulled value is identical to the current local value, THE system SHALL skip the update without triggering a UI render cycle.
7. WHILE sync is not configured (local-only mode), THE Shift_Mode_Setting SHALL persist exclusively in local storage and function without any network operations or sync-related errors.

### Requirement 3: Calendar Behavior When Shift Mode Is Disabled

**User Story:** As a user who does not use Shift Mode, I want the calendar to function normally, so that I retain full access to all views and controls.

#### Acceptance Criteria

1. WHILE Shift Mode is disabled, THE Calendar_System SHALL display all four view options (Day, Week, Month, Year) in the View_Selector.
2. WHILE Shift Mode is disabled, THE Top_Bar SHALL display the "New Event" button on the Calendar page.
3. WHILE Shift Mode is disabled, THE Calendar_System SHALL retain the user's previously selected view mode; IF no prior view mode selection exists, THEN THE Calendar_System SHALL default to Day view.
4. WHILE Shift Mode is disabled, THE Calendar_System SHALL handle day-tap interactions as follows: in Month view, navigate to Day view for the tapped date; in Year view, navigate to Month view for the tapped month; in Week view, navigate to Day view for the tapped date.
5. WHEN the user disables Shift Mode, THE Calendar_System SHALL apply the change immediately to the current session without requiring page reload or app restart.

### Requirement 4: Calendar View Restrictions When Shift Mode Is Activated

**User Story:** As a Shift Mode user, I want the Day and Week views removed and the "New Event" button hidden, so that I interact with the calendar exclusively through the Month and Year views.

#### Acceptance Criteria

1. WHILE Shift Mode is active, THE View_Selector SHALL display exactly two view options — Month and Year — removing Day and Week from the selectable options, and SHALL NOT render Day or Week as disabled or greyed-out items.
2. WHILE Shift Mode is active, THE Top_Bar SHALL hide the "New Event" button (and any "+" icon variant) on the Calendar page so that no calendar event creation action is accessible from the Top_Bar.
3. WHILE Shift Mode is active, THE Calendar_System SHALL use Month view as the default view when the Calendar page is loaded or the app is opened.
4. WHEN Shift Mode is activated while the user is currently on the Day or Week view, THE Calendar_System SHALL immediately navigate to the Month view without requiring user confirmation or page reload, preserving the currently selected date context (same month visible).
5. WHEN Shift Mode is activated while the user is currently on the Month or Year view, THE Calendar_System SHALL remain on the current view without navigation change.
6. WHEN Shift Mode is deactivated, THE Calendar_System SHALL restore all four view options (Day, Week, Month, Year) in the View_Selector in their standard order, restore the "New Event" button in the Top_Bar on the Calendar page, and set the default view back to Day view.
7. WHILE Shift Mode is active, IF the user navigates to the Calendar page via deep link or direct URL with a Day or Week view parameter, THEN THE Calendar_System SHALL ignore the unsupported view parameter and display the Month view instead.
8. WHILE Shift Mode is active, THE Calendar_System SHALL retain the Year view as selectable and fully functional alongside Month view.

### Requirement 5: Month View Day-Tap Interaction — Empty Day

**User Story:** As a Shift Mode user viewing the month calendar, I want to tap an empty day to quickly create a calendar event for that day, so that I can efficiently add shifts to my schedule.

#### Acceptance Criteria

1. WHILE Shift Mode is active in Month view, WHEN the user taps a day that has zero non-deleted calendar events referencing a shift AND zero non-deleted calendar events referencing a reminder for that day, THE Calendar_System SHALL perform the prerequisite check (at least one Shift or one Reminder with isDeleted=false must exist in local storage) and, if passed, open the Calendar_Event_Form with the tapped day preselected as the start day.
2. WHILE Shift Mode is active in Month view, WHEN the user taps an empty day and the prerequisite check fails (zero Shifts with isDeleted=false AND zero Reminders with isDeleted=false exist in local storage), THE Calendar_System SHALL display the Prerequisite_Modal instead of opening the Calendar_Event_Form.
3. WHEN the Calendar_Event_Form is submitted successfully after opening from a Month view empty-day tap, THE Calendar_System SHALL return to the Month view preserving the same month that was displayed when the user tapped the day, and the newly created event SHALL be visible in the month grid.
4. WHEN the Calendar_Event_Form is cancelled after opening from a Month view empty-day tap, THE Calendar_System SHALL return to the Month view preserving the same month that was displayed when the user tapped the day.
5. WHILE Shift Mode is active in Month view, WHEN the user taps a day cell belonging to an adjacent month (visible but dimmed in the grid), THE Calendar_System SHALL apply the same empty-day or day-with-content interaction logic as for days in the current month, using the tapped day's actual date as the preselected start day.

### Requirement 6: Month View Day-Tap Interaction — Day With Content

**User Story:** As a Shift Mode user viewing the month calendar, I want to tap a day that has shifts or reminders to see my options for that day, so that I can create new events or modify existing ones.

#### Acceptance Criteria

1. WHILE Shift Mode is active in Month view, WHEN the user taps a day that has at least one non-deleted calendar event referencing a shift or at least one non-deleted calendar event referencing a reminder, THE Calendar_System SHALL display the Day_Action_Modal for that day.
2. THE Day_Action_Modal SHALL display its action items in the following strict order: (1) a "Create calendar event" button at the top, (2) shift cards for each shift-type calendar event on that day ordered alphabetically by shift name, (3) reminder cards for each reminder-type calendar event on that day ordered alphabetically by reminder name.
3. WHEN the user selects the "Create calendar event" button in the Day_Action_Modal, THE Calendar_System SHALL close the modal and open the Calendar_Event_Form with the selected day preselected as the start day.
4. WHEN the Calendar_Event_Form is submitted or cancelled after opening from the Day_Action_Modal in Month view, THE Calendar_System SHALL return to the Month view preserving the same month context.
5. WHEN the user selects a Shift_Card in the Day_Action_Modal, THE Calendar_System SHALL close the modal and open the Shift_Form (edit mode) for that shift's calendar event.
6. WHEN the Shift_Form is submitted or cancelled after opening from the Day_Action_Modal in Month view, THE Calendar_System SHALL return to the Month view preserving the same month context.
7. WHEN the user selects a Reminder_Card in the Day_Action_Modal, THE Calendar_System SHALL close the modal and open the Reminder_Form (edit mode) for that reminder's calendar event.
8. WHEN the Reminder_Form is submitted or cancelled after opening from the Day_Action_Modal in Month view, THE Calendar_System SHALL return to the Month view preserving the same month context.
9. IF a day has shift-type calendar events but no reminder-type calendar events, THEN THE Day_Action_Modal SHALL display the "Create calendar event" button followed by shift cards only, with no reminder section visible.
10. IF a day has reminder-type calendar events but no shift-type calendar events, THEN THE Day_Action_Modal SHALL display the "Create calendar event" button followed by reminder cards only, with no shift section visible.
11. THE Day_Action_Modal SHALL be dismissible by tapping outside the modal or using a platform-appropriate close gesture (back button on Android, Escape key on web), returning the user to the Month view without any action.

### Requirement 7: Year View Day-Tap Interaction — Empty Day

**User Story:** As a Shift Mode user viewing the year calendar, I want to tap an empty day to quickly create a calendar event for that day, so that I can plan shifts ahead of time.

#### Acceptance Criteria

1. WHILE Shift Mode is active in Year view, WHEN the user taps a day that has zero non-deleted calendar events referencing a shift AND zero non-deleted calendar events referencing a reminder for that day, THE Calendar_System SHALL perform the prerequisite check and, if passed, open the Calendar_Event_Form with the tapped day preselected as the start day.
2. WHILE Shift Mode is active in Year view, WHEN the user taps an empty day and the prerequisite check fails, THE Calendar_System SHALL display the Prerequisite_Modal instead of opening the Calendar_Event_Form.
3. WHEN the Calendar_Event_Form is submitted successfully after opening from a Year view empty-day tap, THE Calendar_System SHALL return to the Year view preserving the same year that was displayed when the user tapped the day.
4. WHEN the Calendar_Event_Form is cancelled after opening from a Year view empty-day tap, THE Calendar_System SHALL return to the Year view preserving the same year that was displayed when the user tapped the day.

### Requirement 8: Year View Day-Tap Interaction — Day With Content

**User Story:** As a Shift Mode user viewing the year calendar, I want to tap a day that has shifts or reminders to see my options for that day, so that I can create new events or modify existing ones from the year overview.

#### Acceptance Criteria

1. WHILE Shift Mode is active in Year view, WHEN the user taps a day that has at least one non-deleted calendar event referencing a shift or at least one non-deleted calendar event referencing a reminder, THE Calendar_System SHALL display the Day_Action_Modal for that day.
2. THE Day_Action_Modal SHALL display its action items in the following strict order: (1) a "Create calendar event" button at the top, (2) shift cards for each shift-type calendar event on that day ordered alphabetically by shift name, (3) reminder cards for each reminder-type calendar event on that day ordered alphabetically by reminder name.
3. WHEN the user selects the "Create calendar event" button in the Day_Action_Modal, THE Calendar_System SHALL close the modal, perform the prerequisite check, and if passed, open the Calendar_Event_Form with the selected day preselected as the start day.
4. WHEN the Calendar_Event_Form is submitted or cancelled after opening from the Day_Action_Modal in Year view, THE Calendar_System SHALL return to the Month view (not Year view, per specification).
5. WHEN the user selects a Shift_Card in the Day_Action_Modal, THE Calendar_System SHALL close the modal and open the Shift_Form (edit mode) for that shift's calendar event.
6. WHEN the Shift_Form is submitted or cancelled after opening from the Day_Action_Modal in Year view, THE Calendar_System SHALL return to the Month view (not Year view, per specification).
7. WHEN the user selects a Reminder_Card in the Day_Action_Modal, THE Calendar_System SHALL close the modal and open the Reminder_Form (edit mode) for that reminder's calendar event.
8. WHEN the Reminder_Form is submitted or cancelled after opening from the Day_Action_Modal in Year view, THE Calendar_System SHALL return to the Month view (not Year view, per specification).
9. IF a day has shift-type calendar events but no reminder-type calendar events, THEN THE Day_Action_Modal SHALL display the "Create calendar event" button followed by shift cards only, with no reminder section visible.
10. IF a day has reminder-type calendar events but no shift-type calendar events, THEN THE Day_Action_Modal SHALL display the "Create calendar event" button followed by reminder cards only, with no shift section visible.
11. THE Day_Action_Modal SHALL be dismissible by tapping outside the modal or using a platform-appropriate close gesture (back button on Android, Escape key on web), returning the user to the Year view without any action.

### Requirement 9: Day Action Modal Presentation

**User Story:** As a Shift Mode user, I want the day action modal to clearly present my options with recognizable shift and reminder cards, so that I can quickly identify and act on the correct item.

#### Acceptance Criteria

1. THE Day_Action_Modal SHALL display the selected day's date in the modal header, formatted according to the user's locale (Spanish: "dd de MMMM de yyyy" pattern, English: "MMMM dd, yyyy" pattern).
2. THE Day_Action_Modal SHALL display the "Create calendar event" button as a prominent action button with localized text, positioned above the list of shift and reminder cards.
3. THE Day_Action_Modal SHALL display each Shift_Card with the shift name (maximum 50 characters, truncated with ellipsis if exceeded), start time formatted as HH:mm, end time formatted as HH:mm, and the shift's assigned color indicator as a left border (4px width).
4. THE Day_Action_Modal SHALL display each Reminder_Card with the reminder name (maximum 50 characters, truncated with ellipsis if exceeded), the reminder's emoji icon, and the reminder's assigned color indicator as a left border (4px width).
5. THE Day_Action_Modal SHALL list all active (non-deleted) shifts first, followed by all active (non-deleted) reminders, with shifts ordered alphabetically by name and reminders ordered alphabetically by name.
6. THE Day_Action_Modal SHALL render correctly in both light mode and dark mode: using soft shadow and white/neutral-light card backgrounds in light mode, and subtle borders with surface-dark card backgrounds in dark mode.
7. THE Day_Action_Modal SHALL display all text (header, button labels, card content) in the user's selected language using the application's i18n mechanism.
8. IF the combined list of shifts and reminders exceeds the modal's visible area, THEN THE Day_Action_Modal SHALL enable vertical scrolling within the modal body while keeping the header and "Create calendar event" button fixed.
9. THE Day_Action_Modal SHALL use rounded corners (12px border-radius) consistent with the application's modal styling standard.
10. THE Day_Action_Modal SHALL be implemented identically on both React Web PWA and Android App with the same content layout, action order, and interaction behavior.

### Requirement 10: Cross-Platform Feature Parity

**User Story:** As a user with both web and mobile access, I want Shift Mode to behave identically on both platforms, so that my experience is consistent regardless of which device I use.

#### Acceptance Criteria

1. THE Calendar_System on React Web PWA SHALL implement Shift Mode with identical view restrictions, day-tap interactions, modal content, and navigation behavior as described in Requirements 3 through 9.
2. THE Calendar_System on Android App SHALL implement Shift Mode with identical view restrictions, day-tap interactions, modal content, and navigation behavior as described in Requirements 3 through 9.
3. WHEN Shift Mode is active on one platform and synced to the other platform, THE Calendar_System on the receiving platform SHALL reflect the same Shift Mode state and calendar behavior without requiring manual intervention.
4. THE Day_Action_Modal SHALL present the same ordered content (create button, shift cards, reminder cards) and the same navigation flows on both platforms.
5. THE Shift Mode feature SHALL function fully offline on both platforms, with all interactions (toggle, view restrictions, day-tap modal) operating against local storage without network dependency.
6. IF the sync service successfully delivers a Shift_Mode_Setting update to a device but the receiving platform's UI fails to reflect the change due to a rendering error, THE system SHALL log the error and retry the UI update on the next app focus event without requiring user intervention.
