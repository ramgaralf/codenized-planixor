# Requirements Document

## Introduction

This document defines the requirements for bootstrapping the three sub-projects of the Codenized Planixor monorepo. The workspace is currently empty (greenfield). The goal is to scaffold a fully buildable .NET 10 backend solution, a React TypeScript PWA project, and an Android Kotlin native application — each self-contained and following the architecture defined in the project steering files.

## Glossary

- **Backend_Solution**: The .NET 10 solution located at `backend/`, containing 11 projects organized in Clean Architecture tiers, a Docker Compose setup, and a unit test project.
- **React_Web_Project**: The React TypeScript Progressive Web App located at `frontend/react-web/`, scaffolded with Vite, Tailwind CSS v4, and the full tooling stack (ESLint, Prettier, Vitest, Playwright).
- **Android_App_Project**: The Android Kotlin native application located at `frontend/android-app/`, using Jetpack Compose, MVVM architecture, Hilt DI, and Retrofit networking.
- **Scaffolding**: The process of generating the initial project structure, configuration files, and boilerplate code so that each sub-project compiles and runs successfully.
- **Solution_File**: The `.slnx` file that defines the .NET solution structure, project references, and solution folders.
- **Version_Catalog**: The `gradle/libs.versions.toml` file that centralizes all dependency versions for the Android project.
- **Docker_Compose**: The container orchestration configuration (`docker-compose.yml` and `docker-compose.override.yml`) for local development of the backend.
- **Quality_Gate**: The set of lint, typecheck, and test commands that must pass with zero errors before code is committed.

## Requirements

### Requirement 1: Scaffold the Backend .NET 10 Solution

**User Story:** As a developer, I want a fully configured .NET 10 solution with Clean Architecture structure, so that I can immediately begin implementing business features without manual project setup.

#### Acceptance Criteria

