---
inclusion: fileMatch
fileMatchPattern: "frontend/react-web/**"
---

# Web — Code Guidelines (React / TypeScript)

Apply these rules when writing, reviewing, or refactoring any TypeScript/React code in `frontend/react-web/`.

---

## Component conventions

### Functional components only

```typescript
// ✅ Named export, const arrow function
export const ProductCard = ({ name, price }: ProductCardProps) => {
  return <div>{name} - {price}</div>;
};

// ❌ Default export
export default function ProductCard() { ... }

// ❌ Class component
class ProductCard extends React.Component { ... }
```

### Props typing

```typescript
// ✅ Explicit interface for props
interface ShiftCardProps {
  shift: Shift;
  onEdit: (id: string) => void;
  isSelected?: boolean;
}

export const ShiftCard = ({ shift, onEdit, isSelected = false }: ShiftCardProps) => { ... };

// ❌ Inline types
export const ShiftCard = ({ shift, onEdit }: { shift: any; onEdit: Function }) => { ... };
```

### Component size

- Prefer components ≤ 80 lines of JSX
- If a component grows beyond that, extract sub-components or hooks
- One component per file — file name matches the exported component

---

## TypeScript rules

### No `any`

```typescript
// ✅ Use unknown and narrow
const parseResponse = (data: unknown): Shift => {
  if (!isShift(data)) throw new Error('Invalid shift data');
  return data;
};

// ✅ Safe type assertion
calculateTotal(null as unknown as CartItem[]);

// ❌ Never
const data: any = response.json();
calculateTotal(null as any);
```

### Prefer interfaces for object shapes, types for unions/utilities

```typescript
// ✅ Interface for object shapes
interface Shift {
  id: string;
  startTime: Date;
  endTime: Date;
  status: ShiftStatus;
}

// ✅ Type for unions
type ButtonState = 'idle' | 'loading' | 'success' | 'error';
```

### Enums vs const objects

Prefer `as const` objects over TypeScript enums for bundle size:

```typescript
// ✅ Preferred
export const ShiftStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  Cancelled: 'cancelled',
} as const;
export type ShiftStatus = typeof ShiftStatus[keyof typeof ShiftStatus];

// ⚠️ Acceptable but less preferred
export enum ShiftStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}
```

---

## Code quality rules

### Extract duplicates to constants

| Type | Threshold | Action |
|---|---|---|
| Strings | 3+ uses | Extract to named constant |
| Regex patterns | 2+ uses | Extract to named constant |
| ARIA attributes | 3+ uses | Extract to named constant |
| Button/UI text | Always | Use `as const` object |
| Complex CSS classes | Always | Extract to helper function |

```typescript
// ✅ Extracted constants
const BUTTON_TEXT = {
  IDLE: 'Add to Cart',
  LOADING: 'Adding...',
  SUCCESS: 'Added!',
} as const;

const ARIA_LABEL_REMOVE = /remove .* from cart/i;

// ✅ Extracted class logic
const getButtonClassName = (state: ButtonState): string => {
  if (state === 'idle') return 'bg-blue-600 hover:bg-blue-700';
  if (state === 'loading') return 'bg-blue-400 cursor-not-allowed';
  return 'bg-green-600';
};
```

### No nested ternaries

```typescript
// ❌ Nested ternary
className={state === 'idle' ? 'bg-blue-600' : state === 'loading' ? 'bg-blue-400' : 'bg-green-600'}

// ✅ Extracted function
className={getButtonClassName(state)}
```

### Error handling

```typescript
// ✅ Always log before handling
catch (err) {
  console.error('Failed to update shift:', err);
  setError('Unable to save changes. Please try again.');
}

// ❌ Silent catch
catch (error) {
  setLoading(false);
}

// ❌ Empty catch
catch {}
```

### Magic numbers and strings

