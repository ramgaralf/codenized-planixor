# Implementation Plan: Bootstrap Projects

## Overview

Scaffold the three sub-projects of the Codenized Planixor monorepo from scratch: a .NET 10 backend solution with Clean Architecture (11 projects, 5 tiers), a React TypeScript PWA with Vite/Tailwind/full tooling, and an Android Kotlin native app with Jetpack Compose/Hilt/Retrofit. Each sub-project must be fully buildable and self-contained. The monorepo root gets a `.gitignore` and `README.md`.

## Tasks

- [x] 1. Set up monorepo root and backend solution structure
  - [x] 1.1 Create monorepo root configuration
    - Create root-level `.gitignore` with OS patterns (`.DS_Store`, `Thumbs.db`, `*~`) and IDE directories (`.idea/`, `.vscode/`, `*.suo`, `*.user`)
    - Create root-level `README.md` listing each sub-project with directory path, technology stack, and build command
    - Create directory structure: `backend/`, `frontend/react-web/`, `frontend/android-app/`
    - _Requirements: 4.1, 4.3, 4.5, 4.7_

  - [x] 1.2 Create backend solution file and project scaffolding
    - Create `backend/Codenized.Planixor.slnx` with 11 projects in 5 solution folders (`Enterprise Business Rules`, `Application Business Rules`, `Interface Adapters`, `Frameworks and Drivers`, `Tests`) and `docker-compose.dcproj` at solution root
    - Create all 11 `.csproj` files under `backend/src/` targeting `net10.0` with correct project references enforcing Clean Architecture dependency direction
    - Create `backend/.editorconfig` and `backend/stylecop.json` linked as AdditionalFiles in all projects
    - Create `backend/.gitignore` excluding `bin/`, `obj/`, `.vs/`, `.idea/`, `*.user`
    - Configure all projects to generate XML documentation, treat warnings as errors, and reference StyleCop.Analyzers 1.1.118
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 1.10, 1.19, 1.20, 1.21_

- [x] 2. Implement backend Tier 1 and Tier 2 projects
  - [x] 2.1 Implement Core project (Tier 1 - Enterprise Business Rules)
    - Create `Codenized.Planixor.Core` class library with no project references
    - Create `Settings/AppSettings.cs` with properties: ProductName (string, max 50), ServiceName (string, max 50), Version (string), Environment (string), SwaggerEnabled (bool), ApiBasePath (string), HttpClientTimeoutInSeconds (int, default 100)
    - _Requirements: 1.9, 1.14_

  - [x] 2.2 Implement Dtos project (Tier 2)
    - Create `Codenized.Planixor.Dtos` class library referencing only Core
    - Add placeholder structure for future DTOs
    - _Requirements: 1.2, 1.9_

  - [x] 2.3 Implement Events project (Tier 2)
    - Create `Codenized.Planixor.Events` class library referencing only Core
    - Add placeholder structure for future domain events
    - _Requirements: 1.2, 1.9_

  - [x] 2.4 Implement UseCases project (Tier 2)
    - Create `Codenized.Planixor.UseCases` class library referencing only Core
    - Add placeholder structure for future use case interfaces and implementations
    - _Requirements: 1.2, 1.9_

- [x] 3. Implement backend Tier 3 projects (Interface Adapters)
  - [x] 3.1 Implement Services project
    - Create `Codenized.Planixor.Services` class library referencing Core, Dtos, Events, UseCases
    - Add placeholder structure for service implementations
    - _Requirements: 1.2, 1.9_

  - [x] 3.2 Implement Persistence.MySql.Efc.DataContext project
    - Create class library referencing Core with EF Core packages (Microsoft.EntityFrameworkCore 10.0.7, Pomelo.EntityFrameworkCore.MySql)
    - Create `IApplicationContext.cs` interface, `ApplicationReadContext.cs`, `ApplicationWriteContext.cs`, `MigrationContext.cs`, `MigrationContextFactory.cs`, and `DataContextGuards.cs`
    - _Requirements: 1.2, 1.9, 1.15, 1.19_

  - [x] 3.3 Implement Persistence.MySql.Efc.Repositories project
    - Create class library referencing Core, DataContext
    - Add placeholder structure for repository implementations
    - _Requirements: 1.2, 1.9_

  - [x] 3.4 Implement Persistence.IoC project
    - Create class library referencing Core, DataContext, Repositories
    - Create `DependencyContainer.cs` with `AddCleanArchitecturePersistence()` extension method wiring DbContexts and repositories
    - _Requirements: 1.2, 1.9, 1.16_

