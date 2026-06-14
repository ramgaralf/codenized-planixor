# Design & Branding: Planixor

Visual and design guide for all Planixor interfaces (React Web PWA and Android App). Both clients must follow this identity consistently.

## Reference designs

The following images are the authoritative visual reference for Planixor's UI, branding, and layout. All implementations must match these designs:

- [Brand & UI Reference 1](planixor-image-1.png)
- [Brand & UI Reference 2](planixor-image-2.png)

> **Note**: These images define the logo, color palette, typography, layout structure, component styling, and overall look-and-feel. When in doubt, refer to them as the source of truth.

## Logo

- **Symbol**: Stylized letter "P" with an arrow/direction shape, in a blue-to-purple gradient
- **Logotype**: "Planixor" in Poppins Bold
- **Variants**:
  - Light logo (colored symbol + dark text) — for light backgrounds
  - Dark logo (colored symbol + white text) — for dark backgrounds
  - Favicon: symbol only on dark blue background with rounded corners
- **Taglines**:
  - Primary: "Organiza tu tiempo. Potencia tu día."
  - Secondary: "Tu calendario. Tu equipo. Tu control."

## Color palette

| Token | Hex | Usage |
|---|---|---|
| `primary-blue` | `#2563EB` | Primary color, primary buttons, links, active elements |
| `primary-purple` | `#7C3AED` | Accents, gradients with primary-blue, highlighted elements |
| `accent-teal` | `#0B86D4` | Secondary, badges, indicators |
| `accent-green` | `#10B981` | Success states, confirmations, positive charts |
| `neutral-light` | `#F3F4F6` | Light backgrounds, cards, dividers |
| `background-dark` | `#0F172A` | Dark mode background |
| `surface-dark` | `#1E293B` | Cards and panels in dark mode |
| `text-primary-light` | `#111827` | Primary text in light mode |
| `text-primary-dark` | `#F9FAFB` | Primary text in dark mode |
| `text-secondary` | `#6B7280` | Secondary text, labels, placeholders |

### Gradients

- **Primary gradient**: `primary-blue` → `primary-purple` (used in logo symbol and highlighted elements)

## Typography

| Usage | Font | Weight |
|---|---|---|
| Headings (h1–h3) | Poppins | Bold (700) |
| Subheadings (h4–h6) | Poppins | SemiBold (600) |
| Body text | Poppins | Regular (400) |
| Labels and captions | Poppins | Medium (500) |
| Numbers and data | Poppins | SemiBold (600) |

- **Single family**: Poppins for the entire interface (headings, body, UI elements)
- **Loading**: Google Fonts or self-hosted for performance

## Themes: Light mode and dark mode

Both clients MUST support light mode and dark mode.

### Light mode
- General background: `#FFFFFF`
- Card/panel background: `#F3F4F6`
- Sidebar: white background with `primary-blue` active elements
- Text: `#111827` (primary), `#6B7280` (secondary)

### Dark mode
- General background: `#0F172A`
- Card/panel background: `#1E293B`
- Sidebar: dark background with `primary-blue` active elements
- Text: `#F9FAFB` (primary), `#9CA3AF` (secondary)

## Layout — React Web (PWA)

- **Fixed left sidebar** with vertical navigation (no user profile section — user management via topbar):
  - Logo ("P" gradient icon + "Planixor" text) at the top
  - Calendar (default/active on load)
  - Reports
  - Shifts
  - Reminders
  - Settings
- **Main area** with adaptive content:
  - **Fixed top bar** (does NOT scroll, global — defined at route/AppShell level, not per-page): notifications (Bell icon), user avatar, "New event" button (only visible on Calendar page)
  - **Scrollable content**: calendar views, reports, settings
- **Right side panel** (optional/collapsible, ≥1024px only) with:
  - Weekly summary (hours worked, completed shifts)
  - Next shift
  - Quick reports (compact bar charts)
- **Mobile top bar** (<768px): Logo "P" + "Planixor" + page title (smaller, grey) on left; "+" (icon only, only on Calendar page) + bell + avatar on right
- **Calendar views**: Day / Week / Month / Year with navigation selector
- **Scrollbar**: Styled with theme-adaptive colors (light border in light mode, dark border in dark mode)
- **Layout constraint**: Page-level scroll disabled (`height: 100vh; overflow: hidden`). Only the calendar content area scrolls. Sidebar and top bar remain fixed.

## Layout — Android App

