# Project Structure

Monorepo with three sub-projects organized by concern.

## Layout

```
codenized-planixor/
├── backend/              # .NET 10 — API + background services
├── frontend/
│   ├── react-web/       # React Progressive Web App
│   └── android-app/     # Android / Kotlin native app
└── .kiro/
    └── steering/
```

## Rules

- Each sub-project (`backend`, `frontend/react-web`, `frontend/android-app`) is self-contained — do not share build files across them
- Business logic belongs in `backend` — frontend clients only handle presentation and API communication
- Do not commit build artifacts, generated files, or secrets
- `.kiro/` is tooling metadata — no application code here
- Update the relevant `*-structure.md` steering file whenever a sub-project structure changes significantly
