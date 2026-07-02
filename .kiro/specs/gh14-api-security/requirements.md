# Requirements Document

## Introduction

This feature secures all API endpoints (except `/api/status` and `/api/health`) with API key authentication. API keys are configured in `appsettings.json` under `SecuritySettings` as a dictionary mapping usernames to API keys. A scoped security service validates keys, stores the authenticated user for the request lifetime, and a validation endpoint allows frontends to verify their connection and retrieve the associated username.

## Glossary

- **Security_Service**: A scoped service responsible for validating API keys and storing the authenticated username for the duration of a request.
- **Authentication_Handler**: Middleware that intercepts requests to secured endpoints, extracts the API key from the Authorization header, and delegates validation to the Security_Service.
- **Validation_Endpoint**: An endpoint protected by API key authentication that returns the username linked to the provided API key.
- **API_Key**: A string token configured in `SecuritySettings` that grants access to secured endpoints.
- **SecuritySettings**: A configuration section in `appsettings.json` mapping usernames to their API keys.
- **Authorization_Header**: The HTTP request header (`Authorization`) that carries the API key with a `Bearer ` prefix.
- **Health_Endpoints**: The `/api/status` and `/api/health` endpoints that remain publicly accessible without authentication.
- **UserId**: The user identifier field present on all syncable entities, used to scope sync data to a specific user. Previously a GUID, now a string matching the username from SecuritySettings.
- **Syncable_Entities**: The set of entities that participate in cross-device synchronization: Shift, Reminder, CalendarEvent, AnnualHoursConfig, NotificationRecord.

## Requirements

### Requirement 1: Security Settings Configuration

**User Story:** As a developer, I want to configure API keys in `appsettings.json`, so that I can manage access credentials without code changes.

#### Acceptance Criteria

1. THE SecuritySettings configuration class SHALL expose a dictionary property of type `Dictionary<string, string>` mapping usernames (keys) to API keys (values).
2. WHEN the application starts, THE IoC container SHALL bind the `SecuritySettings` section from configuration to the SecuritySettings class using the IOptions pattern, making it injectable as `IOptions<SecuritySettings>`.
3. IF the `SecuritySettings` section is missing from configuration, empty (key exists but contains no entries), or contains zero entries, THEN THE application SHALL fail immediately during startup (before entering the running state) with an error message indicating the missing configuration section.
4. THE SecuritySettings configuration in `appsettings.Development.json` SHALL include a default entry with username `testuser` and API key `4f034mWW3AyTAbMnQ1hqcwjq6xUNaBjUrn5aIkeYpwELHRnh0j`.
5. IF a configured API key value is empty or whitespace, THEN THE application SHALL fail to start with an error message indicating the invalid entry.

### Requirement 2: Security Service

**User Story:** As a developer, I want a scoped security service that validates API keys and retrieves the associated username, so that authentication state is available throughout the request.

#### Acceptance Criteria

1. THE Security_Service SHALL provide a validation method that accepts an API key string and returns a boolean indicating whether the key exists among the SecuritySettings dictionary values (case-sensitive comparison).
2. WHEN a valid API key is provided to the validation method, THE Security_Service SHALL store the username whose dictionary entry matches that API key, making it available for retrieval during the same request scope.
3. WHEN an invalid API key is provided to the validation method, THE Security_Service SHALL return false and leave the stored username unset (this constraint is scoped to invocation of the validation method).
4. IF the validation method is called with a null or empty API key, THEN THE Security_Service SHALL return false without performing a dictionary lookup.
5. THE Security_Service SHALL expose a retrieval method that returns the stored username if validation succeeded in the current request, or null if no successful validation has occurred.
6. THE Security_Service SHALL be registered as a scoped service via the `IAppServiceScoped` marker interface.

### Requirement 3: Authentication Handler

**User Story:** As a developer, I want an authentication handler that validates the API key from incoming requests, so that secured endpoints reject unauthenticated or unauthorized access.

#### Acceptance Criteria

