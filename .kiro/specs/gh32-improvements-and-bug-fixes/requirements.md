# Requirements Document

## Introduction

This document specifies improvements and bug fixes across all three Planixor sub-projects (Backend API, React Web PWA, and Android App) as described in GitHub issue #32. The changes cover dependency updates, synchronization pause persistence, calendar event prerequisite validation, form validation enforcement, user message modals, version display in settings, and an Android sync regression fix.

## Glossary

- **Backend_API**: The .NET 10 C# REST API that serves as the synchronization hub for Planixor.
- **React_Web**: The React TypeScript Progressive Web App (PWA) frontend client.
- **Android_App**: The native Android/Kotlin mobile application client.
- **Sync_Service**: The background service on each client responsible for bidirectional data synchronization with the Backend_API.
- **Sync_Pause_State**: A persisted boolean flag indicating whether the user has manually paused synchronization.
- **Calendar_Event_Form**: The UI form used to create a new calendar event on either client.
- **Shift**: A reusable work shift template with defined start time, end time, and hours worked.
- **Reminder**: A reusable reminder template with a name, emoji icon, and color.
- **Prerequisite_Modal**: A modal dialog informing the user that shifts and/or reminders must exist before creating a calendar event.
- **Settings_Screen**: The application settings page accessible from the main navigation.
- **Form_Validation**: The process of checking that all mandatory fields contain valid data before accepting a form submission.
- **StyleCop**: The C# code style analyzer configured for the Backend_API project.
- **Codenized_NuGet_Packages**: Internal NuGet packages prefixed with `Codenized.*` used by the Backend_API.

## Requirements

### Requirement 1: Remove Backend Compilation and Analyzer Warnings

**User Story:** As a developer, I want the Backend_API to compile with zero warnings from both the compiler and StyleCop analyzers, so that the codebase maintains consistent quality and warnings do not obscure real issues.

#### Acceptance Criteria

1. THE Backend_API SHALL produce zero C# compiler warnings and zero StyleCop analyzer diagnostics when built with `dotnet build` in the default (Debug) configuration.
2. IF a warning cannot be resolved because it originates from generated code or a false positive, THEN THE Backend_API SHOULD suppress it with an explicit `[SuppressMessage]` attribute or a `#pragma warning disable` comment that includes a justification string explaining why the suppression is acceptable.
3. WHEN a developer runs `dotnet build` on the Backend_API solution, THE build SHALL complete with exit code 0 and the build output SHALL contain zero lines matching the pattern `warning [A-Z]+[0-9]+`.

---

### Requirement 2: Update Backend NuGet Packages

**User Story:** As a developer, I want all `Codenized.*` NuGet packages in the Backend_API updated to their latest compatible versions, so that the project benefits from bug fixes and improvements in shared libraries.

#### Acceptance Criteria

1. THE Backend_API SHALL reference the highest stable (non-prerelease) version of every `Codenized.*` NuGet package available on the configured NuGet feed, as declared in the project's `.csproj` file(s).
2. WHEN the NuGet packages are updated, THE Backend_API SHALL build successfully with zero errors and zero new warnings that were not present before the update.
3. WHEN the NuGet packages are updated, THE Backend_API existing unit tests SHALL pass without any test code modifications.
4. IF a package update introduces issues (breaking API changes, compilation errors, test failures, or stability concerns), THEN THE Backend_API SHALL pin that specific package to the highest version that builds and passes tests, and the pinning SHALL be documented as a code comment on the PackageReference indicating the reason and the version that was incompatible.

---

### Requirement 3: Update React Web Dependencies

**User Story:** As a developer, I want all project dependencies in the React_Web updated to their latest compatible versions including React itself, so that the application benefits from performance improvements, security patches, and new features.

#### Acceptance Criteria

