---
inclusion: fileMatch
fileMatchPattern: "frontend/react-web/**"
---

# Web — Project Structure (React / Feature-Based Architecture)

## Project layout

```
frontend/react-web/
├── public/
├── src/
│   ├── features/                          # Feature modules (one folder per business feature)
│   │   └── {feature-name}/
│   │       ├── {feature-name}.tsx         # Main container component (same name as feature)
│   │       ├── components/                # Feature-specific presentational components
│   │       │   └── {ComponentName}.tsx
│   │       ├── hooks/                     # Feature-specific hooks
│   │       │   └── use{HookName}.ts
│   │       ├── services/                  # Feature-specific API services
│   │       │   └── {serviceName}.ts
│   │       └── models.ts                  # Feature-specific types/interfaces
│   │
│   ├── shared/                            # ONLY for code used by 2+ features
│   │   ├── components/                    # Reusable UI components
│   │   ├── hooks/                         # Shared custom hooks
│   │   ├── utils/                         # Utility functions
│   │   ├── constants/                     # Shared constants and business rules
│   │   ├── types/                         # Shared TypeScript types/interfaces
│   │   └── strategies/                    # Strategy pattern implementations (if applicable)
│   │
│   ├── context/                           # Global state (React Context)
│   │   ├── {Name}ContextValue.ts          # createContext + types (NO components)
│   │   ├── {Name}Context.tsx              # ONLY exports {Name}Provider
│   │   └── use{Name}.ts                   # ONLY exports use{Name} hook
│   │
│   ├── infrastructure/                    # Cross-cutting concerns
│   │   ├── api/                           # HTTP client, interceptors, base config
│   │   ├── auth/                          # Auth utilities (token management, guards)
│   │   └── monitoring/                    # Error tracking, analytics
│   │
│   ├── pages/                             # Route-level components (compose features)
│   ├── assets/                            # Static assets (images, fonts, icons)
│   ├── test/                              # Test setup and utilities
│   │   └── setup.ts
│   ├── App.tsx                            # Root component
│   ├── main.tsx                           # App entry point
│   └── index.css                          # Global styles (Tailwind directives)
│
├── e2e/                                   # End-to-end tests (Playwright)
│   ├── pages/                             # Page Object Models
│   │   └── {PageName}Page.ts
│   └── {feature}.spec.ts
│
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── .prettierrc
├── .env.example                           # Environment variable template (never .env)
└── package.json
```

## Naming conventions

| Element | Convention | Example |
|---|---|---|
| Feature folders | kebab-case | `product-catalog/`, `shopping-cart/` |
| Container components | kebab-case file, matches feature name | `product-catalog.tsx` |
| Presentational components | PascalCase | `ProductCard.tsx`, `CartSummary.tsx` |
| Hook files | camelCase prefixed with `use` | `useCart.ts`, `useQuantityValidation.ts` |
| Service files | camelCase | `shiftService.ts`, `authService.ts` |
| Utility files | camelCase | `formatPrice.ts`, `dateUtils.ts` |
| Constant files | camelCase | `businessRules.ts`, `apiRoutes.ts` |
| Type/interface files | camelCase | `models.ts`, `shift.ts` |
| Test files | Same name + `.test` suffix | `ProductCard.test.tsx`, `formatPrice.test.ts` |
| E2E test files | kebab-case + `.spec` suffix | `shopping-cart.spec.ts` |
| Page Objects | PascalCase + `Page` suffix | `ShiftListPage.ts` |
| CSS/style files | Same name as component (module) | `ProductCard.module.css` |
| Context files | PascalCase + pattern suffix | `CartContextValue.ts`, `CartContext.tsx` |

## TypeScript naming

| Element | Convention | Example |
|---|---|---|
| Interfaces | PascalCase (no `I` prefix) | `Shift`, `ShiftListProps` |
| Types | PascalCase | `ButtonState`, `DiscountType` |
| Enums | PascalCase | `ShiftStatus` |
| Enum members | PascalCase | `Pending`, `Confirmed` |
| Constants | UPPER_SNAKE_CASE (module-level) | `MAX_ITEMS`, `API_BASE_URL` |
| Object constants | PascalCase (as const) | `ButtonText`, `BusinessRules` |

## Key structural rules

- **Scope Rule**: code used by 2+ features → `shared/`; code used by 1 feature → stays local in that feature folder
- **Container/Presentational split**: container handles logic and state; presentational components receive props only
- **Container naming**: the main container component file MUST have the same name as its feature folder
- **Context split into 3 files**: `{Name}ContextValue.ts` (types + createContext), `{Name}Context.tsx` (Provider), `use{Name}.ts` (hook) — avoids react-refresh issues
- **Pages only compose** — no business logic beyond routing concerns
- **Co-locate tests** with source files (`.test.tsx` next to `.tsx`)
- **E2E tests** live in `e2e/` at project root, using Page Object pattern
- **One component per file** — file name matches the exported component name
- **No business logic in components** — extract to hooks, services, or the backend API
- **All API calls go through `services/` or `infrastructure/api/`** — never fetch directly from a component
- **Path aliases**: use `@/`, `@features/`, `@shared/`, `@context/` for cleaner imports