1. WHEN the scaffolding process completes, THE Backend_Solution SHALL contain a valid `Codenized.Planixor.slnx` solution file with 11 projects organized into 5 solution folders (`Enterprise Business Rules`, `Application Business Rules`, `Interface Adapters`, `Frameworks and Drivers`, `Tests`).
2. WHEN the scaffolding process completes, THE Backend_Solution SHALL contain the following projects: `Codenized.Planixor.Core`, `Codenized.Planixor.Dtos`, `Codenized.Planixor.Events`, `Codenized.Planixor.UseCases`, `Codenized.Planixor.Services`, `Codenized.Planixor.Persistence.MySql.Efc.DataContext`, `Codenized.Planixor.Persistence.MySql.Efc.Repositories`, `Codenized.Planixor.Persistence.IoC`, `Codenized.Planixor.IoC`, `Codenized.Planixor.Api`, and `UnitTest.Codenized.Planixor`.
3. THE Backend_Solution SHALL compile successfully using `dotnet build` targeting `net10.0` with zero errors.
4. WHEN `dotnet build` is executed, THE Backend_Solution SHALL produce zero StyleCop analyzer warnings for the initial scaffolded code.
5. THE Backend_Solution SHALL include an `.editorconfig` file and a `stylecop.json` file linked to all projects as additional files.
6. WHEN the Api project is started and an HTTP GET request is sent to `{ApiBasePath}/health`, THE Backend_Solution SHALL return an HTTP 200 response indicating the application health status.
7. THE Backend_Solution SHALL include `docker-compose.yml` and `docker-compose.override.yml` files configured to build and run the Api project container, mapping host port 80 to container port 80.
8. THE Backend_Solution SHALL include a `docker-compose.dcproj` file placed directly under the `<Solution>` node in the `.slnx` file, outside any solution folder.
9. WHEN a project references another project, THE Backend_Solution SHALL follow the dependency direction defined by Clean Architecture: Tier 1 (`Core`) has no project references; Tier 2 (`Dtos`, `Events`, `UseCases`) may reference only Tier 1; Tier 3 (`Services`, `DataContext`, `Repositories`, `Persistence.IoC`) may reference Tiers 1 and 2; Tier 4 (`IoC`, `Api`) may reference Tiers 1 through 3; Tier 5 (`UnitTest`) may reference any tier.
10. THE Backend_Solution SHALL include a `.gitignore` file configured to exclude .NET build artifacts (`bin/`, `obj/`), IDE files (`.vs/`, `.idea/`, `*.user`), and user-specific settings.
11. THE Backend_Solution SHALL include a `Dockerfile` in the Api project configured for multi-stage build using `mcr.microsoft.com/dotnet/sdk:10.0` as the build image and `mcr.microsoft.com/dotnet/aspnet:10.0` as the runtime base image.
12. THE Backend_Solution SHALL include `appsettings.json` with the following sections: `Logging` (log level configuration), `ConnectionStrings` (read and write database connection string keys), `Kestrel` (endpoint URL configuration), and `AppSettings` (product name, service name, version, environment, Swagger toggle, API base path, HTTP client timeout).
13. THE Backend_Solution SHALL include `launchSettings.json` with profiles for HTTP, Docker container, and Docker Compose debugging.
14. THE Backend_Solution SHALL include the `AppSettings.cs` class in `Core/Settings/` with properties for product name (string, max 50 characters), service name (string, max 50 characters), version (string), environment (string), Swagger toggle (boolean), API base path (string), and HTTP client timeout (integer, in seconds, default 100).
15. THE Backend_Solution SHALL include EF Core database context files (`IApplicationContext.cs`, `ApplicationReadContext.cs`, `ApplicationWriteContext.cs`, `MigrationContext.cs`, `MigrationContextFactory.cs`, and `DataContextGuards.cs`) in the DataContext project.
16. THE Backend_Solution SHALL include `DependencyContainer.cs` in both the `Persistence.IoC` and `IoC` projects, wiring persistence, health checks, HTTP client, and Clean Architecture services via `AddCleanArchitecturePersistence` and `AddCleanArchitecture` extension methods respectively.
17. THE Backend_Solution SHALL include `Program.cs` in the Api project with CORS policy allowing any origin for local development, OpenAPI document generation, camelCase JSON serialization via `System.Text.Json`, global exception strategy via `UseApiGlobalExceptionStrategy()`, and endpoint registration configured.
18. THE Backend_Solution SHALL include `RegisterEndpoints.cs` in `Api/Endpoints/` mapping the health check endpoint using `MapHealthChecksEndpoint(configuration, apiBasePath)`.
19. WHEN the scaffolding process completes, THE Backend_Solution SHALL reference NuGet packages at the versions defined in the tech stack steering file: `Codenized.*` at `10.*`, `Microsoft.EntityFrameworkCore.*` at `10.0.7`, `StyleCop.Analyzers` at `1.1.118`, `NUnit` at `4.*`, `NSubstitute` at `5.*`, and `Microsoft.Extensions.*` at `10.0.8`.
20. WHEN `dotnet build` is executed, THE Backend_Solution SHALL generate XML documentation files for all projects and produce zero compiler warnings including documentation warnings (CS1591).
21. THE Backend_Solution SHALL place all source projects under a `backend/src/` directory and Docker Compose files, `.editorconfig`, `stylecop.json`, `.gitignore`, and the `.slnx` file under the `backend/` root directory.

### Requirement 2: Scaffold the React TypeScript PWA Project

**User Story:** As a developer, I want a fully configured React TypeScript project with Vite, Tailwind CSS, and the complete tooling stack, so that I can immediately begin building frontend features with consistent code quality.

#### Acceptance Criteria