1. THE React_Web SHALL reference the latest stable versions of all dependencies listed in `package.json`, where "latest stable" means the highest published version on the npm registry that satisfies the major version ranges defined in the project.
2. WHEN a newer stable version of React exists within the current major range, THE React_Web SHALL update to that version in both `package.json` and the lock file.
3. WHEN dependencies are updated, THE React_Web SHALL complete the build command (`tsc -b && vite build`) with zero errors and zero TypeScript compilation errors.
4. WHEN dependencies are updated, THE React_Web unit tests SHALL pass when executed via `pnpm vitest --run` with no test failures. WHEN a dependency update introduces a breaking API change, THE React_Web SHALL adapt the affected code and tests to use the new API while preserving the same behavioral assertions, regardless of whether the existing tests currently pass.
5. WHEN dependencies are updated, THE React_Web SHALL produce zero ESLint errors when executed via `pnpm run lint`.
6. WHEN dependencies are updated, THE React_Web SHALL pass the TypeScript type check (`tsc --noEmit`) with zero errors.

---

### Requirement 4: Persist Sync Pause State Across Restarts (React Web)

**User Story:** As a user, I want synchronization to remain paused after I close and reopen the web application, so that I have full control over when sync resumes without needing to re-pause every session.

#### Acceptance Criteria

1. WHEN the user pauses synchronization, THE React_Web SHALL persist the Sync_Pause_State to the same local storage mechanism used for Sync_Config (IndexedDB or LocalStorage) and THE React_Web SHALL set the Connection_Status to PAUSED.
2. WHEN the React_Web is opened and the persisted Sync_Pause_State is paused, THE Sync_Service SHALL NOT schedule any periodic sync timers, SHALL NOT execute app-open sync, and SHALL NOT attempt any push or pull operations until the user explicitly resumes synchronization.
3. WHILE the Sync_Pause_State is paused, THE Sync_Service SHALL NOT attempt any push or pull operations regardless of connectivity status, periodic timer expiration, app focus/blur events, connectivity restoration events, or manual sync triggers.
4. WHEN the user resumes synchronization, THE React_Web SHALL persist the Sync_Pause_State as active, SHALL set the Connection_Status to ACTIVE, and THE Sync_Service SHALL trigger a full push and pull sync cycle immediately upon resume.
5. WHEN the React_Web is opened and the persisted Sync_Pause_State is paused, THE React_Web SHALL display the Connection_Status as PAUSED in the top bar without requiring any user interaction.
6. IF the Sync_Config is not configured (Connection_Status is UNCONFIGURED), THEN THE React_Web SHALL treat the UNCONFIGURED state as taking precedence over any persisted Sync_Pause_State and SHALL display UNCONFIGURED in the top bar.
7. WHEN the user triggers a Reset Application action, THE React_Web SHALL clear the persisted Sync_Pause_State along with all other local data, returning the pause state to its default (not paused).

---

### Requirement 5: Persist Sync Pause State Across Restarts (Android App)

**User Story:** As a user, I want synchronization to remain paused after I close and reopen the Android application or restart my device, so that I have full control over when sync resumes.

#### Acceptance Criteria

1. WHEN the user pauses synchronization, THE Android_App SHALL persist the Sync_Pause_State to DataStore before updating the UI to reflect the paused state, and SHALL set the ConnectionStatus to PAUSED.
2. WHEN the Android_App process starts and the persisted Sync_Pause_State is paused, THE Sync_Service SHALL remain inactive until the user explicitly resumes synchronization via the sync settings UI.
3. WHILE the Sync_Pause_State is paused, THE Sync_Service SHALL NOT attempt any push or pull operations regardless of connectivity status, periodic timer expiration, Activity resume or pause lifecycle events, connectivity-restored events, manual sync requests, or device restarts.
4. WHEN the user resumes synchronization, THE Android_App SHALL persist the updated Sync_Pause_State as active, set the ConnectionStatus to ACTIVE, and THE Sync_Service SHALL execute an immediate full push-and-pull sync cycle followed by resumption of periodic background sync at the configured interval.
5. IF sync has not been configured (no server URL and API key saved), THEN THE Android_App SHALL NOT present the pause or resume controls to the user.
6. WHILE the Sync_Pause_State is paused, THE Android_App SHALL display the ConnectionStatus as PAUSED in the top bar connection status indicator.

---

### Requirement 6: Calendar Event Prerequisite Check (React Web)

**User Story:** As a user, I want to be informed that I need to create shifts or reminders before creating a calendar event, so that I understand the system requirements and can take the appropriate action.

