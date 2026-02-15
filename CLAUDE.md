# CLAUDE.md

## Project Overview

FinTree is a personal finance management application with:
- **Backend**: .NET 10 Web API with Clean Architecture/DDD
- **Frontend**: Vue 3 + TypeScript + PrimeVue
- **Database**: PostgreSQL 18
- **Integrations**: Telegram Bot for transaction capture, FX rates API
- **Infrastructure**: Docker Compose, Nginx reverse proxy, Let's Encrypt SSL

## Product Context

**Target Users**: 25-35 year olds, average income, low financial literacy
- Need hints/tooltips for all financial terms
- Telegram bot (primary) for daily input, web app for review/analytics
- Quality bar: Stripe/Revolut-level UX, instant performance, mobile-first, dark mode essential

## Architecture

### Backend (Clean Architecture / DDD)

**Layers** (strict dependency flow: API → Application → Domain ← Infrastructure):

- **FinTree.Domain**: Entities, value objects, domain invariants. Zero infrastructure dependencies.
- **FinTree.Application**: Use cases, orchestration, transactional workflows. Depends only on domain abstractions.
- **FinTree.Infrastructure**: Persistence (EF Core), external integrations, DI configuration.
- **FinTree.Api**: Controllers, middleware, auth, HTTP boundary.

**Key patterns**:
- All operations scoped to current user via `ICurrentUser` abstraction
- Soft-delete unless explicitly approved
- Multi-step workflows must be atomic (transactions)
- No domain logic in controllers (thin transport layer)

### Frontend (Vue 3 + TypeScript)

**Structure** (`vue-app/src/`):
- `pages/`: Top-level routed components (AnalyticsPage, AccountsPage, TransactionsPage, InvestmentsPage, SettingsPage)
- `components/`: Reusable components (feature-specific, not global UI)
- `ui/`: Shared UI primitives (buttons, inputs, cards, modals)
- `stores/`: Pinia stores for state management
- `services/`: API client layer (centralized, typed)
- `composables/`: Reusable composition functions
- `router/`: Vue Router configuration
- `types.ts`: Global TypeScript type definitions
- `primevue-theme.css`, `style.css`, `styles/`: Design tokens and styling

**Key patterns**:
- API calls centralized in services layer (no ad-hoc requests in page components)
- Async states always explicit: `loading`, `empty`, `error`, `success`
- TypeScript strict mode (avoid implicit `any`)
- DTOs and UI models explicitly separated and mapped
- Mobile-first (≥360px width), minimum interactive hit area 44x44
- Design tokens: Use `--ft-*` prefix (e.g., `--ft-space-md`, `--ft-radius-lg`)
- Primary font: Inter; Mono: JetBrains Mono
- Forms validate in Russian with UI-friendly messages
- Destructive actions require confirmation

## Key Product Rules

**Telegram Bot**: Fast input over precision (users fix errors in web later), must feel instant
**Analytics**: Every metric needs tooltip (simple Russian), status indicators with color coding, progressive disclosure
**Subscription**: Full access with active sub, read-only without, payment history append-only
**Performance**: Don't block first render, lazy load non-critical data, paginate/virtualize large lists
**Security**: JWT auth, all ops auto-scoped to current user, soft-delete by default
**Validation**: UI-friendly Russian messages, all financial terms need hints/tooltips

## UI/UX Design System

> **Benchmark**: Stripe/Revolut-level polish. Every screen should feel like a premium fintech product.
> **Audience**: Low financial literacy users (25-35 y.o.) — clarity over density, always.

### Design Tokens

All tokens use `--ft-*` prefix, defined in `vue-app/src/assets/design-tokens.css`.

**Theming**:
- Dark is DEFAULT (`:root` = dark values)
- Light overrides via `.light-mode` selector
- Never use `.dark-mode` in component styles
- Only 2 themes (dark + light), no user customization
- CSS layers order: `@layer reset, tokens, base, components, primevue, overrides;`

**Token files**:
- `design-tokens.css` — primitive + semantic tokens (colors, spacing, typography, shadows, z-index)
- `styles/theme.css` — component-level aliases and shared UI classes (`@layer components`)
- `styles/prime-overrides.css` — PrimeVue overrides (`@layer overrides`)
- `style.css` — base resets, layout helpers (`@layer base`)