```typescript
// ❌ Magic values
if (items.length >= 5) { discount = total * 0.1; }
if (total >= 100) { discount = total * 0.15; }

// ✅ Named constants
const BULK_DISCOUNT_THRESHOLD = 5;
const BULK_DISCOUNT_RATE = 0.1;
const ORDER_DISCOUNT_THRESHOLD = 100;
const ORDER_DISCOUNT_RATE = 0.15;

if (items.length >= BULK_DISCOUNT_THRESHOLD) {
  discount = total * BULK_DISCOUNT_RATE;
}
```

---

## Accessibility rules

### Semantic HTML first

```typescript
// ✅ Semantic element
<button onClick={handleClick}>Submit</button>
<nav aria-label="Main navigation">...</nav>

// ❌ ARIA on non-semantic element
<div role="button" onClick={handleClick}>Submit</div>
```

### ARIA usage

```typescript
// ✅ Dynamic aria-label
<button aria-label={`Remove ${item.name} from cart`}>×</button>

// ✅ Decorative elements hidden
<svg aria-hidden="true">...</svg>
<span aria-hidden="true">🛒</span>

// ✅ Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">{statusMessage}</div>
```

### Required accessibility patterns

- All interactive elements must be keyboard accessible
- All images must have `alt` text (empty `alt=""` for decorative)
- Form inputs must have associated labels
- Color must not be the only means of conveying information
- Focus management on route changes and modal open/close

---

## Import conventions

### Order (enforced by ESLint)

1. React / framework imports
2. Third-party libraries
3. Path alias imports (`@/`, `@features/`, `@shared/`)
4. Relative imports
5. Style imports

```typescript
// 1. React
import { useState, useCallback } from 'react';

// 2. Third-party
import { useQuery } from '@tanstack/react-query';

// 3. Alias imports
import { formatPrice } from '@shared/utils/formatPrice';
import { useAuth } from '@context/useAuth';

// 4. Relative
import { ShiftCard } from './components/ShiftCard';
import type { Shift } from './models';

// 5. Styles
import './shift-management.css';
```

### Type-only imports

```typescript
// ✅ Use type-only imports for types
import type { Shift, ShiftStatus } from './models';

// ❌ Mixed import when only types are needed
import { Shift, ShiftStatus } from './models';
```

---

## Inline comment rules

**Prohibited** (self-documenting code):
```typescript
// Set loading to true       ← obvious from setLoading(true)
// Map items                 ← obvious from items.map(...)
// TODO: implement later     ← without ticket reference
```

**Allowed only when:**
- Explaining a non-obvious business rule or domain decision
- Documenting a known framework workaround or browser quirk
- Referencing a ticket for deferred work: `// TODO(PLAN-123): implement offline sync`

---

## i18n rules

- All user-facing strings must be externalized from day one
- Use a translation key system (e.g., `t('shift.status.confirmed')`)
- Never hardcode Spanish or English strings directly in JSX
- Supported locales: `es` (Spanish), `en` (English)
- Date/time formatting must respect locale settings

## Styling rules (Tailwind v4 + CSS variables)

- **NEVER use `dark:` Tailwind utilities** — the project uses `.theme-dark` / `.theme-light` classes (not the standard `dark` class), so `dark:bg-*` utilities will never activate.
- **Use CSS custom properties via `style` attribute** for theme-adaptive colors: `style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}`
- **Available CSS variables** (defined in `src/app/theme/tokens.css`): `--color-primary`, `--color-bg`, `--color-surface`, `--color-text-primary`, `--color-text-secondary`, `--color-border`, `--color-error`, `--color-success`, `--color-scheme`
- **For native `input[type=time]`**: add `colorScheme: 'var(--color-scheme, light)'` in the style to ensure the browser renders time picker controls in the correct theme
- **Tailwind classes ARE safe for** layout utilities (`flex`, `gap-*`, `p-*`, `w-full`, `max-w-*`, `rounded-*`, `overflow-*`, `h-full`) but NOT reliable for arbitrary values with CSS variables (`bg-[var(--color-*)]`)
- **When Tailwind classes don't render**: Use inline `style` attributes with explicit pixel/rem values. This is preferred over debugging Tailwind scanner issues.
- **Page containers** must have padding (use `style={{ padding: '24px 32px' }}`) to separate content from the viewport edges