#### Acceptance Criteria

1. WHEN the user clicks the "New Event" button and no Shift records with isDeleted=false AND no Reminder records with isDeleted=false exist in local storage (zero of both types), THE React_Web SHALL display the Prerequisite_Modal indicating that at least one shift or one reminder must be created before creating a calendar event.
2. WHEN the user clicks the "New Event" button and at least one Shift record with isDeleted=false OR at least one Reminder record with isDeleted=false exists in local storage, THE React_Web SHALL display the Calendar_Event_Form without showing the Prerequisite_Modal.
3. THE Prerequisite_Modal SHALL provide navigation actions that route the user to the Shifts page and the Reminders page.
4. THE Prerequisite_Modal SHALL provide a dismiss action that closes the modal and returns the user to the Calendar view without navigating away.
5. WHILE the Prerequisite_Modal is displayed, THE React_Web SHALL NOT display the Calendar_Event_Form.
6. THE Prerequisite_Modal SHALL include only non-deactivated records (isDeleted=false) in the prerequisite existence check, regardless of any other record status fields.

---

### Requirement 7: Calendar Event Prerequisite Check (Android App)

**User Story:** As a user, I want to be informed that I need to create shifts or reminders before creating a calendar event on Android, so that I understand the system requirements and can take the appropriate action.

#### Acceptance Criteria

1. WHEN the user initiates calendar event creation and no Shift records with isDeleted=false AND no Reminder records with isDeleted=false exist in local storage (zero of both types), THE Android_App SHALL display the Prerequisite_Modal informing the user that at least one shift or one reminder must be created first.
2. WHEN the user initiates calendar event creation and at least one Shift record with isDeleted=false OR at least one Reminder record with isDeleted=false exists in local storage, THE Android_App SHALL display the Calendar_Event_Form.
3. THE Prerequisite_Modal SHALL NOT display the Calendar_Event_Form.
4. THE Prerequisite_Modal SHALL provide a dismiss button that closes the modal and returns the user to the Calendar screen without navigation.
5. THE Prerequisite_Modal SHALL provide navigation actions that navigate the user to the Shifts screen and the Reminders screen.

---

### Requirement 8: Form Validation for Mandatory Fields (React Web)

**User Story:** As a user, I want to see clear error messages on all mandatory form fields when I attempt to submit a form with incomplete data, so that I know exactly which fields require my attention.

#### Acceptance Criteria

1. WHEN the user attempts to submit any form and one or more mandatory fields are empty (null, undefined, or containing only whitespace for text fields; unselected for dropdowns, date pickers, and color pickers), THE React_Web SHALL prevent form submission and display a validation error message directly below each empty mandatory field.
2. WHEN the user clears a mandatory field that previously contained data (via any input method including rapid typing, keyboard shortcuts, cut operations, or programmatic clearing), THE React_Web SHALL display the validation error message for that field immediately without requiring a form submission attempt.
3. WHEN the user attempts to submit any form and all mandatory fields contain values that satisfy their field-level validation rules (non-empty per criterion 1, and conforming to type constraints such as valid time ranges, valid URLs, or numeric bounds as defined per form), THE React_Web SHALL proceed with the form submission without displaying any validation errors.
4. THE React_Web SHALL display validation error messages as inline text below the associated field, styled in red text using the Planixor design system (Poppins font, theme-aware color), not as browser alert dialogs or toast notifications.
5. WHEN the user modifies a field that previously displayed a validation error (any keystroke, selection change, or value change in that field), THE React_Web SHALL remove the error message for that field immediately upon the input change event, regardless of whether the new value is valid.
6. WHEN the user attempts to submit a form with validation errors, THE React_Web SHALL scroll to and set focus on the first field (in DOM order) that has a validation error.
7. THE React_Web SHALL provide all validation error messages in the user's selected language (Spanish or English) using the application's i18n system, with no hardcoded user-facing strings.

---

### Requirement 9: Form Validation for Mandatory Fields (Android App)

**User Story:** As a user, I want to see clear error messages on all mandatory form fields when I attempt to submit a form with incomplete data on Android, so that I know exactly which fields require my attention.

