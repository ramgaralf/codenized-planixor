# Project Structure

Monorepo with three sub-projects, each with its own technology stack.

## Layout

```
codenized-planixor/
├── api/        # .NET 10 REST API
├── web/        # React Progressive Web App
├── app/        # Android / Kotlin native app
└── .kiro/
    └── steering/
```

## Rules

- Each sub-project (`api`, `web`, `app`) is self-contained — do not share build files across them
- Business logic belongs in `api` — clients (`web`, `app`) only handle presentation and API communication
- Do not commit build artifacts, generated files, or secrets
- `.kiro/` is tooling metadata — no application code here
- Update the relevant `*-structure.md` steering file whenever a sub-project structure changes significantly