1. WHEN the scaffolding process completes, THE React_Web_Project SHALL contain a valid `package.json` with dependencies at the following semver ranges: `react` and `react-dom` ^19.*, `typescript` ~5.9.*, `vite` (rolldown-vite) ^7.*, `tailwindcss` ^4.*, `@tailwindcss/vite` ^4.*, `vitest` ^3.*, `@testing-library/react` ^16.*, `@testing-library/user-event` ^14.*, `@playwright/test` ^1.*, `eslint` ^9.*, `typescript-eslint` ^8.*, `eslint-plugin-sonarjs` ^3.*, `eslint-plugin-jsx-a11y` ^6.*, `zod` ^4.*, and `@sentry/react` ^10.*.
2. THE React_Web_Project SHALL use pnpm as the package manager with a `pnpm-lock.yaml` file present at the project root.
3. WHEN `pnpm run build` is executed, THE React_Web_Project SHALL compile with zero TypeScript errors and produce a production bundle in the `dist/` directory.
4. WHEN `pnpm run lint` is executed, THE React_Web_Project SHALL pass with zero ESLint errors using the flat config with SonarJS and jsx-a11y plugins.
5. THE React_Web_Project SHALL include a `vite.config.ts` with path aliases (`@/` → `./src`, `@features/` → `./src/features`, `@shared/` → `./src/shared`, `@context/` → `./src/context`) and the `@vitejs/plugin-react` and `@tailwindcss/vite` plugins configured.
6. THE React_Web_Project SHALL include `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.node.json` with strict mode enabled, path aliases matching the Vite configuration, and `tsconfig.app.json` excluding test files (`src/**/*.test.ts`, `src/**/*.test.tsx`, `src/test/**`).
7. THE React_Web_Project SHALL include a `vitest.config.ts` configured for unit testing with React Testing Library and a `src/test/setup.ts` file that initializes `@testing-library/jest-dom` matchers.
8. THE React_Web_Project SHALL include an `eslint.config.js` flat configuration with `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-sonarjs`, `eslint-plugin-jsx-a11y`, and `eslint-config-prettier`, with `sonarjs/cognitive-complexity` set to a maximum of 15.
9. THE React_Web_Project SHALL include a `.prettierrc` file specifying at minimum: print width, tab width, single vs double quotes, trailing comma style, and semicolon preference.
10. THE React_Web_Project SHALL include the feature-based folder structure with `src/features/`, `src/shared/`, `src/context/`, `src/infrastructure/`, `src/pages/`, `src/assets/`, and `src/test/` directories.
11. THE React_Web_Project SHALL include an `App.tsx` root component and a `main.tsx` entry point rendering the application into the DOM.
12. THE React_Web_Project SHALL include an `index.css` file with Tailwind CSS v4 `@import "tailwindcss"` directive.
13. THE React_Web_Project SHALL include an `.env.example` file documenting at minimum the API base URL and Sentry DSN variables as placeholder keys without actual secret values.
14. THE React_Web_Project SHALL include a `.gitignore` file configured to exclude `node_modules/`, `dist/`, `.env` files (but not `.env.example`), and IDE-specific directories.
15. WHEN `pnpm vitest --run` is executed, THE React_Web_Project SHALL run the test suite and exit with zero failures.
16. THE React_Web_Project SHALL include an `e2e/` directory with a Playwright configuration file and a `pages/` subdirectory for Page Object Models.
17. THE React_Web_Project SHALL include i18n infrastructure consisting of an internationalization library installed as a dependency, locale resource files for Spanish (`es`) and English (`en`), and a configuration that sets Spanish as the default language with English as a fallback.
18. THE React_Web_Project SHALL include Husky configured with a pre-commit hook that runs lint and typecheck, and a pre-push hook that runs tests and build.
19. WHEN `pnpm run quality` is executed, THE React_Web_Project SHALL run lint, typecheck, and unit tests sequentially and exit with zero errors.

### Requirement 3: Scaffold the Android Kotlin Native Application

**User Story:** As a developer, I want a fully configured Android Kotlin project with Jetpack Compose, Hilt, and Retrofit, so that I can immediately begin building the mobile application with consistent architecture patterns.

#### Acceptance Criteria

