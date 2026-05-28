---
inclusion: fileMatch
fileMatchPattern: "frontend/react-web/**"
---

# Web — Tech Stack (React / TypeScript)

## Stack

- **Runtime:** Node.js LTS
- **Package manager:** pnpm
- **Language:** TypeScript (strict mode)
- **Framework:** React 19
- **Build tool:** Vite (with Rolldown)
- **Styling:** Tailwind CSS v4
- **Routing:** React Router
- **Server state:** React Query (TanStack Query)
- **Form validation:** Zod
- **Testing:** Vitest + React Testing Library
- **E2E testing:** Playwright
- **Linting:** ESLint 9 (flat config) + SonarJS + jsx-a11y
- **Formatting:** Prettier
- **Git hooks:** Husky
- **Monitoring:** Sentry

## Package version alignment

| Package | Version |
|---|---|
| `react` / `react-dom` | `^19.*` |
| `typescript` | `~5.9.*` |
| `vite` (rolldown-vite) | `^7.*` |
| `tailwindcss` | `^4.*` |
| `@tailwindcss/vite` | `^4.*` |
| `vitest` | `^3.*` |
| `@testing-library/react` | `^16.*` |
| `@testing-library/user-event` | `^14.*` |
| `@playwright/test` | `^1.*` |
| `eslint` | `^9.*` |
| `typescript-eslint` | `^8.*` |
| `eslint-plugin-sonarjs` | `^3.*` |
| `eslint-plugin-jsx-a11y` | `^6.*` |
| `zod` | `^4.*` |
| `@sentry/react` | `^10.*` |

## TypeScript conventions

- Functional components only — no class components
- Use `const` arrow functions for components: `export const MyComponent = () => {}`
- Prefer named exports over default exports
- No `any` — use `unknown` and narrow types properly
- Use type assertions safely: `value as unknown as TargetType` (never `as any`)
- Keep component props typed with explicit interfaces
- `tsconfig.app.json` must exclude test files: `"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"]`

## React conventions

- Use React Query for all server state — no manual `useEffect` for data fetching
- Use React Context + `useReducer` for client-side global state
- Split Context into 3 files to avoid react-refresh issues (never use `allowExportNames` workaround)
- Prefer `userEvent` over `fireEvent` in tests
- Use semantic HTML first — add ARIA only when semantic elements are insufficient
- All user-facing strings externalized for i18n (Spanish + English from day one)

## ESLint configuration

Flat config (`eslint.config.js`) with these plugins:
- `@eslint/js` — base recommended
- `typescript-eslint` — TS-specific rules
- `eslint-plugin-react-hooks` — hooks rules
- `eslint-plugin-react-refresh` — HMR compatibility
- `eslint-plugin-sonarjs` — code quality (cognitive complexity, duplicates)
- `eslint-plugin-jsx-a11y` — accessibility
- `eslint-config-prettier` — disable formatting conflicts

Key rules:
```javascript
'sonarjs/cognitive-complexity': ['error', 15],
'sonarjs/no-duplicate-string': 'error',
'sonarjs/no-identical-functions': 'error',
```

## Vite configuration

- Path aliases: `@` → `./src`, `@features` → `./src/features`, `@shared` → `./src/shared`, `@context` → `./src/context`
- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`

## Common commands

```bash
pnpm install              # install dependencies
pnpm run dev              # start dev server
pnpm run build            # production build (tsc + vite build)
pnpm run preview          # preview production build locally
pnpm run lint             # lint (ESLint)
pnpm vitest --run         # run unit/integration tests (single pass)
pnpm run test:e2e         # run Playwright E2E tests
pnpm run test:coverage    # run tests with coverage report
```

## Quality gate scripts

```bash
pnpm run quality          # lint + typecheck + test:run
pnpm run verify           # quality + test:e2e + build
```

Both must pass with 0 errors before committing.

## Husky hooks

- **pre-commit:** lint + typecheck
- **pre-push:** test + build

> Rule: `git init` must run BEFORE `husky init` when setting up the project.