#### Acceptance Criteria

1. WHEN the user attempts to submit any form and one or more mandatory fields are empty (null, blank, or contain only whitespace characters), THE Android_App SHALL prevent form submission, display a validation error message below each empty mandatory field using Material Design 3 text field error state, and scroll to the first field in error if it is not visible on screen.
2. WHEN the user attempts to submit any form and all mandatory fields contain valid data (non-empty after trimming whitespace, and conforming to field-specific format constraints such as numeric range for hours or valid URL format for server URL), THE Android_App SHALL proceed with the form submission without displaying any validation error messages.
3. THE Android_App SHALL display validation error messages using Material Design 3 text field error states with i18n-externalized error text in Spanish and English that identifies the specific validation failure (e.g., "Field required" for empty fields, "Invalid format" for format violations).
4. WHEN the user modifies the content of a field that currently displays a validation error and the field value becomes valid, THE Android_App SHALL remove the error message for that field immediately without requiring a new form submission attempt.
5. WHEN the user attempts to submit a form and a mandatory field contains a value that does not meet its format or range constraint (e.g., non-numeric value in a numeric field, URL without scheme in server URL field, hours value outside 0–8784 range), THE Android_App SHALL display a field-specific validation error message below that field indicating the nature of the constraint violation.
6. IF the user has not yet attempted to submit the form, THEN THE Android_App SHALL NOT display validation error messages on empty mandatory fields (validation triggers only on submit attempt, not on initial form display or field focus loss before first submission).
7. WHEN the user attempts to submit a form with validation errors, THE Android_App SHALL retain all user-entered data in all fields (both valid and invalid) so that the user can correct only the problematic fields without re-entering other data.

---

### Requirement 10: Replace Browser Alerts with Modals (React Web)

**User Story:** As a user, I want all application messages displayed in styled modals instead of browser alert dialogs, so that the user experience is consistent with the application's design language.

#### Acceptance Criteria

1. THE React_Web SHALL NOT use browser `alert()`, `confirm()`, or `prompt()` dialogs for any user-facing messages.
2. THE React_Web SHALL display all user messages using styled modal components categorized as: informational (success/info notifications), confirmation (actions requiring user decision), and error (operation failures), each rendered with Poppins font, 12px border-radius, and theme-aware colors (light mode: white background with `text-primary-light` text; dark mode: `surface-dark` background with `text-primary-dark` text).
3. THE React_Web informational and error modals SHALL support dismiss via a close button, overlay click, and the Escape key.
4. THE React_Web confirmation modals SHALL provide explicit confirm and cancel action buttons, display the name of the affected item in the message body, and SHALL NOT dismiss on overlay click or Escape key press (only explicit button action dismisses them).
5. WHEN a modal is displayed, THE React_Web SHALL trap keyboard focus within the modal until it is dismissed, and SHALL return focus to the triggering element on dismissal.
6. THE React_Web SHALL render all modal text content (titles, messages, button labels) using i18n-externalized strings supporting Spanish and English.
7. IF a modal is triggered while another modal is already visible, THEN THE React_Web SHALL queue the new modal and display it after the current modal is dismissed.

---

### Requirement 11: Display Application Version in Settings (React Web)

**User Story:** As a user, I want to see the current web application version on the Settings screen, so that I can identify which version I am running when reporting issues or checking for updates.

#### Acceptance Criteria

