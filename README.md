# Planixor

Shift management and scheduling tool by **Codenized**.

## Sub-Projects

| Directory | Technology Stack | Build Command |
|---|---|---|
| `backend/` | .NET 10 (C#) — REST API with Clean Architecture | `dotnet build` |
| `frontend/react-web/` | React TypeScript PWA with Vite | `pnpm run build` |
| `frontend/android-app/` | Android Kotlin with Jetpack Compose | `./gradlew assembleDebug` |

## Getting Started

Each sub-project is self-contained. Navigate to the respective directory and run the build command listed above.

```bash
# Backend
cd backend
dotnet build

# React Web
cd frontend/react-web
pnpm install
pnpm run build

# Android App
cd frontend/android-app
./gradlew assembleDebug
```
