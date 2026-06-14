---
inclusion: fileMatch
fileMatchPattern: "frontend/**"
---

# Design System — Planixor

Brand identity, color palette, typography, and UI patterns for all Planixor clients (web and mobile).

---

## Brand

- **Name:** Planixor
- **Tagline (ES):** "Organiza tu tiempo. Potencia tu día."
- **Tagline alt (ES):** "Tu calendario. Tu equipo. Tu control."
- **Logo:** Stylized "P" icon with blue-to-purple gradient + "Planixor" wordmark in Poppins Bold
- **Favicon/App icon:** "P" symbol on navy rounded-square background

### Logo usage

| Variant | Background | Icon color | Text color |
|---|---|---|---|
| Light mode | White/light surface | Gradient (blue→purple) | Dark navy (`#1A1F3D`) |
| Dark mode | Navy/dark surface | Gradient (blue→purple) | White (`#FFFFFF`) |
| Monochrome light | White | Navy | Navy |
| Monochrome dark | Navy | White | White |

Rules:
- Always maintain clear space around the logo (minimum: height of the "P" icon)
- Never stretch, rotate, or recolor the gradient icon
- Minimum size: 24px height for icon-only, 80px width for full logo

---

## Color Palette

### Primary colors

| Name | Hex | Usage |
|---|---|---|
| Blue | `#2563EB` | Primary actions, links, active states, selected navigation |
| Purple | `#7C3AED` | Secondary accent, gradients, highlights |
| Teal | `#0B86D4` | Tertiary accent, informational elements |
| Green | `#10B981` | Success states, positive indicators, confirmations |
| Light Gray | `#F3F4F6` | Backgrounds, surfaces, cards (light mode) |

### Gradient

- **Brand gradient:** `linear-gradient(135deg, #2563EB, #7C3AED)` — used for logo icon, primary CTAs, and hero elements
- **Accent gradient:** `linear-gradient(135deg, #0B86D4, #10B981)` — used for secondary highlights

### Semantic colors

| Role | Light mode | Dark mode | Usage |
|---|---|---|---|
| Background | `#FFFFFF` | `#0F1629` (deep navy) | Page/screen background |
| Surface | `#F3F4F6` | `#1A2035` | Cards, panels, sidebar |
| Surface elevated | `#FFFFFF` | `#232B3E` | Modals, dropdowns, popovers |
| Text primary | `#1A1F3D` | `#FFFFFF` | Headings, body text |
| Text secondary | `#6B7280` | `#9CA3AF` | Descriptions, labels, metadata |
| Border | `#E5E7EB` | `#2D3748` | Dividers, card borders |
| Primary | `#2563EB` | `#3B82F6` | Buttons, links, active items |
| Success | `#10B981` | `#34D399` | Confirmations, positive metrics |
| Warning | `#F59E0B` | `#FBBF24` | Alerts, attention needed |
| Error/Danger | `#EF4444` | `#F87171` | Errors, destructive actions |

### Shift type colors (calendar blocks)

| Shift type | Color | Hex (approx) |
|---|---|---|
| Mañana (morning) | Green | `#10B981` |
| Tarde (afternoon) | Purple/blue | `#7C3AED` |
| Noche (night) | Blue | `#2563EB` |
| Events/appointments | Orange/coral | `#F97316` |
| Meetings | Red | `#EF4444` |
| Personal | Teal | `#0B86D4` |

---

## Typography

### Font family

**Poppins** — Google Fonts, sans-serif geometric

```
Font import: https://fonts.google.com/specimen/Poppins
Weights needed: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
```

### Type scale

| Element | Size | Weight | Line height |
|---|---|---|---|
| H1 (page title) | 28–32px | 700 (Bold) | 1.2 |
| H2 (section title) | 22–24px | 600 (SemiBold) | 1.3 |
| H3 (card title) | 18–20px | 600 (SemiBold) | 1.3 |
| Body | 14–16px | 400 (Regular) | 1.5 |
| Body small | 12–13px | 400 (Regular) | 1.4 |
| Label / caption | 11–12px | 500 (Medium) | 1.4 |
| Button | 14–16px | 600 (SemiBold) | 1.0 |
| Navigation item | 14px | 500 (Medium) | 1.0 |

### Mobile adjustments

- H1: 24px
- H2: 20px
- Body: 14px
- Minimum touch target: 44×44px

---

## UI Patterns

### Layout — Web (React PWA)

```
┌─────────────────────────────────────────────────────┐
│ Sidebar (240px)  │  Main content area               │
│                  │                                   │
│ Logo (P icon +   │  Top Bar [FIXED — GLOBAL, route-level]│
│  "Planixor")     │  (page title left, +/bell/avatar right)│
│ Navigation       │                                   │
│  • Calendario    │  View Selector + Date Navigator  │
│  • Informes      │                                   │
│  • Turnos        │  Content (scrollable area only): │
│  • Recordatorios │    calendar views, reports, etc. │
│  • Ajustes       │                                   │
│                  │  Right panel (optional, ≥1024px): │
│                  │    Weekly summary, quick stats    │
└─────────────────────────────────────────────────────┘
```

- Sidebar: fixed (`height: 100%`), no page-level scroll. Logo at top, navigation items below. No user profile section.
- Active nav item: highlighted with primary color background tint
- Main content: only the calendar/content area scrolls; top bar stays fixed
- Layout uses `height: 100vh; overflow: hidden` at the root grid level
- Mobile (<768px): Logo "P" + "Planixor" + page title (smaller, grey) on left; "+" (icon only, only on Calendar) + bell + avatar on right; bottom nav (icons only, no labels) replaces sidebar

### Layout — Mobile (Android & Web <768px)