1. THE React_Web Settings_Screen SHALL display the application version number sourced from `package.json` at build time.
2. THE React_Web SHALL display the version at the bottom of the Settings_Screen, below all other settings sections.
3. THE React_Web SHALL display the version in the format "v{MAJOR}.{MINOR}.{PATCH}" (e.g., "v1.0.1") using Poppins Medium (500) font with `text-secondary` color (#6B7280 in light mode, #9CA3AF in dark mode).
4. THE React_Web SHALL update the displayed version automatically when the application is rebuilt with a new version number, without requiring manual code changes.

---

### Requirement 12: Display Application Version in Settings (Android App)

**User Story:** As a user, I want to see the current Android application version on the Settings screen, so that I can identify which version I am running when reporting issues or checking for updates.

#### Acceptance Criteria

1. THE Android_App Settings_Screen SHALL display the application version name sourced from `BuildConfig.VERSION_NAME`.
2. THE Android_App SHALL display the version at the bottom of the Settings_Screen, below all other settings sections.
3. THE Android_App SHALL display the version in the format "v{MAJOR}.{MINOR}.{PATCH}" (e.g., "v1.0.0") using Poppins Medium (500) font with `text-secondary` color (#6B7280 in light mode, #9CA3AF in dark mode).
4. THE Android_App SHALL update the displayed version automatically when the application is rebuilt with a new version number, without requiring manual code changes.

---

### Requirement 13: Update Android App Dependencies

**User Story:** As a developer, I want all project dependencies in the Android_App updated to their latest compatible versions including the Android Gradle Plugin and Kotlin version, so that the application benefits from performance improvements, security patches, and new features.

#### Acceptance Criteria

1. THE Android_App SHALL update all dependencies listed in `gradle/libs.versions.toml` to the latest stable release versions (excluding alpha, beta, RC, dev, and SNAPSHOT variants) when newer stable versions are available on the respective repositories.
2. WHEN a newer stable release version of the Android Gradle Plugin exists, THE Android_App SHALL update to that version.
3. WHEN a newer stable release version of Kotlin exists that is listed as compatible in the official Jetpack Compose-to-Kotlin compatibility map, THE Android_App SHALL update to that version.
4. BEFORE committing a dependency version update, THE Android_App build process SHALL verify the update compiles and passes tests. IF a dependency's latest stable version introduces a compilation error or test failure during this verification, THEN THE Android_App SHALL retain the highest stable version that compiles and passes tests.
5. WHEN dependencies are updated, THE Android_App SHALL build successfully with `./gradlew assembleDebug` completing with zero errors.
6. WHEN dependencies are updated, THE Android_App unit tests SHALL pass with `./gradlew testDebug` completing with zero failures.

---

### Requirement 14: Fix Android Sync After URL Field Merge

**User Story:** As a user, I want synchronization to work correctly on the Android app after the server URL and API base path fields were merged into a single field, so that my data syncs reliably across devices.

#### Acceptance Criteria

1. WHEN the user saves a server URL containing a path segment (e.g., `https://backend.planixor.com/api`), THE Android_App SHALL parse the URL into two components: `serverUrl` (scheme + host + port, e.g., `https://backend.planixor.com`) and `apiBasePath` (path segment, e.g., `/api`), and SHALL store both components in the SyncConfig.
2. WHEN the user saves a server URL without a path segment (e.g., `https://backend.planixor.com` or `https://backend.planixor.com/`), THE Android_App SHALL set `apiBasePath` to `/api` as the default value.
3. WHEN the DynamicBaseUrlInterceptor constructs an API endpoint URL, THE Android_App Sync_Service SHALL produce URLs matching the pattern `{serverUrl}{apiBasePath}/{entity-kebab}/sync/{action}` with exactly one slash between each segment and no double slashes in the path (trailing slashes on `serverUrl` or `apiBasePath` SHALL be trimmed before concatenation).
4. WHEN a sync cycle is triggered, THE Android_App Sync_Service SHALL include the `Authorization: Bearer {apiKey}` header on every push and pull request sent to the configured backend.
5. WHEN a sync cycle is triggered and the backend responds with HTTP 2xx for push and pull operations, THE Android_App Sync_Service SHALL update `syncedAt` on pushed records and update the client `lastSyncedAt` timestamp, confirming a successful sync cycle for each entity (calendar-events, notification-records, annual-hours-config, shifts, reminders).
6. IF the user enters a URL that is missing a scheme (no `https://` or `http://` prefix), contains whitespace, or cannot be parsed into a valid host, THEN THE Android_App SHALL display an error message indicating the URL format is invalid and SHALL NOT save the sync configuration or attempt sync operations.
7. IF the backend responds with a non-2xx HTTP status during a sync cycle for a specific entity, THEN THE Android_App Sync_Service SHALL continue syncing the remaining entities independently and SHALL NOT update `lastSyncedAt` for the failed entity.
