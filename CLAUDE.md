# CLAUDE.md

## Commands

```bash
cd vue-app && npm run build   # Type-check + Vite build
```

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
Full token tables (typography, spacing, colors, radius, shadows, z-index, motion): see **[DESIGN-TOKENS.md](./DESIGN-TOKENS.md)**.

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