- [x] 4. Implement backend Tier 4 projects (Frameworks and Drivers)
  - [x] 4.1 Implement IoC project
    - Create class library referencing Core, Dtos, Events, UseCases, Services, Persistence.IoC
    - Create `DependencyContainer.cs` with `AddCleanArchitecture()` extension method wiring health checks, HTTP client, and all Clean Architecture services
    - _Requirements: 1.2, 1.9, 1.16_

  - [x] 4.2 Implement Api project
    - Create ASP.NET Core Web API project referencing IoC
    - Create `Program.cs` with CORS (allow any origin for local dev), OpenAPI, camelCase JSON via System.Text.Json, `UseApiGlobalExceptionStrategy()`, and endpoint registration
    - Create `Endpoints/RegisterEndpoints.cs` mapping health check endpoint via `MapHealthChecksEndpoint(configuration, apiBasePath)`
    - Create `appsettings.json` with Logging, ConnectionStrings (read/write keys), Kestrel, and AppSettings sections
    - Create `Properties/launchSettings.json` with HTTP, Docker container, and Docker Compose profiles
    - Create `Dockerfile` with multi-stage build using `mcr.microsoft.com/dotnet/sdk:10.0` and `mcr.microsoft.com/dotnet/aspnet:10.0`
    - _Requirements: 1.2, 1.6, 1.9, 1.11, 1.12, 1.13, 1.17, 1.18, 1.19_

  - [x] 4.3 Create Docker Compose configuration
    - Create `backend/docker-compose.yml` and `backend/docker-compose.override.yml` configured to build and run the Api container, mapping host port 80 to container port 80
    - Create `backend/docker-compose.dcproj` for Visual Studio Docker Compose support
    - _Requirements: 1.7, 1.8_

- [x] 5. Implement backend Tier 5 (Tests) and verify build
  - [x] 5.1 Implement UnitTest project
    - Create `UnitTest.Codenized.Planixor` test project referencing NUnit 4.*, NSubstitute 5.*, and relevant source projects
    - Create one minimal passing NUnit test to verify test infrastructure works
    - _Requirements: 1.2, 1.19_

  - [x]* 5.2 Verify backend builds with zero errors and zero warnings
    - Run `dotnet build` in `backend/` and confirm zero errors and zero warnings
    - Run `dotnet test` in `backend/` and confirm the placeholder test passes
    - _Requirements: 1.3, 1.4, 1.20_

- [x] 6. Checkpoint - Backend solution complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Scaffold React TypeScript PWA project structure
  - [x] 7.1 Create package.json and install dependencies
    - Create `frontend/react-web/package.json` with all dependencies at specified semver ranges: react ^19.*, react-dom ^19.*, typescript ~5.9.*, vite (rolldown-vite) ^7.*, tailwindcss ^4.*, @tailwindcss/vite ^4.*, vitest ^3.*, @testing-library/react ^16.*, @testing-library/user-event ^14.*, @playwright/test ^1.*, eslint ^9.*, typescript-eslint ^8.*, eslint-plugin-sonarjs ^3.*, eslint-plugin-jsx-a11y ^6.*, zod ^4.*, @sentry/react ^10.*
    - Configure pnpm as package manager
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Create Vite and TypeScript configuration
    - Create `vite.config.ts` with path aliases (`@/` → `./src`, `@features/` → `./src/features`, `@shared/` → `./src/shared`, `@context/` → `./src/context`), `@vitejs/plugin-react`, and `@tailwindcss/vite` plugins
    - Create `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` with strict mode, matching path aliases, and test file exclusions in `tsconfig.app.json`
    - _Requirements: 2.5, 2.6_

  - [x] 7.3 Create ESLint, Prettier, and quality tooling configuration
    - Create `eslint.config.js` flat config with @eslint/js, typescript-eslint, react-hooks, react-refresh, sonarjs (cognitive-complexity max 15), jsx-a11y, and prettier
    - Create `.prettierrc` with print width, tab width, quotes, trailing comma, and semicolon preferences
    - _Requirements: 2.4, 2.8, 2.9_

  - [x] 7.4 Create project source structure and entry files
    - Create feature-based folder structure: `src/features/`, `src/shared/`, `src/context/`, `src/infrastructure/`, `src/pages/`, `src/assets/`, `src/test/`
    - Create `src/App.tsx` root component, `src/main.tsx` entry point, `src/index.css` with `@import "tailwindcss"` directive
    - Create `.env.example` with API base URL and Sentry DSN placeholder keys
    - Create `.gitignore` excluding `node_modules/`, `dist/`, `.env` (not `.env.example`), IDE directories
    - _Requirements: 2.10, 2.11, 2.12, 2.13, 2.14_

- [x] 8. Configure React Web testing, i18n, and Git hooks
  - [x] 8.1 Configure Vitest and Playwright
    - Create `vitest.config.ts` with React Testing Library support
    - Create `src/test/setup.ts` initializing `@testing-library/jest-dom` matchers
    - Create one minimal passing test to verify test infrastructure
    - Create `e2e/` directory with `playwright.config.ts` and `e2e/pages/` for Page Object Models
    - _Requirements: 2.7, 2.15, 2.16_

  - [x] 8.2 Configure i18n infrastructure
    - Install i18n library (react-i18next + i18next) as dependencies
    - Create locale resource files for Spanish (`es`) and English (`en`)
    - Configure Spanish as default language with English as fallback
    - _Requirements: 2.17_

  - [x] 8.3 Configure Husky and quality scripts
    - Configure Husky with pre-commit hook (lint + typecheck) and pre-push hook (tests + build)
    - Add `quality` script to package.json running lint, typecheck, and unit tests sequentially
    - _Requirements: 2.18, 2.19_

  - [x]* 8.4 Verify React Web project builds and passes quality gates
    - Run `pnpm install` and confirm success
    - Run `pnpm run build` and confirm zero TypeScript errors
    - Run `pnpm run lint` and confirm zero ESLint errors
    - Run `pnpm vitest --run` and confirm tests pass
    - _Requirements: 2.3, 2.4, 2.15, 2.19_