```
┌──────────────────────────────────────────┐
│ Top Bar: Logo "P" + "Planixor · {Page}"  │
│          right: + (calendar only) bell av│
├──────────────────────────────────────────┤
│                                          │
│  Content area                            │
│  (scrollable)                            │
│                                          │
├──────────────────────────────────────────┤
│ Bottom navigation (icons only, no labels)│
└──────────────────────────────────────────┘
```

- Bottom navigation order: Calendar, Reports, Shifts, Reminders, Settings
- Bottom navigation: icons only, no text labels on either platform
- Cards: rounded corners (12–16px radius), subtle shadow
- FAB: bottom-right, gradient (blue→purple)

### Components

| Component | Description |
|---|---|
| Calendar (weekly) | Grid with time slots (rows) × days (columns), colored blocks for shifts |
| Shift block | Rounded rectangle with shift type color, time range, optional label |
| Summary card | White/surface card with icon, metric value, and label |
| Quick stats | Horizontal row of small metric cards (hours worked, shifts completed, etc.) |
| Bar chart | Vertical bars for daily/weekly metrics, colored by shift type |
| Donut chart | Total hours with breakdown by shift type |
| Action button | Primary gradient or solid blue, rounded (8px), Poppins SemiBold |
| Navigation item | Icon + text, vertical stack in sidebar (web) or horizontal in bottom nav (mobile) |

### Spacing system

Base unit: 4px

| Token | Value | Usage |
|---|---|---|
| xs | 4px | Tight spacing (icon-to-text) |
| sm | 8px | Compact elements |
| md | 16px | Default padding, gaps |
| lg | 24px | Section spacing |
| xl | 32px | Page margins, large gaps |
| 2xl | 48px | Section separators |

### Border radius

| Element | Radius |
|---|---|
| Buttons | 8px |
| Cards | 12px |
| Modals | 16px |
| App icon | 20% of size |
| Avatars | 50% (circle) |
| Shift blocks | 8px |

### Shadows (light mode)

```css
/* Card shadow */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);

/* Elevated (modals, dropdowns) */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06);
```

Dark mode: reduce shadow opacity by 50%, rely more on surface color differentiation.

---

## Iconography

- Style: outlined/linear, 24px default size, 1.5px stroke
- Source: consistent icon set (Lucide, Heroicons, or similar)
- Navigation icons: Calendar, Users/Team, AlarmClock/Alarm (Reminders), BarChart, Bell (top bar notifications only), Settings
- Feature icons from brand: Calendario, Turnos de trabajo, Control de horas, Informes, Recordatorios

---

## Dark Mode / Light Mode

- Both modes are first-class — design for both from day one
- User preference respected (system setting or manual toggle)
- Never rely on shadows alone for elevation in dark mode — use surface color steps
- Text contrast must meet WCAG AA (4.5:1 for body, 3:1 for large text)
- Shift block colors remain consistent across modes (slightly adjusted for contrast)

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Single column, bottom nav, compact cards |
| Tablet | 768–1024px | Collapsed sidebar (icons only), 2-column content |
| Desktop | > 1024px | Full sidebar, multi-column content, right panel |

---

## Rules

- All UI implementations must reference this design system for colors, typography, and spacing
- Never introduce new colors outside the palette without updating this document
- Maintain consistent border radius and spacing tokens across platforms
- Both light and dark mode must be supported — no light-only or dark-only components
- Accessibility: all interactive elements must have sufficient contrast and focus indicators
- The brand gradient is reserved for the logo and primary CTAs — do not overuse
- **Navigation order** (both platforms): Calendar, Reports, Shifts, Reminders, Settings
- **No user profile in sidebar/bottom nav** — user management is exclusively via the top bar (avatar button)
- **Sidebar must have logo** at the top: gradient "P" icon + "Planixor" text (collapsed: icon only)
- **Mobile top bar must show logo** (left-aligned) when sidebar is hidden (<768px)
- **Page-level scroll disabled** on web — only content areas scroll; sidebar and top bar remain fixed
- **Scrollbars** (web): Styled thin, using `--color-border` for thumb (adapts to light/dark theme automatically)
- **Calendar views do NOT show empty state text** — an empty grid/timeline is sufficient; no "No events" message overlaid
- **Android bottom nav**: icons only, no text labels at all (removed `alwaysShowLabel` entirely)
- **Mobile web bottom nav**: icons only, no text labels
- **Android top bar**: Logo "P" (gradient) + "Planixor · {PageTitle}" format left; "+" button (only on Calendar) + notifications bell + user avatar right (mirrors web mobile layout)
- **Android segmented buttons** (ViewSelector + Reports TimeRangeSelector): no checkmark icon — use `icon = {}` to hide the default selected check indicator
- **Top bar is global** (defined at route/AppShell level, not per-page): shows page title on the left, actions on the right
- **Page titles only in top bar** — individual pages (ReportsPage, SettingsPage, etc.) do NOT render their own title heading
- **"New Event" button**: only visible when the user is on the Calendar page (both web and Android top bar)
- **Recordatorios (Reminders) icon**: AlarmClock (web: `lucide-react`) / Alarm (Android: `Icons.Outlined.Alarm`). Bell/Notifications icon is reserved exclusively for the top bar notifications button.
- **Default calendar view**: Day (not Week) on both platforms. Persisted view restores on subsequent launches.
- **Current time indicator** (Day View): horizontal blue line with circle marker (Google Calendar style) shown on both platforms; view auto-scrolls to center the current hour on open
- **Android app icon**: White "P" letter on blue→purple gradient background (adaptive icon format)
- **Android theme/locale switching**: Applied immediately without app restart (AppCompatDelegate for locale, Compose recomposition for theme)
- **ThemeViewModel shared at Activity scope** (Android): Use `CompositionLocalProvider` so all screens reference the same instance

