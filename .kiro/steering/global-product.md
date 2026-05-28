# Product: Planixor

Planixor is a shift management and scheduling tool developed by **Codenized**.

## Purpose

Planixor unifies work shift management, calendar (appointments, reminders, meetings), notifications, and reporting into a single application. Target users are anyone who needs to manage work shifts and wants a unified view of their schedule, events, and time tracking.

## Core features

- **Shift management** — create, assign, and visualize work shifts (daily, weekly, monthly views)
- **Calendar / Agenda** — appointments, reminders, meetings, personal events
- **Notifications** — push, email, and in-app alerts for upcoming shifts, events, and reminders
- **Reports** — hours worked per day/week/month/year, shift summaries, exportable data

## Architecture

| Project | Technology | Description |
|---|---|---|
| `backend` | .NET 10 (C#) | Backend REST API + background services — single source of truth for business logic and data |
| `frontend/react-web` | React (TypeScript) | Progressive Web App — browser client |
| `frontend/android-app` | Android / Kotlin | Native Android mobile application |

The `backend` owns all business logic and data. Both `frontend/react-web` and `frontend/android-app` are thin clients that consume it.

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

- Google Sign-In (OAuth 2.0) as the initial and primary auth provider
- JWT tokens issued by the API after Google auth verification

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
- Business logic lives exclusively in `backend` — clients handle only presentation and API communication

## Key Principles

- Keep the user experience simple and focused
- Prioritize clarity over feature density
- Build for reliability and correctness from the start
- Design for i18n from the beginning — no hardcoded strings in UI
- Shared business logic lives in the API — clients stay thin

## Status

Early/greenfield stage. Architecture and steering defined. Sub-project scaffolding pending.
