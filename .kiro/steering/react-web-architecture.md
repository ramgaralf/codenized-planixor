---
inclusion: fileMatch
fileMatchPattern: "frontend/react-web/**"
---

# Web — Architecture & Patterns

## Screaming Architecture + Scope Rule

The project follows **Screaming Architecture**: the folder structure immediately communicates what the application does. Feature names describe business functionality, not technical implementation.

### The Scope Rule (non-negotiable)

| Usage | Placement | Example |
|---|---|---|
| Used by 1 feature | Local to that feature folder | `features/shopping-cart/components/CartItem.tsx` |
| Used by 2+ features | `shared/` | `shared/utils/formatPrice.ts` |

- Start local — refactor to `shared/` only when a second feature needs it
- Never pre-emptively place code in `shared/` based on hypothetical future usage
- Analyze actual import statements, not assumptions

### Decision flow

```
Is this code used by more than one feature?
├── YES → Place in shared/{appropriate-subfolder}/
└── NO
    ├── Is it cross-cutting infrastructure? (auth, monitoring, API client)
    │   ├── YES → Place in infrastructure/
    │   └── NO → Place in features/{feature-name}/{appropriate-subfolder}/
    └── Is it global state needed app-wide?
        ├── YES → Place in context/
        └── NO → Place in features/{feature-name}/
```

## Container / Presentational Pattern

### Container components
- Handle business logic, state management, data fetching
- Named identically to the feature folder: `features/shift-list/shift-list.tsx`
- Compose presentational components
- Connect to context, hooks, and services

### Presentational components
- Pure UI — receive data and callbacks via props
- No direct state management (local UI state like `isOpen` is acceptable)
- No API calls or side effects
- Highly reusable and testable in isolation

```
features/shift-management/
├── shift-management.tsx              ← Container (orchestrates)
├── components/
│   ├── ShiftCard.tsx                 ← Presentational
│   ├── ShiftTimeline.tsx             ← Presentational
│   └── ShiftForm.tsx                 ← Presentational (form UI only)
├── hooks/
│   └── useShiftActions.ts            ← Logic extracted from container
├── services/
│   └── shiftService.ts              ← API calls for this feature
└── models.ts                         ← Feature-specific types
```

## State Management Strategy

| State type | Solution | Location |
|---|---|---|
| Server state (API data) | React Query (TanStack Query) | `services/` + query hooks |
| Global client state | React Context + `useReducer` | `context/` (3-file split) |
| Feature-local state | `useState` / `useReducer` in container | Feature folder |
| Form state | Controlled components + Zod validation | Component-local |
| UI state (modals, tooltips) | `useState` in the component | Component-local |

### Context 3-file split (mandatory)

```typescript
// context/AuthContextValue.ts — types + createContext (NO components)
export interface AuthState { ... }
export const AuthContext = createContext<AuthState | undefined>(undefined);

// context/AuthContext.tsx — ONLY the Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => { ... };

// context/useAuth.ts — ONLY the consumer hook
export const useAuth = () => { ... };
```

This split prevents react-refresh full-page reloads during development.

## Data Flow

```
API (backend)
  ↓
infrastructure/api/ (HTTP client, interceptors, auth headers)
  ↓
features/{feature}/services/{service}.ts (feature-specific API calls)
  ↓
React Query hook (caching, refetching, loading states)
  ↓
Container component (orchestration)
  ↓
Presentational components (pure UI via props)
```

## Error Handling Strategy

| Layer | Approach |
|---|---|
| API calls | Try/catch in services, return typed errors |
| React Query | `onError` callbacks, error boundaries for unrecoverable |
| Components | Error boundaries (Sentry-integrated) for crash recovery |
| Forms | Zod validation with user-friendly messages |
| Global | `SentryErrorBoundary` wrapping the app root |

Rules:
- Never swallow errors silently (empty catch blocks)
- Always log errors with `console.error` before handling
- No stack traces or internal details shown to users
- Use error boundaries for unexpected crashes, not for expected validation errors

## Routing Architecture

```
pages/
├── ShiftListPage.tsx          ← Composes features/shift-list
├── ShiftDetailPage.tsx        ← Composes features/shift-detail
├── CalendarPage.tsx           ← Composes features/calendar
└── LoginPage.tsx              ← Composes features/auth
```

- Pages only compose feature containers — no business logic
- Route guards live in `infrastructure/auth/`
- Lazy loading via `React.lazy()` for code splitting per page

## Key Architectural Rules

1. **Thin client**: all business logic lives in the backend API — the frontend handles presentation and API communication only
2. **No direct fetch in components**: all API calls go through `services/` or `infrastructure/api/`
3. **No `useEffect` for data fetching**: use React Query exclusively
4. **No prop drilling beyond 2 levels**: extract to Context or composition
5. **No circular dependencies between features**: features communicate through shared state (Context) or the backend
6. **Infrastructure is framework-agnostic where possible**: services and utilities should not import React