### Typography

**Font stack**:
- Body/UI: `Inter` (var `--ft-font-base`)
- Display/Headings: `Inter` (var `--ft-font-display`)
- Monospace/code/amounts: `JetBrains Mono` (var `--ft-font-mono`)

**Type scale** (rem-based for browser accessibility scaling):
| Token | Size | Use |
|---|---|---|
| `--ft-text-xs` | 12px | Captions, badges, meta text |
| `--ft-text-sm` | 14px | Secondary text, labels, table headers |
| `--ft-text-base` | 16px | Body text, form inputs, nav items |
| `--ft-text-lg` | 18px | Card titles, section subtitles |
| `--ft-text-xl` | 20px | Section headers |
| `--ft-text-2xl` | 24px | Page titles (mobile) |
| `--ft-text-3xl` | 32px | Page titles (desktop), hero stats |
| `--ft-text-4xl` | 40px | Hero display text |

**Weight rules**:
| Token | Weight | Use |
|---|---|---|
| `--ft-font-normal` (400) | Body text, descriptions |
| `--ft-font-medium` (500) | Nav links, form labels, secondary buttons |
| `--ft-font-semibold` (600) | Card titles, table headers, active nav, kickers |
| `--ft-font-bold` (700) | Page titles, hero stats, KPI values |

**Line height**:
- `--ft-leading-tight` (1.25): Headings, display text, KPI values
- `--ft-leading-normal` (1.5): Body text, descriptions, list items
- `--ft-leading-relaxed` (1.75): Long-form text, tooltips

**Financial amounts**: Always use `font-variant-numeric: tabular-nums` for aligned columns. For large KPI numbers, use `--ft-font-mono` with `--ft-font-bold`.

**Heading hierarchy per page**:
- `h1` — Page title (one per page, inside `PageHeader`)
- `h2` — Section title
- `h3` — Card title, subsection
- `h4` — Rarely used (nested subsection)
- Never skip heading levels

### Spacing System

**Scale** (4px base unit):
| Token | px | Common use |
|---|---|---|
| `--ft-space-1` | 4 | Icon-to-text gap, inline badge padding |
| `--ft-space-2` | 8 | Between related items, button icon gap, tab gap |
| `--ft-space-3` | 12 | Card internal gap, nav link padding, control group gap |
| `--ft-space-4` | 16 | Card padding (sm), section internal gap, form field gap |
| `--ft-space-5` | 20 | Card padding (md), stat card padding |
| `--ft-space-6` | 24 | Card padding (lg), surface panel padding, section gap |
| `--ft-space-8` | 32 | Page-level section gap, page container gap |
| `--ft-space-10` | 40 | Hero padding |
| `--ft-space-12` | 48 | Large section separator |

**Layout tokens** (responsive via `clamp()`):
- `--ft-layout-gutter`: Page horizontal padding (`clamp(16px, 3vw, 32px)`)
- `--ft-layout-page-padding`: Page vertical padding (`clamp(24px, 4vw, 40px)`)
- `--ft-layout-section-gap`: Gap between page sections (`clamp(24px, 3vw, 36px)`)
- `--ft-layout-card-gap`: Gap between cards in grid (`clamp(16px, 2vw, 24px)`)

**Spacing rules**:
- Inside cards/panels: `--ft-space-3` to `--ft-space-6` depending on card variant
- Between cards in grid: `--ft-space-4` (mobile) to `--ft-space-6` (desktop)
- Between page sections: `--ft-space-6` (mobile) to `--ft-space-8` (desktop)
- Form field vertical gap: `--ft-space-4`
- Button group gap: `--ft-space-3`
- Never use raw pixel values — always use spacing tokens

### Color & Contrast

**Semantic color roles**:
- `--ft-text-primary` on `--ft-bg-base`: Main content (WCAG AA minimum 4.5:1)
- `--ft-text-secondary` on `--ft-bg-base`: Supporting text (WCAG AA minimum 4.5:1)
- `--ft-text-tertiary`: Meta info, captions (WCAG AA minimum 3:1 for large text only)
- `--ft-text-disabled`: Disabled state (no contrast requirement, but must be visually distinct)

