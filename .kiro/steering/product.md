# Product: Planixor

Planixor is a planning and organization tool developed under the Codenized brand.

## Purpose

Planixor helps users plan, organize, and manage tasks or projects. The exact feature set is being defined — this document should be updated as the product vision solidifies.

## Architecture

The product is composed of three sub-projects:

| Project | Technology     | Description                        |
|---------|----------------|------------------------------------|
| `api`   | .NET 10        | Backend REST API                   |
| `web`   | React          | Progressive Web App (browser)      |
| `app`   | Android/Kotlin | Native Android mobile application  |

The `api` is the single source of truth for business logic and data. Both `web` and `app` are clients that consume it.

## Key Principles

- Keep the user experience simple and focused
- Prioritize clarity over feature density
- Build for reliability and correctness from the start
- Shared business logic lives in the API — clients stay thin

## Status

This project is in early/greenfield stage. Sub-project scaffolding is pending.
