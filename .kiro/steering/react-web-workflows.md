---
inclusion: fileMatch
fileMatchPattern: "frontend/react-web/**"
---

# Web — Workflows Index

Operational workflows available for the React web project.
Read this index first, then load the specific workflow document that matches the task.

| Trigger | Workflow | Document to load |
|---|---|---|
| "configure react-web project" / scaffold the PWA | Create project scaffold | `#react-web-workflow-configure-project` |
| "add feature {feature-name}" / spec task defining a new feature | Add a new feature module | `#react-web-workflow-add-feature` |

## How to use

1. Identify which workflow matches the user's request using the trigger column above.
2. Load the corresponding workflow document via its context key (`#`).
3. Follow the workflow steps exactly — do not proceed to code generation until all mandatory gates pass.

## Preconditions

| Workflow | Requires |
|---|---|
| Configure project | Empty `frontend/react-web/` folder, no `package.json` present |
| Add feature | Project already scaffolded with base structure |

## Testing workflow (applies to all development)

### TDD cycle (mandatory for business logic)

1. **Red** — Write test FIRST → run → MUST FAIL
2. **Green** — Implement MINIMUM code to pass
3. **Refactor** — Clean up keeping tests green

### Test types and placement

| Type | Tool | Location | Purpose |
|---|---|---|---|
| Unit | Vitest | Co-located `.test.ts` | Pure functions, utilities, hooks |
| Integration | Vitest + RTL | Co-located `.test.tsx` | Component interactions, user flows |
| E2E | Playwright | `e2e/*.spec.ts` | Critical user journeys |

### Test naming convention

```typescript
describe('ShiftCard', () => {
  it('should display shift time range when shift is provided', () => { ... });
  it('should call onEdit with shift id when edit button is clicked', () => { ... });
  it('should show confirmed badge when status is confirmed', () => { ... });
});
```

Pattern: `should {expected behavior} when {condition/action}`

### Testing best practices

- Use `userEvent` over `fireEvent` (simulates real user interaction)
- Query by role, label, or text — never by test-id unless no semantic alternative exists
- Use `waitFor` when testing async operations or components with `setTimeout`
- Test behavior, not implementation details
- Mock API calls at the service layer, not at `fetch` level

### Coverage targets

| Metric | Target |
|---|---|
| Functions | 100% |
| Lines | ≥ 80% |
| Branches | ≥ 75% |

## Quality gate (must pass before commit)

```bash
# Pre-commit (Husky)
pnpm run lint
pnpm tsc --noEmit

# Pre-push (Husky)
pnpm vitest --run
pnpm run build
```

## Validation checklist (before finalizing any task)

```bash
# 1. Tests pass
pnpm vitest --run

# 2. Lint clean (0 errors, 0 warnings)
pnpm run lint

# 3. Type check clean
pnpm tsc --noEmit

# 4. Build succeeds
pnpm run build

# 5. E2E pass (if feature has E2E coverage)
pnpm run test:e2e
```