**Status colors** (always pair with icon or text, never color-only):
- Success: `--ft-success-500` — positive growth, income, completed actions
- Warning: `--ft-warning-500` — expiring subscriptions, approaching limits
- Danger: `--ft-danger-500` — losses, errors, destructive actions
- Info: `--ft-info-500` — neutral tips, informational tooltips

**Contrast rules**:
- Text on backgrounds: minimum 4.5:1 ratio (WCAG AA)
- Large text (≥18px bold or ≥24px): minimum 3:1 ratio
- Interactive elements borders: minimum 3:1 against adjacent colors
- Never rely on color alone for meaning — always pair with icons, text labels, or patterns
- Focus rings: 3px `--ft-focus-ring` with `outline-offset: 3px`

**Surface hierarchy** (dark theme):
```
--ft-bg-base (#0C1017)        ← page background
  --ft-bg-subtle (#111620)    ← subtle sections
    --ft-surface-base (#181F2C)   ← cards, panels
      --ft-surface-raised (#212A3C)  ← elevated cards, modals
        --ft-surface-overlay (#2A354A)  ← dropdowns, popovers
```

### Information Density

**Target**: Balanced (Revolut-style) — enough breathing room for low-literacy users, enough density for financial data.

**Density rules**:
- Dashboard/Analytics pages: Spacious layout, large KPI cards, generous spacing
- Transaction lists/tables: Moderate density, comfortable row height (≥48px rows)
- Forms/modals: Spacious, one logical group at a time
- Never pack more than 3-4 KPI cards in a single row
- Table rows: `padding-block: --ft-space-3` minimum for comfortable reading

**Content width**:
- Max page width: `1440px` (via `PageContainer`)
- Reading text max-width: `65ch` for body text
- Form max-width: `640px` (centered or left-aligned)
- Modal width: `480px` (sm), `640px` (md), `800px` (lg)

### Layout & Page Patterns

**App shell structure** (desktop ≥1024px):
```
┌─ TopNav (sticky, 72px) ─────────────────────┐
├─ Sidebar (240px, collapsible to 64px) ──┬────┤
│  - Nav links (4-5 items)                │    │
│  - Collapsible                          │Main│
│                                         │    │
└─────────────────────────────────────────┴────┘
```

**App shell structure** (mobile <1024px):
```
┌─ TopNav (sticky) ────────────────────────────┐
│  [☰ burger] [Logo]              [theme] [👤] │
├──────────────────────────────────────────────┤
│                                              │
│              Main Content                    │
│                                              │
├──────────────────────────────────────────────┤
│  Bottom Tab Bar (fixed, 4-5 items)           │
└──────────────────────────────────────────────┘
```

**Standard page layout**:
```vue
<PageContainer>
  <PageHeader title="..." subtitle="..." :breadcrumbs="[...]">
    <template #actions> <!-- Primary page action --> </template>
  </PageHeader>
  <UiSection> <!-- Toolbar / filters --> </UiSection>
  <UiSection> <!-- Main content (grid/table/list) --> </UiSection>
</PageContainer>
```

**Page types and their patterns**:

| Page Type | Layout | Components |
|---|---|---|
| Dashboard/Analytics | KPI grid + chart sections | `ft-stat-grid`, `ft-hero`, charts with `role="img"` |
| List page (Accounts) | Toolbar + card grid | `PageHeader`, filter card, `card-grid--auto` |
| Table page (Transactions) | Toolbar + DataTable | `table-shell`, `UiDataTable`, pagination |
| Detail/Form page (Profile) | Stacked sections | `surface-panel`, form groups, action bar |
| Empty state | Centered illustration + CTA | `EmptyState` component |

**Async state pattern** (mandatory for all data-driven views):
1. **Loading**: Skeleton placeholders (`UiSkeleton`) matching content shape
2. **Empty**: `EmptyState` with icon, message, action button
3. **Error**: Error card with retry button
4. **Success**: Actual content
5. **Filtered empty**: Distinct from "no data" — show "nothing found" + reset filters button

