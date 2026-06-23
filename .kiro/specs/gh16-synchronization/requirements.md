# Requirements Document

## Introduction

This feature implements synchronization configuration and management across both the React Web PWA and Android clients. It replaces the existing user avatar icon in the top navigation bar with a synchronization status button, provides a configuration screen for setting up server connectivity, and a synchronization management screen for monitoring and controlling sync operations. The synchronization configuration is device-local and never synchronized across devices.

## Glossary

- **Sync_Button**: The icon button displayed in the top navigation bar on both platforms that indicates the current synchronization state and provides access to synchronization screens.
- **Sync_Configuration_Screen**: The screen that allows users to input the server URL and API key for establishing a synchronization connection.
- **Sync_Screen**: The screen that displays synchronization status, configuration details, and allows pausing/resuming synchronization.
- **Sync_Service**: The background service on each client responsible for executing bidirectional data synchronization with the backend API.
- **Sync_Config**: The locally-stored configuration data containing the server URL, API key, linked username, and sync preferences. This data is never synchronized and remains exclusive to the device.
- **Validation_Endpoint**: The backend endpoint `GET /api/security/validate` secured with API key authentication that returns the linked username upon successful validation.
- **Connection_Status**: An enumeration representing the current state of the synchronization connection: unconfigured, active, failing, or paused.

## Requirements

### Requirement 1: Sync Button Replaces User Avatar

**User Story:** As a user, I want a synchronization status icon in the top navigation bar, so that I can see the current synchronization state at a glance.

#### Acceptance Criteria

1. THE Sync_Button SHALL replace the existing user avatar icon in the top navigation bar on both React Web PWA and Android platforms.
2. WHILE the Sync_Config is absent, THE Sync_Button SHALL display an icon indicating that synchronization has not been configured.
3. WHILE the Sync_Config is present and the connection to the synchronization server is active, THE Sync_Button SHALL display an icon indicating that synchronization is active.
4. WHILE the Sync_Config is present and the connection to the synchronization server is failing, THE Sync_Button SHALL display an icon indicating a connection failure.
5. WHILE the Sync_Service is paused, THE Sync_Button SHALL display an icon indicating that synchronization is paused.

### Requirement 2: Sync Button Navigation

**User Story:** As a user, I want to tap the sync button to access synchronization screens, so that I can configure or manage synchronization.

#### Acceptance Criteria

1. WHEN the user taps the Sync_Button and the Sync_Config is absent, THE application SHALL navigate to the Sync_Configuration_Screen.
2. WHEN the user taps the Sync_Button and the Sync_Config is present, THE application SHALL navigate to the Sync_Screen regardless of the Connection_Status.

### Requirement 3: Sync Configuration Screen — Layout

**User Story:** As a user, I want a configuration screen with URL and API key fields, so that I can set up synchronization with my server.

#### Acceptance Criteria

1. THE Sync_Configuration_Screen SHALL display a text input field for the server URL (e.g., backend.planixor.com).
2. THE Sync_Configuration_Screen SHALL display a text input field for the API key.
3. THE Sync_Configuration_Screen SHALL display a cancel button and a validate button.

### Requirement 4: Sync Configuration Screen — Cancel Action

**User Story:** As a user, I want to cancel configuration without saving, so that I can return to my previous activity without changes.

#### Acceptance Criteria

1. WHEN the user taps the cancel button on the Sync_Configuration_Screen, THE application SHALL clear the entered URL and API key values.
2. WHEN the user taps the cancel button on the Sync_Configuration_Screen, THE application SHALL navigate back to the previously open screen.

### Requirement 5: Sync Configuration Screen — Validate Action (Success)

**User Story:** As a user, I want to validate my configuration, so that I can confirm my server connection works before saving.

#### Acceptance Criteria

1. WHEN the user taps the validate button, THE application SHALL send a GET request to `{server_url}/api/security/validate` with the API key in the `Authorization: Bearer {apikey}` header.
2. WHEN the Validation_Endpoint returns HTTP status code 200, THE application SHALL extract the username from the response body.
3. WHEN the Validation_Endpoint returns HTTP status code 200, THE application SHALL persist the server URL, API key, and linked username in the Sync_Config on the local device.
4. WHEN the Validation_Endpoint returns HTTP status code 200, THE application SHALL navigate to the Sync_Screen.

