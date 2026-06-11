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

- **Fixed left sidebar** with vertical navigation:
  - Home
  - Calendar
  - Shifts
  - Team
  - Reports
  - Reminders
  - Settings
- **Main area** with adaptive content (weekly calendar, lists, charts)
- **Right side panel** (optional/collapsible) with:
  - Weekly summary (hours worked, completed shifts)
  - Next shift
  - Quick reports (compact bar charts)
- **Header**: search, notifications, user avatar, "New event" button
- **Calendar views**: Day / Week / Month with navigation selector

## Layout — Android App

- **Bottom navigation bar** with icons:
  - Calendar
  - Shifts (team)
  - Clock (time tracking)
  - Reports (charts)
  - Notifications (bell)
- **Header**: hamburger menu + "Planixor" logo + action button (+)
- **Main content**: compact view with mini monthly calendar and day event list
- **Cards** for shifts and events with a left-side color indicator (by category/shift)

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