- [x] 9. Checkpoint - React Web project complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Scaffold Android Kotlin native application
  - [x] 10.1 Create Gradle project structure and configuration
    - Create `frontend/android-app/build.gradle.kts` (root) with `android.application`, `kotlin.android`, `kotlin.compose` plugins declared
    - Create `frontend/android-app/settings.gradle.kts` and `gradle.properties` with compile SDK 36, target SDK 36, min SDK 26, JVM target 11
    - Create `frontend/android-app/gradle/libs.versions.toml` version catalog (AGP 8.12, Kotlin 2.0, Compose BOM 2024.09.00, Retrofit 2.11, OkHttp 4.12, Coroutines 1.10)
    - Create Gradle wrapper files (`gradlew`, `gradlew.bat`, `gradle/wrapper/`)
    - Create `frontend/android-app/.gitignore` excluding Gradle build artifacts, IDE files, generated code
    - _Requirements: 3.1, 3.2, 3.9, 3.14_

  - [x] 10.2 Create app module build configuration
    - Create `frontend/android-app/app/build.gradle.kts` with all dependencies from version catalog, Hilt plugin, Compose configuration
    - Create `frontend/android-app/app/proguard-rules.pro` for release builds
    - _Requirements: 3.1, 3.10, 3.15_

  - [x] 10.3 Implement Android application core (MainActivity, Application, Manifest)
    - Create `AndroidManifest.xml` with application name pointing to Hilt Application class, single activity, and internet permission
    - Create `PlanixorApplication.kt` with `@HiltAndroidApp` annotation
    - Create `MainActivity.kt` with `@AndroidEntryPoint` annotation, using Compose `setContent` with `PlanixorTheme` wrapper
    - _Requirements: 3.4, 3.10_

  - [x] 10.4 Implement MVVM package structure and theme
    - Create package structure: `domain/`, `data/`, `ui/`, `di/` under `com.codenized.planixor`
    - Create `ui/theme/Color.kt`, `ui/theme/Theme.kt` (defining `PlanixorTheme` composable), `ui/theme/Type.kt` with Material Design 3 configuration
    - Create `ui/navigation/AppNavigation.kt` with `NavHost`, start destination, and at least one route
    - _Requirements: 3.5, 3.6, 3.7_

  - [x] 10.5 Implement Hilt DI modules and networking
    - Create `di/NetworkModule.kt` Hilt `@Module` providing configured `Retrofit` instance (placeholder base URL) and `OkHttpClient` with logging interceptor
    - Create `data/connectivity/ConnectivityChecker.kt` utility for network availability checks
    - _Requirements: 3.10, 3.11, 3.12_

  - [x] 10.6 Create i18n string resources
    - Create `res/values/strings.xml` (English) with at minimum `app_name` string resource
    - Create `res/values-es/strings.xml` (Spanish) with at minimum `app_name` string resource
    - _Requirements: 3.8_

  - [x] 10.7 Create unit test scaffold
    - Create at least 1 JUnit unit test in `app/src/test/` to verify test infrastructure works
    - _Requirements: 3.13_

  - [x]* 10.8 Verify Android project builds successfully
    - Run `./gradlew assembleDebug` and confirm zero errors and APK produced
    - Run `./gradlew test` and confirm unit test passes
    - _Requirements: 3.3, 3.13_

- [x] 11. Final checkpoint - All sub-projects complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional verification tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each sub-project is complete
- No property-based tests are included — this is a scaffolding feature where smoke tests and build verification are the appropriate testing approach
- All code, comments, and documentation must be in English per requirement 4.5
- User-facing strings must be externalized for i18n (Spanish default, English fallback) per requirement 4.6
- Each sub-project must be fully self-contained with no cross-project references per requirement 4.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.1", "10.1"] },
    { "id": 1, "tasks": ["1.2", "7.2", "10.2"] },
    { "id": 2, "tasks": ["2.1", "7.3", "7.4", "10.3"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "8.1", "8.2", "10.4"] },
    { "id": 4, "tasks": ["3.1", "8.3", "10.5", "10.6"] },
    { "id": 5, "tasks": ["3.2", "3.3", "3.4", "8.4", "10.7"] },
    { "id": 6, "tasks": ["4.1", "10.8"] },
    { "id": 7, "tasks": ["4.2", "4.3"] },
    { "id": 8, "tasks": ["5.1"] },
    { "id": 9, "tasks": ["5.2"] }
  ]
}
```