1. WHEN the scaffolding process completes, THE Android_App_Project SHALL contain a Gradle project with `build.gradle.kts` (root and app module), `settings.gradle.kts`, and `gradle.properties` configured for compile SDK 36, target SDK 36, min SDK 26, JVM target 11, and the `android.application`, `kotlin.android`, and `kotlin.compose` plugins declared.
2. THE Android_App_Project SHALL include a `gradle/libs.versions.toml` version catalog with all dependency versions aligned to the tech stack steering file (AGP 8.12, Kotlin 2.0, Compose BOM 2024.09.00, Retrofit 2.11, OkHttp 4.12, Coroutines 1.10).
3. WHEN `./gradlew assembleDebug` is executed, THE Android_App_Project SHALL compile with zero errors and produce a debug APK.
4. THE Android_App_Project SHALL include a `MainActivity.kt` annotated with `@AndroidEntryPoint` as the single activity entry point, using Jetpack Compose `setContent` with the `PlanixorTheme` wrapper applied.
5. THE Android_App_Project SHALL include the MVVM package structure with `domain/`, `data/`, `ui/`, and `di/` packages under `com.codenized.planixor`.
6. THE Android_App_Project SHALL include a Material Design 3 theme configuration in `ui/theme/` with `Color.kt`, `Theme.kt` (defining `PlanixorTheme` composable), and `Type.kt` files.
7. THE Android_App_Project SHALL include `ui/navigation/AppNavigation.kt` containing a `NavHost` composable with a defined start destination and at least one route registered.
8. THE Android_App_Project SHALL include `res/values/strings.xml` for English and `res/values-es/strings.xml` for Spanish, each containing at minimum the `app_name` string resource.
9. THE Android_App_Project SHALL include a `.gitignore` file configured to exclude Gradle build artifacts, IDE files, and generated code.
10. THE Android_App_Project SHALL include Hilt dependency injection configured with the Hilt Gradle plugin in both root and app `build.gradle.kts`, an `@HiltAndroidApp` annotated Application class, and that Application class registered as `android:name` in `AndroidManifest.xml`.
11. THE Android_App_Project SHALL include Retrofit and OkHttp dependencies configured in the version catalog with a Hilt `@Module` in `di/` that provides a configured `Retrofit` instance (with a placeholder base URL) and an `OkHttpClient` instance with a logging interceptor.
12. THE Android_App_Project SHALL include a `data/connectivity/ConnectivityChecker.kt` utility for verifying network availability before API calls.
13. WHEN `./gradlew test` is executed, THE Android_App_Project SHALL run the unit test suite containing at least 1 unit test and exit with zero failures.
14. THE Android_App_Project SHALL include Gradle wrapper files (`gradlew`, `gradlew.bat`, `gradle/wrapper/`) for reproducible builds without requiring a pre-installed Gradle version.
15. THE Android_App_Project SHALL include `proguard-rules.pro` in the app module for release build configuration.

### Requirement 4: Monorepo Structure and Cross-Project Configuration

**User Story:** As a developer, I want the monorepo root to have proper configuration for all three sub-projects, so that the repository is organized and each sub-project remains self-contained.

#### Acceptance Criteria

1. THE Scaffolding SHALL produce the monorepo directory layout with `backend/`, `frontend/react-web/`, and `frontend/android-app/` as top-level directories.
2. THE Scaffolding SHALL produce each sub-project as a self-contained unit with no shared build files, configuration files, or source code across sub-projects, meaning no project file, import statement, or build script references a path in a sibling sub-project directory.
3. THE Scaffolding SHALL produce a root-level `.gitignore` file that includes patterns for macOS files (`.DS_Store`), Windows files (`Thumbs.db`), Linux temporary files (`*~`), and IDE directories (`.idea/`, `.vscode/`, `*.suo`, `*.user`), excluding patterns already covered by sub-project-specific `.gitignore` files.
4. WHEN any sub-project build command (`dotnet build` in `backend/`, `pnpm run build` in `frontend/react-web/`, `./gradlew assembleDebug` in `frontend/android-app/`) is executed from its respective directory, THE Scaffolding SHALL produce a project that builds independently without requiring files from sibling sub-projects.
5. THE Scaffolding SHALL produce all code, comments, variable names, and documentation in English.
6. THE Scaffolding SHALL produce all user-facing strings externalized and prepared for i18n in both Spanish and English.
7. THE Scaffolding SHALL produce a root-level `README.md` file that lists each sub-project with its directory path, technology stack, and the command to build it.