### Component Patterns

**Cards** (`UiCard`):
- Variants: `default` (raised surface), `muted` (base surface), `outlined` (transparent, no shadow)
- Padding: `sm` (12px), `md` (16px), `lg` (24px)
- Border radius: `--ft-radius-xl` (16px)
- Border: `1px solid --ft-border-default`
- Hover: `translateY(-2px)` + shadow increase (only for interactive cards)

**Buttons** (`UiButton`):
- Variants: `primary`, `secondary` (outlined), `ghost` (text), `danger`, `cta` (success gradient)
- Sizes: `sm` (44px height), `md` (48px), `lg` (52px) — all ≥44px minimum touch target
- Always have visible label on desktop; icon-only allowed only with `aria-label` + `title`
- Loading state: `loading` prop disables and shows spinner
- Destructive buttons: `danger` variant, always require confirmation dialog

**Forms**:
- Input height: minimum `--ft-control-height` (44px)
- Input border-radius: `--ft-radius-lg` (12px)
- Label: above input, `--ft-text-sm`, `--ft-font-medium`, `--ft-text-secondary`
- Error text: below input, `--ft-text-sm`, `--ft-danger-500`
- Group related fields visually with spacing, not with borders
- Validate on blur + on submit, show errors in Russian

**Tables** (`UiDataTable` / `table-shell`):
- Wrapped in `.table-shell` for consistent styling
- Sticky header with `--ft-surface-base` background
- Even rows: subtle primary tint (`color-mix(primary, 12%)` dark / `6%` light)
- Hover rows: stronger primary tint (`18%` dark / `10%` light)
- Row padding: `--ft-space-3` vertical
- Pagination for large datasets (transactions)
- On mobile (<768px): consider card-based list instead of table

**Modals/Dialogs**:
- PrimeVue Dialog with header hidden (custom header in content)
- Border-radius: `--ft-radius-xl`
- Mobile: `width: calc(100vw - 32px)`, `max-height: 90vh`
- Background: `--ft-surface-raised`
- Always have a close button or escape to dismiss
- Focus trap active while open

### Responsive Breakpoints

| Name | Width | Behavior |
|---|---|---|
| Mobile | ≤640px | Single column, bottom tab bar, full-width cards, stacked controls |
| Tablet | 641-1023px | 2-column grids, bottom tab bar or drawer nav |
| Desktop | ≥1024px | Sidebar nav, multi-column grids, full toolbars |

**Responsive rules**:
- Grid columns: `1fr` on mobile → `repeat(auto-fill, minmax(300px, 1fr))` on desktop
- Page padding: `--ft-space-2` (mobile) → `--ft-space-4` (desktop)
- Section gap: `--ft-space-6` (mobile) → `--ft-space-8` (desktop)
- Card padding reduces by one step on mobile
- Controls stack vertically on mobile (`grid-template-columns: 1fr`)
- Tab bars stretch full-width on mobile
- Never horizontal scroll on any breakpoint
- Test all layouts at 360px minimum width

### Border Radius

| Token | px | Use |
|---|---|---|
| `--ft-radius-sm` | 6 | Small badges, inline tags |
| `--ft-radius-md` | 8 | Buttons (small), calendar cells, icon containers |
| `--ft-radius-lg` | 12 | Inputs, buttons, nav links, dropdowns, tabs |
| `--ft-radius-xl` | 16 | Cards, panels, modals, dialogs, table shells |
| `--ft-radius-2xl` | 24 | Hero cards, featured sections |
| `--ft-radius-full` | 9999px | Pills, avatars, circular icon buttons |

### Shadows

- `--ft-shadow-xs`: Subtle lift for inline elements
- `--ft-shadow-sm`: Default card shadow
- `--ft-shadow-md`: Primary buttons, elevated cards
- `--ft-shadow-lg`: Modals, dialogs
- `--ft-shadow-xl`/`--ft-shadow-2xl`: Hero sections, tooltips
- Shadows are stronger in dark theme (higher opacity) vs light theme

### Z-Index Scale

