# Implementation Plan: API Security (API Key Authentication)

## Overview

This plan implements API key authentication for the Planixor backend API. The implementation follows a strict order: fix the MySQL migration first (unblocks app startup), then build the security infrastructure (settings, service, handler), wire everything up, add the validation endpoint, refactor UserId from Guid to string across all syncable entities, create the database migration for the column type change, and finally update sync endpoints to resolve the authenticated username.

TDD is mandatory for SecurityService and ApiKeyAuthenticationHandler — tests are written FIRST, then implementation.

## Tasks

- [x] 1. Fix MySQL migration compatibility
  - [x] 1.1 Fix DROP CHECK constraint syntax in existing migration
    - In `Codenized.Planixor.Persistence.MySql.Efc.DataContext/Migrations/20260617100000_MigrateCalendarEventToMultiDay.cs`, replace `migrationBuilder.DropCheckConstraint(name: "CK_CalendarEvents_EndTimeAfterStartTime", table: "CalendarEvents")` with `migrationBuilder.Sql("ALTER TABLE \`CalendarEvents\` DROP CHECK \`CK_CalendarEvents_EndTimeAfterStartTime\`;");`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Implement SecuritySettings configuration
  - [x] 2.1 Create SecuritySettings class in Core/Settings
    - Create `Codenized.Planixor.Core/Settings/SecuritySettings.cs` with `Dictionary<string, string> ApiKeys` property
    - _Requirements: 1.1_
  - [x] 2.2 Register SecuritySettings with validation in DependencyContainer
    - In `Codenized.Planixor.IoC/DependencyContainer.cs`, add `AddOptions<SecuritySettings>().Bind(...).Validate(...).ValidateOnStart()` in the `MapSettings` method
    - Validate that ApiKeys is not null, not empty, and contains no whitespace-only values
    - _Requirements: 1.2, 1.3, 1.5_
  - [x] 2.3 Add SecuritySettings section to appsettings.Development.json
    - Add `"SecuritySettings": { "ApiKeys": { "testuser": "4f034mWW3AyTAbMnQ1hqcwjq6xUNaBjUrn5aIkeYpwELHRnh0j" } }` to the configuration file
    - _Requirements: 1.4_

- [x] 3. Implement ISecurityService interface and SecurityService (TDD)
  - [x] 3.1 Create ISecurityService interface in Core/Services/Security
    - Create folder `Codenized.Planixor.Core/Services/Security/` and file `ISecurityService.cs`
    - Define `bool ValidateAPIKey(string apiKey)` and `string? GetAuthenticatedUsername()` methods
    - _Requirements: 2.1, 2.5_
  - [x] 3.2 Write unit tests for SecurityService (TDD — write tests FIRST)
    - Create `UnitTest.Codenized.Planixor/Security/Services/SecurityServiceTests.cs`
    - Tests: `ValidateAPIKey_WithValidKey_ReturnsTrue`, `ValidateAPIKey_WithInvalidKey_ReturnsFalse`, `ValidateAPIKey_WithNullOrEmpty_ReturnsFalse`, `ValidateAPIKey_WithValidKey_StoresUsername`, `GetAuthenticatedUsername_BeforeValidation_ReturnsNull`, `ValidateAPIKey_CaseSensitive_ReturnsFalseForDifferentCase`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 3.3 Implement SecurityService in Services/Security
    - Create folder `Codenized.Planixor.Services/Security/` and file `SecurityService.cs`
    - Implement `ISecurityService, IAppServiceScoped` — scoped lifetime, case-sensitive comparison, stores matched username
    - All tests from 3.2 must pass
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Implement ApiKeyAuthenticationHandler (TDD)
  - [x] 4.1 Write unit tests for ApiKeyAuthenticationHandler (TDD — write tests FIRST)
    - Create `UnitTest.Codenized.Planixor/Security/Authentication/ApiKeyAuthenticationHandlerTests.cs`
    - Tests: `HandleAuthenticateAsync_NoAuthorizationHeader_ThrowsUnauthorizedException`, `HandleAuthenticateAsync_InvalidPrefix_ThrowsUnauthorizedException`, `HandleAuthenticateAsync_EmptyToken_ThrowsUnauthorizedException`, `HandleAuthenticateAsync_InvalidApiKey_ThrowsForbiddenException`, `HandleAuthenticateAsync_ValidApiKey_ReturnsSuccessWithUsernameClaim`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 4.2 Implement ApiKeyAuthenticationHandler in Api/Authentication
    - Create folder `Codenized.Planixor.Api/Authentication/` and file `ApiKeyAuthenticationHandler.cs`
    - Inherit from `AuthenticationHandler<AuthenticationSchemeOptions>`, inject `ISecurityService`
    - Throw `UnauthorizedException` for missing/malformed header, `ForbiddenException` for invalid key
    - On success, create `ClaimsPrincipal` with username as `ClaimTypes.Name` claim
    - All tests from 4.1 must pass
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Wire up authentication in Program.cs and DependencyContainer
  - [x] 5.1 Register authentication scheme in DependencyContainer
    - Add `services.AddAuthentication("ApiKey").AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>("ApiKey", null)` in `ConfigureApplication`
    - Add required `using` statements and project reference to Api project if needed
    - _Requirements: 5.1, 5.5_
  - [x] 5.2 Add authentication and authorization middleware in Program.cs
    - Add `app.UseAuthentication()` and `app.UseAuthorization()` after `app.UseApiGlobalExceptionStrategy()` and before endpoint registration
    - _Requirements: 5.1, 5.4, 5.5_