- **Top app bar** (fixed, does NOT scroll):
  - Left: Logo "P" (gradient icon) + "Planixor · {PageTitle}" format
  - Right: "+" button (only on Calendar page) + Notifications bell icon + User avatar icon (both stubs for now)
- **Bottom navigation bar** with icons (same order as web sidebar):
  - Calendar (default/active on load)
  - Reports
  - Shifts
  - Reminders
  - Settings
  - **Icons only, no text labels** (all items show icon only, no `alwaysShowLabel`)
- **Main content**: scrollable calendar views (Day/Week/Month/Year)
- **ViewSelector + DateNavigator**: below the top bar, inside the calendar screen content
- **FAB**: gradient button for quick event creation
- **Cards** for shifts and events with a left-side color indicator (by category/shift)
- **No user profile section in navigation** — user management via top bar avatar icon
- **App icon**: "P" white letter on blue→purple gradient background (adaptive icon)
- **Splash screen**: Navy dark background (`#0F172A`) shown while app loads
- **Theme switching**: Managed via ThemeViewModel shared at Activity scope; applied immediately without restart
- **Language switching**: Applied via `AppCompatDelegate.setApplicationLocales()` for immediate effect without restart

## Shared UI components

### Event/shift cards
- Left border with color indicator for shift or event type
- Colors by shift:
  - Morning: light blue / cyan
  - Afternoon: violet / purple
  - Night: dark indigo
  - Personal events: green
  - Urgent/alerts: red / orange
- Rounded corners (`border-radius: 8px–12px`)
- Soft shadow in light mode, no shadow in dark mode (use subtle borders)

### Buttons
- **Primary**: `primary-blue` background, white text, rounded corners
- **Secondary**: `primary-blue` border, transparent background, `primary-blue` text
- **Floating Action Button (FAB)**: `primary-blue` → `primary-purple` gradient (Android and web for "New event")

### Charts and reports
- Bar charts for hours worked per weekday
- Donut chart for hour distribution by shift type
- Chart colors aligned with the palette (blue, purple, teal, green)

### Icons
- Style: outline, consistent with the minimalist aesthetic
- Recommended set: Lucide Icons or similar (thin line, geometric)

## Spacing and grid

- Base unit: `4px`
- Element spacing: multiples of 4 (`8px`, `12px`, `16px`, `24px`, `32px`)
- Border radius: `8px` for cards, `12px` for modals, `full` for avatars and badges
- Sidebar width (web): `240px` collapsed to `64px` (icons only)

## Responsive (Web)

- **Desktop** (≥1024px): expanded sidebar + content + side panel
- **Tablet** (768–1023px): collapsed sidebar (icons) + full-width content
- **Mobile** (≤767px): no sidebar, bottom navigation (similar to Android), vertical content stack

## Rules

- Both clients (React Web and Android) MUST respect this palette, typography, and visual style
- The logo MUST NEVER be modified in proportions or colors — always use official variants
- Dark mode is not optional — both clients must implement it from the start
- Shift colors must be consistent across platforms
- All iconography must be from the same set (do not mix styles)
- Report charts use exclusively colors from the defined palette
- Design prioritizes readability and cleanliness — avoid unnecessary decoration
- **Navigation order** (both platforms): Calendar, Reports, Shifts, Reminders, Settings
- **No user profile in sidebar/bottom nav** — user access is exclusively via the top bar avatar icon
- **Calendar views do NOT show "no events" empty state text** — an empty grid is sufficient indication
- **Android bottom nav**: icons only, no text labels at all (removed `alwaysShowLabel`)
- **Mobile web bottom nav**: icons only, no text labels
- **Top bar is shared across platforms**: Logo left + notifications/avatar right (web mobile + Android)
- **Top bar is global** (defined at route/AppShell level, not per-page): shows page title on the left, actions on the right
- **Page titles are shown only in the top bar** — individual pages do NOT render their own title heading
- **"New Event" button**: only visible when the user is on the Calendar page (both web and Android top bar)
- **Recordatorios (Reminders) navigation icon**: AlarmClock (web: `lucide-react` AlarmClock) / Alarm (Android: `Icons.Outlined.Alarm`). Bell/Notifications icon is reserved exclusively for the top bar notifications button.
- **Default calendar view**: Day (not Week) on both platforms
- **Current time indicator** (Day View): horizontal blue line with a circle marker (Google Calendar style) on both platforms; the view auto-scrolls to center the current hour on open
- **Theme and language changes** must apply immediately without requiring app restart on both platforms