| Token | Value | Use |
|---|---|---|
| `--ft-z-base` | 0 | Default stacking |
| `--ft-z-above` | 1 | Within-component stacking (e.g., badge on card) |
| `--ft-z-raised` | 2 | Sticky table headers |
| `--ft-z-dropdown` | 1000 | Dropdowns, select panels |
| `--ft-z-sticky` | 1020 | Sticky top nav |
| `--ft-z-drawer` | 1030 | Side drawer (mobile nav) |
| `--ft-z-modal` | 1040 | Modal dialogs |
| `--ft-z-popover` | 1050 | Popovers, context menus |
| `--ft-z-toast` | 1060 | Toast notifications |
| `--ft-z-tooltip` | 1070 | Tooltips (always on top) |

### Motion & Transitions

- `--ft-transition-fast` (150ms): Hover states, focus rings, color changes
- `--ft-transition-base` (220ms): Panel open/close, accordion, tab switch
- `--ft-transition-slow` (350ms): Page transitions, drawer slide
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` — snappy with natural decel
- Card hover: `translateY(-2px)` + shadow change
- Button hover: `translateY(-1px)` + glow shadow
- `prefers-reduced-motion: reduce` disables all animations
- No decorative animations — motion is functional only (state change indicator)

### Accessibility (Mandatory)

**Semantics**:
- Use semantic HTML: `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`
- Skip link to `#main-content` (already implemented)
- One `<h1>` per page, heading hierarchy never skipped
- Lists use `<ul>`/`<ol>`, not divs
- Tables have proper `<thead>`, `<tbody>`, `<th scope>`

**Interactive elements**:
- Minimum touch target: 44x44px (`--ft-control-height`)
- All interactive elements keyboard-accessible
- Focus visible: `outline: 2px solid --ft-primary-500; outline-offset: 3px`
- Tab order matches visual order
- Custom tabs use `role="tablist"`, `role="tab"`, `aria-selected`
- Modals trap focus, close on Escape

**ARIA patterns**:
- Loading states: `aria-busy="true"` on container
- Live regions for toasts/notifications: `aria-live="polite"`
- Icons that are decorative: `aria-hidden="true"`
- Icons that are informational: `aria-label="..."`
- Charts/visualizations: `role="img"` + descriptive `aria-label`
- Read-only banners: `role="status"` + `aria-live="polite"`

**Color**:
- Never convey meaning by color alone — always pair with icon + text
- Status badges: icon + color + text label
- Form errors: red border + error message text

### Financial Data Display

**Currency formatting**:
- Use `Intl.NumberFormat('ru-RU')` with appropriate currency code
- Thousands separator: space (Russian standard)
- Decimal separator: comma
- Always show currency symbol/code
- Negative amounts: `−` (minus sign, not hyphen) + `--ft-danger-500` color
- Positive growth: `+` prefix + `--ft-success-500` color

**Numbers in tables/lists**:
- Right-align monetary amounts
- Use `font-variant-numeric: tabular-nums` for columnar alignment
- KPI values: `--ft-font-mono`, `--ft-font-bold`, `--ft-text-2xl`+
- Percentage changes: colored badge with arrow icon

**Tooltips for financial terms**:
- Every financial metric/term needs a tooltip in simple Russian
- Tooltip trigger: `(i)` icon or dotted underline on term
- Tooltip content: 1-2 sentences max, simple language, no jargon
- Example: "Ликвидность — это возможность быстро получить деньги с этого счёта"

## Localization

**Russian only**: All UI text, validation messages, financial hints in simple Russian
**Formats**: Standard Russian date/number formats
**Currency**: Multi-currency with base currency setting

## Critical Constraints

### Backend
- Respect DDD layers (API → Application → Domain ← Infrastructure)
- No domain logic in controllers
- API errors: consistent payload, unambiguous HTTP status
- Multi-step workflows must be atomic (transactions)

### Frontend
- API calls in services layer only (no ad-hoc requests in components)
- Async states explicit: `loading`, `empty`, `error`, `success`
- TypeScript strict mode (no implicit `any`)
- No expensive deep-watch usage
- Always ask: "Will low financial literacy users understand this?"