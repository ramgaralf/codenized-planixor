# Planixor

**"Organize your time. Power your day."**

Planixor is a shift management and scheduling tool developed by **Codenized**. It unifies work shift management, calendar (appointments, reminders, meetings), notifications, and reporting into a single application.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Deployment](#deployment)
- [Installation and Setup](#installation-and-setup)
- [Project Structure](#project-structure)
- [Features](#features)
- [Authentication](#authentication)
- [Development Conventions](#development-conventions)
- [License](#license)

## Project Description

Planixor is a cross-platform application designed for anyone managing work shifts who needs a unified view of their schedule, events, and time tracking. It combines work shift management with a full-featured calendar that includes appointments, reminders, and meetings — all in one place.

### Philosophy: Offline-First

The application is built with an **offline-first** architecture: it works fully without internet. All CRUD operations run against the device's local storage. Server synchronization is optional and available when the user has deployed and configured their own backend.

### Usage Model

Planixor works completely offline with no server required. If the user wants to sync data across multiple devices, they can **deploy their own backend instance** and configure their clients with the server URL and an API key.

| Mode | Description |
|---|---|
| **Local only** | The application works 100% without internet or backend. All data is stored locally on the device. |
| **With synchronization** | The user deploys their own backend instance (Docker) and configures the connection in clients to sync data across devices. |

### Cross-Platform

Planixor is available on three platforms:

- **React Web (PWA)** — Progressive Web App with offline support via IndexedDB
- **Android App** — Native application with Kotlin and Jetpack Compose, local SQLite storage
- **Backend API** — Self-hosted sync hub (deployed by the user when cross-device sync is desired)

### Internationalization

Spanish and English from day one. All user-facing strings are externalized for i18n.

### Architecture

The backend API serves exclusively as a sync hub for users who have configured synchronization. Business logic for offline operations resides in the clients. Local data (IndexedDB on web, SQLite on Android) is the source of truth on each device.

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| .NET | 10 | Runtime |
| C# | 13 | Language |
| Entity Framework Core | 10.0.7 | ORM (MySQL) |
| Clean Architecture | - | Architecture (5 tiers, 11 projects) |
| Docker / Docker Compose | - | Containerization and local environment |
| NUnit + NSubstitute | 4.x / 5.x | Testing (TDD mandatory) |
| StyleCop | 1.1.118 | Style analysis |

### Frontend — React Web (PWA)

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.9 | Language |
| Vite (rolldown-vite) | 7 | Bundler |
| Tailwind CSS | 4 | Styling |
| Dexie (IndexedDB) | 4.4 | Local storage |
| React Router | 7 | Routing |
| Zustand | 5 | Global state |
| i18next | 25 | Internationalization |
| Vitest + React Testing Library | 3.x / 16.x | Testing |
| fast-check | 4.8 | Property-based testing |
| ESLint 9 + SonarJS + jsx-a11y | - | Linting |
| Husky | 9 | Git hooks |
| Playwright | 1 | E2E testing |

### Frontend — Android App

| Technology | Version | Purpose |
|---|---|---|
| Kotlin | 2.0 | Language |
| Jetpack Compose | BOM 2024.09 | Declarative UI |
| Material Design 3 | - | UI components |
| Room | 2.6 | SQLite database |
| DataStore | 1.1 | Preferences |
| Hilt | 2.51 | Dependency injection |
| Retrofit + OkHttp | 2.11 / 4.12 | Networking |
| Kotlin Coroutines + Flow | 1.10 | Async programming |
| WorkManager | 2.10 | Background tasks |
| JUnit 4 + MockK | 4.13 / 1.13 | Testing |
| Kotest | 5.9 | Property-based testing |
| Gradle | 8.13 | Build system |
| AGP | 8.12 | Android Gradle Plugin |
| Min SDK 26 / Target SDK 36 | - | Android 8.0+ compatibility |

## Deployment

Planixor is available through multiple channels:

| Platform | URL | Notes |
|---|---|---|
| **Web (PWA)** | [planixor.codenized.com](https://planixor.codenized.com) | Auto-deployed via Vercel on push to `main` |
| **Backend (Docker)** | `ghcr.io/ramgaralf/planixor-api` | Self-hosted by users who want sync |
| **Android (APK)** | [GitHub Releases](https://github.com/ramgaralf/codenized-planixor/releases) | Download from the latest release |

### Web (PWA)

The React Web application is automatically deployed to [planixor.codenized.com](https://planixor.codenized.com) via Vercel. Every push to `main` triggers a new deployment.

### Backend (Docker Image)

The backend API is published as a Docker image to GitHub Container Registry. Users who want cross-device sync can self-host it:

```bash
# Pull the latest image
docker pull ghcr.io/ramgaralf/planixor-api:latest

# Or a specific version
docker pull ghcr.io/ramgaralf/planixor-api:1.0.1

# Run the container
docker run -d -p 80:80 \
  -e ConnectionStrings__AppReadDb="your-mysql-connection-string" \
  -e ConnectionStrings__AppWriteDb="your-mysql-connection-string" \
  -e SecuritySettings__ApiKeys__yourusername="your-api-key" \
  ghcr.io/ramgaralf/planixor-api:latest
```

The image is built and pushed automatically on every push to `main` or when a version tag (`v*`) is created.

**Default API key (for testing only):**

The Docker image ships with a pre-configured API key for quick testing:

| Username | API Key |
|---|---|
| `testuser` | `4f034mWW3AyTAbMnQ1hqcwjq6xUNaBjUrn5aIkeYpwELHRnh0j` |

> **Important:** For personal/production deployments, you MUST change this configuration. Edit the `SecuritySettings` section in `backend/src/Codenized.Planixor.Api/appsettings.json` or override it via environment variables:
>
> ```bash
> -e SecuritySettings__ApiKeys__myusername="my-secure-api-key"
> ```
>
> Using the default key in a public-facing deployment is a security risk.

### Android (APK)

The Android APK is available for download from [GitHub Releases](https://github.com/ramgaralf/codenized-planixor/releases). Each release includes the signed APK ready to install.

## Installation and Setup

### Prerequisites

- **Backend**: .NET 10 SDK, Docker Desktop
- **React Web**: Node.js LTS, pnpm 11+
- **Android**: Android Studio, JDK 11, Android SDK 36

### Backend

```bash
cd backend

# Start with Docker Compose
docker compose up -d

# Or run directly
dotnet run --project src/Codenized.Planixor.Api
```

The API will be available at `http://localhost:80`

Swagger UI: `http://localhost:80/swagger`

Configuration is in `backend/src/Codenized.Planixor.Api/appsettings.json`:

- `ConnectionStrings`: MySQL connection strings (read and write)
- `SecuritySettings.ApiKeys`: username → API key dictionary for authentication

### React Web (PWA)

```bash
cd frontend/react-web

pnpm install
pnpm run dev          # Development server
pnpm run build        # Production build
pnpm run preview      # Preview the build
```

Available at `http://localhost:5173`

### Android App

```bash
cd frontend/android-app

./gradlew assembleDebug     # Build debug APK
./gradlew installDebug      # Install on device/emulator
```

### Tests

```bash
# Backend
cd backend
dotnet test

# React Web
cd frontend/react-web
pnpm run test              # Unit + Property tests
pnpm run quality           # Lint + Typecheck + Tests

# Android
cd frontend/android-app
./gradlew testDebugUnitTest
```

## Project Structure

```
codenized-planixor/
├── backend/                          # REST API + services (.NET 10)
│   ├── src/
│   │   ├── Codenized.Planixor.Api/           # Endpoints, Program.cs, Docker
│   │   ├── Codenized.Planixor.Core/          # Entities, Value Objects, Domain Events
│   │   ├── Codenized.Planixor.Dtos/          # Request/Response DTOs, Validators
│   │   ├── Codenized.Planixor.Events/        # Domain Event Handlers
│   │   ├── Codenized.Planixor.UseCases/      # Use case services
│   │   ├── Codenized.Planixor.Services/      # Infrastructure services
│   │   ├── Codenized.Planixor.Persistence.MySql.Efc.DataContext/  # EF Core Contexts
│   │   ├── Codenized.Planixor.Persistence.MySql.Efc.Repositories/ # Repositories
│   │   ├── Codenized.Planixor.Persistence.IoC/  # Persistence DI
│   │   ├── Codenized.Planixor.IoC/              # General DI
│   │   └── UnitTest.Codenized.Planixor/         # Unit tests
│   ├── docker-compose.yml
│   └── Codenized.Planixor.slnx
│
├── frontend/
│   ├── react-web/                    # PWA (React + TypeScript)
│   │   ├── src/
│   │   │   ├── features/            # Feature modules
│   │   │   │   ├── calendar-events/ # Event management
│   │   │   │   ├── shifts/          # Shift management
│   │   │   │   ├── reminders/       # Reminder management
│   │   │   │   ├── notifications/   # Notification system
│   │   │   │   ├── reports/         # Reports and statistics
│   │   │   │   ├── sync/            # Synchronization
│   │   │   │   └── backup/          # Backup and restore
│   │   │   ├── data/                # Dexie (IndexedDB) database
│   │   │   ├── pages/               # Pages (compose features)
│   │   │   ├── components/          # Shared components (layout)
│   │   │   ├── infrastructure/      # i18n, API client
│   │   │   ├── context/             # Global state (Theme)
│   │   │   └── stores/              # Zustand stores
│   │   ├── e2e/                      # E2E tests (Playwright)
│   │   └── package.json
│   │
│   └── android-app/                  # Native Android app (Kotlin)
│       └── app/src/main/java/com/codenized/planixor/
│           ├── domain/               # Domain models, pure logic
│           │   ├── model/            # Entities (Shift, Reminder, etc.)
│           │   ├── backup/           # Serialization and restore
│           │   └── validation/       # Domain validation
│           ├── data/                 # Data layer
│           │   ├── local/            # Room DAOs, Entities, Repositories
│           │   ├── sync/             # Sync service
│           │   └── connectivity/     # Network checking
│           ├── ui/                   # Presentation (Jetpack Compose)
│           │   ├── calendar/         # Day/Week/Month/Year views
│           │   ├── shifts/           # Shift CRUD
│           │   ├── reminders/        # Reminder CRUD
│           │   ├── reports/          # Reports
│           │   ├── notifications/    # Notifications
│           │   ├── settings/         # Settings
│           │   ├── sync/             # Sync configuration
│           │   ├── backup/           # Backup UI
│           │   └── theme/            # Material 3 theming
│           └── di/                   # Hilt modules
│
└── .kiro/                            # Tooling metadata (no application code)
    ├── specs/                        # Feature specifications
    └── steering/                     # Development rules and guides
```

## Features

### 1. Shift Management

Full CRUD for creating, editing, activating/deactivating, and deleting work shifts (soft-delete). Shifts act as reusable templates assigned to calendar events.

**Main fields:**

- Name (1–50 characters)
- Emoji icon (selected from a picker)
- Background color (palette of 45 colors: 9 families × 5 shades)
- Start time and end time
- Hours worked (auto-calculated)

**Business rules:**

- Maximum one shift per day on the calendar
- 24-hour shifts: when start time = end time
- Midnight-crossing shifts: `endDay = startDay + 1`
- UUIDs as identifiers (client-generated)
- Soft-delete with `isDeleted` field (never physically removed until sync confirmed)
- Bidirectional sync when the backend is configured

**Color picker:**

Colors are selected from a picker with 9 families × 5 shades. Includes theme-based recommendations: lighter shades for dark mode, darker shades for light mode. Non-recommended shades display at 50% opacity but remain selectable.

### 2. Reminder Management

Full CRUD for creating, editing, activating/deactivating, and deleting reminders. Reminders serve as reusable templates assignable to calendar events.

**Main fields:**

- Name
- Emoji icon
- Background color (same 45-color palette)

**Characteristics:**

- Reusable templates for calendar events
- Bidirectional sync when the backend is configured
- Soft-delete with change tracking

### 3. Calendar Event Management

Create, view, edit, and delete events that reference a shift or reminder. The calendar offers four views with individual per-view navigation.

**Available views:**

- **Day** (default view): vertical timeline with current time indicator (blue line with circle marker, Google Calendar style)
- **Week**: 7-day grid with time blocks
- **Month**: monthly view with event indicators
- **Year**: compact annual view

**Behavior:**

- Auto-scroll to center the current hour when opening Day view
- Day pre-selection based on view context (click on a day from Month/Week)
- "Today" button in all date navigators
- Events ending at 00:00 are not displayed on the `endDay` (they occupy zero time)

**Time auto-adjustment rules:**

- Changing start time adjusts end time if inconsistent (+30 min, capped at 23:59)
- Changing start day adjusts end day if it's earlier
- Selecting a shift auto-populates times and computes `endDay`

**Configurable alerts:**

- At event start
- 10 minutes before
- 1 hour before
- 1 day before

**Restrictions:**

- Maximum one shift per day (validated on create/edit)

### 4. Notification System

Dual notification system: in-app and operating system (Web Notifications API on web, Android notifications on mobile).

**Characteristics:**

- Configurable channels: app only, system only, both
- Automatic notification record generation when creating events with alerts
- Badge indicator on the bell icon (top bar)
- Notification screen with mark-all-as-read
- Automatic purge of past notification records during sync cycle
- Notification record synchronization with the backend

### 5. Reports and Statistics

Work metrics dashboard with multiple time granularities.

**Available metrics:**

- Hours worked per day, week, month, and year
- Breakdown by shift type and reminder type
- Bar charts (hours per weekday)
- Donut chart (distribution by shift type)

**Configuration:**

- Annual target hours (1–8,784 hours)
- Difference calculation (hours worked vs. configured)
- Time navigation with range selector

### 6. Synchronization (Sync)

Bidirectional synchronization available when the user has deployed and configured their own backend. The architecture is offline-first: all CRUD operations work without internet.

**Configuration UI:**

- Server URL (with configurable base path)
- API key + validation
- Pause/resume sync controls
- Connection status indicator in the top bar (persisted across restarts): Not configured, Active, Error, Paused

**Configurable periodic sync:**

Selectable intervals: 5, 10, 15, 20, 25, 30, 45, 60 minutes (default: 5 min).

**Sync triggers:**

| Trigger | Sync type | Platforms |
|---|---|---|
| App opened | Full push + pull | PWA, Android |
| App closing | Push only | PWA, Android |
| Connectivity restored | Full push + pull | PWA, Android |
| Manual | Full push + pull | PWA, Android |
| Periodic (configurable) | Full push + pull | PWA, Android |

**Per-entity resilience:**

If one entity type fails, the others continue. Synced entities: calendar events, notifications, annual hours, shifts, reminders.

**Conflict resolution:**

Last-Writer-Wins (LWW) based on `modifiedAt`.

**Change tracking:**

Each record includes: `id` (UUID), `modifiedAt`, `syncedAt`, `isDeleted`.

**Batch:**

- Push: maximum 100 records/request
- Pull: maximum 100/page with pagination cursor

**Username change detection:**

If the username changes when validating configuration, a confirmation is shown before wiping local data.

**Automatic purge:**

Past notification records are deleted during sync.

**API endpoints:**

```
POST /api/{entity-kebab}/sync/push
GET  /api/{entity-kebab}/sync/pull?lastSyncedAt={ISO8601}&cursor={base64}
```

**Conditional `lastSyncedAt`:**

Only updated if at least one entity synced successfully in the cycle.

### 7. Backups

100% local backup creation and restoration, with no backend involvement. Accessible from the Settings section.

**Create backup:**

Exports ALL local data to a `.bak` file (JSON format with versioned schema).

**Data included:**

- Calendar events
- Shifts
- Reminders
- Notifications
- Annual hours configuration
- Sync configuration

**Filename:** `planixor-yyyyMMdd-HHmmss.bak`

**Maximum size:** 50 MB

**Restore — LWW merge strategy:**

- New records (UUID doesn't exist locally) → insert
- Existing records → LWW by `modifiedAt` (most recent wins)
- Local records with no backup counterpart → remain untouched
- Sync config → only imported if no local config exists

**Dependency order when restoring:**

shifts → reminders → calendar events → notifications → annual hours → sync config

**Per-entity atomicity:**

If one table fails, that table is rolled back; the others continue.

**`syncedAt = null`** on all inserted/updated records (they re-sync on the next cycle).

**File validation:**

- Size within limit
- Valid JSON
- Correct schema
- Compatible version

**Confirmation dialog** if local data exists.

**Platform implementation:**

- **React Web**: File System Access API with download/input fallback
- **Android**: Storage Access Framework (SAF) with `ActivityResultContracts`

### 8. Settings

- **Theme**: light, dark, system — applied immediately without restart
- **Language**: Spanish, English — applied immediately without restart
- **Notifications**: channel configuration (app, system, both)
- **Backup**: create and restore (integrated section)
- **Danger zone**: reset application (deletes all local data)

### 9. Design and UX

- **Dual theme**: full light mode and dark mode
- **Typography**: Poppins (single family) in all weights (400, 500, 600, 700)
- **Color palette**: primary blue (`#2563EB`), purple (`#7C3AED`), teal (`#0B86D4`), green (`#10B981`)
- **Web layout**: fixed sidebar (240px / 64px collapsed) + global top bar + scrollable content
- **Android layout**: bottom nav (icons only, no text) + global top bar with logo
- **Responsive**: Desktop (≥1024px), Tablet (768–1023px), Mobile (<768px with bottom nav)
- **Iconography**: Lucide Icons (web) / Material Icons (Android)
- **Accessibility**: ARIA labels, focus management, minimum 44×44dp touch targets

## Authentication

- **Method**: API Key via `Authorization: Bearer <key>` header
- **Configuration**: `SecuritySettings.ApiKeys` in `appsettings.json` (username → key dictionary)
- **Validation**: `GET /api/security/validate` returns the username linked to the key
- **Relevance**: Authentication only applies when the user has deployed their own backend for synchronization. Users who don't need sync operate fully offline without any backend or API key.
- **No OAuth/JWT** — simple API key model

## Development Conventions

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branching**: GitFlow (`main`, `develop`, `feature/*`, `hotfix/*`, `release/*`)
- **Versioning**: Independent SemVer per sub-project
- **Code**: always in English
- **UI**: Spanish and English (i18n from day one)
- **IDs**: Client-generated UUIDs (never auto-increment)
- **Secrets**: never hardcoded, always environment variables
- **Testing**: TDD mandatory for domain and application logic (backend)
- **Backend architecture**: Clean Architecture with DDD tactical patterns
- **Frontend web architecture**: Feature-based + Container/Presentational
- **Android architecture**: MVVM + Clean Architecture (single module, layers by package)

## License

This software is protected under a **proprietary license**. Personal use is permitted, but copying, distribution, modification, or creation of derivative works, in whole or in part, is expressly prohibited without prior written authorization from Codenized.

See the [LICENSE](./LICENSE) file for full terms.

© 2025 Codenized. All rights reserved.
