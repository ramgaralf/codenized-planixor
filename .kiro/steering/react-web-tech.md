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
| `@vitejs/plugin-react` | `^6.*` |
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
- Plugins: `@vitejs/plugin-react` (v6+), `@tailwindcss/vite`
- Use `fileURLToPath(new URL(..., import.meta.url))` for path aliases — NOT `path.resolve(__dirname, ...)` (ESM does not have `__dirname`)

## Vitest configuration

- Import `defineConfig` from `vitest/config` (NOT from `vite`) — this adds the `test` property to the config type
- Use `react() as never` cast for the plugin — required due to type incompatibility between `rolldown-vite` and `vitest`'s internal Vite types
- Add `esbuild: { jsx: 'automatic' }` — required because `@vitejs/plugin-react` v6 with rolldown-vite does not inject the JSX runtime in the test environment automatically
- Use `fileURLToPath(new URL(..., import.meta.url))` for path aliases (same as vite.config.ts)

```typescript
// vitest.config.ts — canonical structure
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react() as never],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@context': fileURLToPath(new URL('./src/context', import.meta.url)),
    },
  },
});
```

### Known quirks (rolldown-vite + vitest)

| Issue | Cause | Fix |
|---|---|---|
| `React is not defined` in tests | `@vitejs/plugin-react` v6 doesn't inject JSX runtime in vitest | Add `esbuild: { jsx: 'automatic' }` to vitest.config.ts |
| Type error on `react()` plugin | rolldown-vite Plugin type ≠ vitest's internal Vite Plugin type | Cast with `as never` |
| `__dirname is not defined` | ESM modules don't have `__dirname` | Use `fileURLToPath(new URL(..., import.meta.url))` |
| `optimizeDeps.rollupOptions deprecated` | Old `@vitejs/plugin-react` v4 uses legacy API | Upgrade to `@vitejs/plugin-react` v6+ |

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