- [x] 6. Checkpoint - Verify security infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement validation endpoint
  - [x] 7.1 Create SecurityRegisterEndpoints in Api/Endpoints/Security
    - Create folder `Codenized.Planixor.Api/Endpoints/Security/` and file `SecurityRegisterEndpoints.cs`
    - Map GET `/api/security/validate` protected by `.RequireAuthorization()` returning `{ username }` from `ISecurityService.GetAuthenticatedUsername()`
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - [x] 7.2 Register security endpoints in RegisterEndpoints.cs
    - Add `app.MapSecurityEndpoints(apiBasePath)` to `UseAppEndpoints` in `Codenized.Planixor.Api/Endpoints/RegisterEndpoints.cs`
    - _Requirements: 4.1, 4.2_

- [x] 8. Refactor UserId from Guid to string across entities and DTOs
  - [x] 8.1 Change UserId type in all entity classes
    - Update `UserId` property from `Guid` to `string` (with `= string.Empty`) in: `Shift.cs`, `Reminder.cs`, `CalendarEvent.cs`, `AnnualHoursConfig.cs`, `NotificationRecord.cs`
    - Update factory methods (`Create`, `CreateFromSync`) parameter type from `Guid userId` to `string userId`
    - _Requirements: 6.1_
  - [x] 8.2 Change UserId type in all sync DTOs
    - Update `ShiftSyncPullRequest`, `ShiftSyncPushRequest` and equivalents for Reminder, CalendarEvent, AnnualHoursConfig, NotificationRecord — change `Guid UserId` to `string UserId`
    - _Requirements: 6.1_
  - [x] 8.3 Change userId parameter type in all repository interfaces and implementations
    - Update all repository interfaces (e.g., `IShiftSyncPushCommands`, `IShiftSyncPullQueries`) and their implementations to accept `string userId` instead of `Guid userId`
    - _Requirements: 6.5_
  - [x] 8.4 Update EF Core entity configurations for UserId column type
    - Change `HasColumnType("char(36)")` to `HasColumnType("varchar(50)")` in all entity configuration files: `ShiftConfiguration.cs`, `ReminderConfiguration.cs`, `CalendarEventConfiguration.cs`, `AnnualHoursConfigConfiguration.cs`, `NotificationRecordConfiguration.cs`
    - _Requirements: 6.4_

- [x] 9. Checkpoint - Verify UserId refactor compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Create database migration for UserId column type change
  - [x] 10.1 Add new EF Core migration for UserId varchar(50)
    - Generate a new migration that alters `UserId` column from `char(36)` to `varchar(50)` on all affected tables (Shifts, Reminders, CalendarEvents, AnnualHoursConfigs, NotificationRecords)
    - If auto-generation is not possible, create a manual migration with raw SQL `ALTER TABLE ... MODIFY COLUMN UserId VARCHAR(50) NOT NULL` for each table
    - _Requirements: 6.4_

- [x] 11. Update sync endpoints to use SecurityService for username resolution
  - [x] 11.1 Update Shift sync endpoints
    - In `ShiftRegisterEndpoints.cs`: inject `ISecurityService`, replace TODO comments with `request.UserId = securityService.GetAuthenticatedUsername() ?? throw new UnauthorizedException(...)` for push, and construct pull request with the resolved username
    - _Requirements: 6.2, 6.3, 6.6_
  - [x] 11.2 Update Reminder sync endpoints
    - In `ReminderRegisterEndpoints.cs`: inject `ISecurityService`, replace TODO comments with username resolution from SecurityService
    - _Requirements: 6.2, 6.3, 6.6_
  - [x] 11.3 Update CalendarEvent sync endpoints
    - In `CalendarEventRegisterEndpoints.cs`: inject `ISecurityService`, replace TODO comments with username resolution from SecurityService
    - _Requirements: 6.2, 6.3, 6.6_
  - [x] 11.4 Update AnnualHoursConfig sync endpoints
    - In `AnnualHoursConfigRegisterEndpoints.cs`: inject `ISecurityService`, replace TODO comments with username resolution from SecurityService
    - _Requirements: 6.2, 6.3, 6.6_
  - [x] 11.5 Update NotificationRecord sync endpoints
    - In `NotificationRecordRegisterEndpoints.cs`: inject `ISecurityService`, replace TODO comments with username resolution from SecurityService
    - _Requirements: 6.2, 6.3, 6.6_

- [x] 12. Final checkpoint - Build and test verification
  - Ensure all tests pass and `dotnet build` succeeds for the entire solution, ask the user if questions arise.

## Notes

- TDD is mandatory for SecurityService (task 3.2 → 3.3) and ApiKeyAuthenticationHandler (task 4.1 → 4.2) — tests are written FIRST
- No property-based tests (FsCheck) — only standard unit tests with NUnit + NSubstitute
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- The implementation order ensures each step unblocks the next: migration fix → settings → service → handler → wiring → endpoint → refactor → migration → endpoints update
- Health endpoints (`/api/status`, `/api/health`) remain public — they use `MapHealthChecksEndpoint()` without `.RequireAuthorization()`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["5.1", "5.2", "7.1"] },
    { "id": 6, "tasks": ["7.2"] },
    { "id": 7, "tasks": ["8.1", "8.2"] },
    { "id": 8, "tasks": ["8.3", "8.4"] },
    { "id": 9, "tasks": ["10.1"] },
    { "id": 10, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] }
  ]
}
```