### Requirement 6: Sync Configuration Screen — Validate Action (Failure)

**User Story:** As a user, I want clear feedback when validation fails, so that I can correct my configuration and retry.

#### Acceptance Criteria

1. IF the Validation_Endpoint returns a status code other than 200, THEN THE application SHALL display a message indicating that the connection was not possible and asking the user to review the configuration and retry validation.
2. IF the Validation_Endpoint returns a status code other than 200, THEN THE application SHALL keep the cancel and validate buttons active.
3. IF the Validation_Endpoint returns a status code other than 200, THEN THE application SHALL retain the entered URL and API key values in the input fields.

### Requirement 7: Sync Configuration Data Locality

**User Story:** As a user, I want my synchronization configuration to remain private to my device, so that it is not shared with other devices.

#### Acceptance Criteria

1. THE application SHALL store the Sync_Config exclusively in the local device storage (IndexedDB for React Web PWA, SQLite for Android).
2. THE Sync_Config SHALL NOT be included in any synchronization push or pull operations.

### Requirement 8: Sync Screen — Display Information

**User Story:** As a user, I want to see my synchronization details, so that I can monitor the current state of synchronization.

#### Acceptance Criteria

1. THE Sync_Screen SHALL display the configured server URL.
2. THE Sync_Screen SHALL display the configured API key.
3. THE Sync_Screen SHALL display the linked username.
4. THE Sync_Screen SHALL display the date of the last synchronization.
5. THE Sync_Screen SHALL display the current Connection_Status.

### Requirement 9: Sync Screen — Configuration Button

**User Story:** As a user, I want to modify my synchronization configuration, so that I can update the server URL or API key when needed.

#### Acceptance Criteria

1. THE Sync_Screen SHALL display a configuration button.
2. WHEN the user taps the configuration button on the Sync_Screen, THE application SHALL navigate to the Sync_Configuration_Screen with the current URL and API key pre-populated in the input fields.
3. IF the current URL or API key cannot be retrieved from local storage, THEN THE application SHALL navigate to the Sync_Configuration_Screen with the corresponding input fields empty.

### Requirement 10: Sync Screen — Pause and Resume

**User Story:** As a user, I want to pause and resume synchronization, so that I can temporarily stop data transfer when needed.

#### Acceptance Criteria

1. THE Sync_Screen SHALL display a button to pause synchronization when the Sync_Service is active.
2. THE Sync_Screen SHALL display a button to resume synchronization when the Sync_Service is paused.
3. WHEN the user taps the pause button, THE Sync_Service SHALL stop sending and receiving data until resumed.
4. WHEN the user taps the resume button, THE Sync_Service SHALL resume sending and receiving data.
5. WHILE the Sync_Service is paused, THE Sync_Button in the top navigation bar SHALL reflect the paused state.

### Requirement 11: Cross-Platform Consistency

**User Story:** As a user, I want the synchronization feature to behave identically on both platforms, so that I have a consistent experience regardless of the device I use.

#### Acceptance Criteria

1. THE React Web PWA SHALL implement the Sync_Button, Sync_Configuration_Screen, and Sync_Screen with identical behavior to the Android application.
2. THE Android application SHALL implement the Sync_Button, Sync_Configuration_Screen, and Sync_Screen with identical behavior to the React Web PWA.

### Requirement 12: Sync Configuration Screen — Input Validation

**User Story:** As a user, I want the configuration form to validate my input before attempting to connect, so that I receive immediate feedback on incomplete entries.

#### Acceptance Criteria

1. IF the server URL field is empty when the user taps validate, THEN THE application SHALL display a validation message indicating the URL is required.
2. IF the API key field is empty when the user taps validate, THEN THE application SHALL display a validation message indicating the API key is required.
3. WHILE the validation request is in progress, THE validate button SHALL be disabled to prevent duplicate requests.

### Requirement 13: Internationalization

**User Story:** As a user, I want synchronization screens to respect the application language setting, so that all text appears in my chosen language.

#### Acceptance Criteria

1. THE Sync_Configuration_Screen SHALL display all labels, placeholders, and messages using externalized i18n strings in both Spanish and English.
2. THE Sync_Screen SHALL display all labels, status messages, and button text using externalized i18n strings in both Spanish and English.
3. THE validation error messages SHALL use externalized i18n strings in both Spanish and English.
