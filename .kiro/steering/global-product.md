# Product: Planixor

Planixor is a shift management and scheduling tool developed by **Codenized**.

## Purpose

Planixor unifies work shift management, calendar (appointments, reminders, meetings), notifications, and reporting into a single application. Target users are anyone who needs to manage work shifts and wants a unified view of their schedule, events, and time tracking.

## Core features

- **Shift management** — create, assign, and visualize work shifts (daily, weekly, monthly views)
- **Reminder management** — create, view, edit, deactivate, and delete reusable reminder templates (name, emoji icon, color from 45-color palette, series frequency with end date); series repetition (weekly, monthly, yearly) auto-generates calendar events through a configurable end date; cross-device sync when sync is configured; reminders serve as assignable templates for calendar events
- **Calendar event management** — create, view (Day/Week/Month/Year), edit, and delete calendar events that reference shifts or reminders; one-shift-per-day constraint; series events linked by seriesId with edit/delete options ("only this event" or "all future events in series"); offline-first CRUD with bidirectional sync when sync is configured; four view modes with per-view navigation; day pre-selection based on view context; cross-platform (React Web + Android + backend sync endpoints)
- **Notifications** — push, email, and in-app alerts for upcoming shifts, events, and reminders
- **Reports** — hours worked per day/week/month/year, shift summaries, exportable data
- **Synchronization** — bidirectional sync across devices for users with a self-hosted backend; sync configuration UI (server URL with configurable base path + API key validation); pause/resume controls; connection status indicator in top bar (persisted across restarts); configurable periodic background sync (5–60 min, default 5) + on app open/close; per-entity resilient sync (calendar events, notifications, annual hours, shifts, reminders); automatic purge of past notification records; username change detection with data wipe confirmation
- **Backups** — client-side backup creation and restoration accessible from Settings; exports all local data (calendar events, shifts, reminders, notifications, annual hours config, sync config) to a portable `.bak` JSON file; cross-platform restore with LWW merge logic; no backend involvement; both React Web and Android

## Architecture

| Project | Technology | Description |
|---|---|---|
| `backend` | .NET 10 (C#) | Backend REST API + background services — sync hub (self-hosted) — source of truth for synchronized data when the user deploys their own instance |
| `frontend/react-web` | React (TypeScript) | Progressive Web App — offline-first, uses IndexedDB as primary data store |
| `frontend/android-app` | Android / Kotlin | Native Android app — offline-first, uses SQLite as primary data store |

The application is **offline-first**: both clients store all user data locally and function fully without internet. The `backend` API serves as the synchronization hub exclusively for users who deploy their own backend instance for cross-device sync. See `global-sync-strategy.md` for full details.

## Organization context

| Token | Value | Usage |
|---|---|---|
| `{Organization}` | `Codenized` | PascalCase — namespaces, NuGet prefixes, copyright |
| `{Product}` | `Planixor` | PascalCase — project names, namespaces |
| `{organization-lowercase}` | `codenized` | Docker images, URLs, branch names |
| `{product-lowercase}` | `planixor` | Docker images, URLs, config keys |

## Cross-project rules

### Language

- **Code**: English (variables, functions, classes, commits, comments, docs)
- **UI**: Spanish and English (i18n from day one — all user-facing strings externalized)

### Authentication

- **Backend API**: API key authentication via `Authorization: Bearer <key>` header. API keys are configured in `appsettings` under `SecuritySettings` (username → key dictionary). No OAuth/JWT at the API level.
- **Frontend clients**: Use the API key to authenticate with the self-hosted backend. The validation endpoint (`GET /api/security/validate`) returns the username linked to the key.
- Authentication is only relevant when using a self-hosted backend for sync
- Users who don't need sync operate fully offline without any backend or API key
- Users who want sync deploy their own backend and configure API keys in SecuritySettings

### Versioning

- SemVer (`MAJOR.MINOR.PATCH`) across all three sub-projects
- Each sub-project versioned independently

### Environments

| Environment | Infrastructure | Purpose |
|---|---|---|
| `local` | Docker Compose | Development and testing |

> Additional environments (staging, production) will be defined as the project matures.

### Conventions

- Conventional Commits for all git messages
- GitFlow branching strategy (see `global-git-workflow.md`)
- All secrets via environment variables — never hardcoded or committed
- Each sub-project is self-contained — no shared build files across them
- Offline-first data and sync strategy (see `global-sync-strategy.md`)
- GUIDs as primary identifiers everywhere — no auto-increment IDs

## Key Principles

- **Offline-first** — the app must be fully functional without internet; sync is an enhancement, not a requirement
- Keep the user experience simple and focused
- Prioritize clarity over feature density
- Build for reliability and correctness from the start
- Design for i18n from the beginning — no hardcoded strings in UI
- Business logic lives in the clients for offline operations; the API orchestrates sync and enforces authorization
- GUIDs everywhere — no auto-increment IDs to avoid sync collisions

## Status

Early/greenfield stage. Architecture and steering defined. Sub-project scaffolding pending.