1. WHEN a request targets a secured endpoint, THE Authentication_Handler SHALL extract the API key from the Authorization header by removing the case-insensitive `Bearer ` prefix (scheme + single space).
2. IF no Authorization header is present on a request to a secured endpoint, THEN THE Authentication_Handler SHALL throw an UnauthorizedException.
3. IF the Authorization header is present but does not start with the `Bearer ` prefix (case-insensitive scheme followed by a single space), THEN THE Authentication_Handler SHALL throw an UnauthorizedException.
4. IF the extracted API key (the value after the `Bearer ` prefix) is empty or consists only of whitespace, THEN THE Authentication_Handler SHALL throw an UnauthorizedException.
5. IF the Security_Service reports the extracted API key as not valid, THEN THE Authentication_Handler SHALL throw a ForbiddenException.
6. WHEN the Security_Service confirms the extracted API key is valid, THE Authentication_Handler SHALL allow the request to continue through the pipeline.
7. WHEN a request targets the Health_Endpoints (`/api/status` or `/api/health`), THE Authentication_Handler SHALL allow the request without requiring an API key.

### Requirement 4: Validation Endpoint

**User Story:** As a frontend developer, I want a validation endpoint that confirms my API key is valid and returns the associated username, so that frontends can verify connectivity and store the username for later use.

#### Acceptance Criteria

1. THE Validation_Endpoint SHALL be accessible at the path `/api/validate` using the HTTP GET method.
2. THE Validation_Endpoint SHALL be protected by the Authentication_Handler (API key required in the request).
3. WHEN a request with a valid API key is received, THE Validation_Endpoint SHALL return an HTTP 200 response with content type `application/json` containing a JSON object with a `username` property of type string representing the authenticated username linked to that API key.
4. IF the request does not include an API key or includes an invalid API key, THEN the Authentication_Handler will reject the request before it reaches the endpoint (HTTP 401 or 403).
5. THE Validation_Endpoint SHALL NOT require a request body or query parameters beyond the API key provided via the Authorization header.

### Requirement 5: Endpoint Security Enforcement

**User Story:** As a system operator, I want all API endpoints (except health checks) to require authentication, so that unauthorized clients cannot access application data.

#### Acceptance Criteria

1. THE API SHALL require a valid API key, provided via the `Authorization: Bearer <key>` request header, on all endpoints except `/api/status` and `/api/health`.
2. WHEN a request without the Authorization header reaches a secured endpoint, THE API SHALL return HTTP status 401 (Unauthorized) with a response body containing an error message indicating that authentication credentials are missing.
3. WHEN a request includes the Authorization header but the API key value does not match any configured API key in SecuritySettings, THE API SHALL return HTTP status 403 (Forbidden) with a response body containing an error message indicating that the provided credentials are not authorized.
4. WHEN a request includes the Authorization header with a valid API key, THE API SHALL pass the request to the endpoint handler for normal processing.
5. THE authentication middleware SHALL execute before any endpoint handler logic, ensuring that no secured endpoint processes a request body or performs side effects when authentication fails.
6. THE API SHALL read API keys from application configuration (SecuritySettings section) and SHALL NOT contain any hardcoded key values in source code.

### Requirement 6: User Identification via Username

**User Story:** As a developer, I want the sync endpoints to identify users by the authenticated username from the API key, so that sync data is correctly scoped to the user without relying on external GUID-based identity.

#### Acceptance Criteria

1. THE `UserId` property on all Syncable_Entities (Shift, Reminder, CalendarEvent, AnnualHoursConfig, NotificationRecord) SHALL be of type `string` (not GUID), representing the username from SecuritySettings.
2. WHEN a sync push request is received on a secured endpoint, THE endpoint SHALL resolve the authenticated username from the Security_Service and assign it to the request's `UserId` property before processing.
3. WHEN a sync pull request is received on a secured endpoint, THE endpoint SHALL resolve the authenticated username from the Security_Service and use it as the `UserId` for querying data.
4. THE database column for `UserId` on all syncable entity tables SHALL be `varchar(50)` (not `char(36)`).
5. THE repository interfaces and implementations SHALL accept `string` (not `Guid`) for all `userId` parameters.
6. IF the Security_Service returns null for the authenticated username on a secured endpoint, THEN THE endpoint SHALL throw an UnauthorizedException.

### Requirement 7: MySQL Migration Compatibility Fix

**User Story:** As a developer, I want the existing database migrations to execute successfully on MySQL, so that the application can start without migration errors.

#### Acceptance Criteria

1. THE migration `20260617100000_MigrateCalendarEventToMultiDay` SHALL use MySQL-compatible syntax for dropping check constraints (using `ALTER TABLE ... DROP CHECK ...` instead of `ALTER TABLE ... DROP CONSTRAINT ...`).
2. WHEN the application starts and applies migrations, THE migration SHALL execute without errors on MySQL 8.0+.
3. THE fix SHALL be applied directly to the existing migration file (not as a new corrective migration), since the database will be recreated from scratch.
