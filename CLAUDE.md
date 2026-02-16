# CLAUDE.md

## Commands

```bash
cd vue-app && npm run build   # Type-check + Vite build
```

## UI/UX

When working with ui/ux or any frontend visuals, consider to check full token tables (typography, spacing, colors, radius, shadows, z-index, motion) at **[DESIGN.md](./DESIGN.md)**.


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

**Working with PrimeVue Components**:

Our `ui/` components (e.g., `UiButton`, `UiCard`) wrap PrimeVue primitives. Critical architectural points:

- **Wrapper Structure**: PrimeVue components render as the root element, not nested. `<UiButton>` renders as `<button class="p-button ui-button">`, not `<div class="ui-button"><button class="p-button">`. This affects CSS selectors.

- **Overriding PrimeVue Styles**:
  - Do NOT use `:deep(.p-button)` for root-level PrimeVue elements — selector won't match
  - Target wrapper classes directly: `.ui-button--icon-only { gap: 0 !important; }`
  - Use `!important` when overriding library defaults (justified to enforce design system)
  - Use `:deep()` only for nested PrimeVue internals (e.g., `.ui-button :deep(.p-button-icon)`)

- **Component Variations**: Auto-detect via `computed`, never manual props:
  ```ts
  const isIconOnly = computed(() => props.icon && !props.label)
  const buttonClasses = computed(() => [
    'ui-button',
    { 'ui-button--icon-only': isIconOnly.value }
  ])
  ```

- **Quality Policy**: Fix broken components immediately when discovered (e.g., misaligned icons due to PrimeVue `gap`/`padding`). Don't defer UI bugs — they compound and erode UX quality bar.

**Premium Visual Patterns** (Stripe/Revolut quality):

- **Frosted glass effects**: `backdrop-filter: blur(12px)` + gradient backgrounds (top nav, bottom bar, modals)
- **Gradient badges**: Logo and avatar use `linear-gradient(135deg, primary-500, primary-600)` + glow shadow
- **Active state signatures**:
  - `::before` pseudo-element with gradient background (opacity 0 → 1 on active)
  - Inset border glow: `box-shadow: inset 0 0 0 1px color-mix(...)`
  - Outer glow shadow with primary color tint
- **Hover microinteractions**:
  - Icons scale 1.05x–1.08x + color shift to primary-400
  - Lift animations: `translateY(-1px)` or `translateY(-2px)`
  - Enhanced shadow on lift
- **Status indicators**: Always color + icon + text (never color alone for accessibility)
- **Gradient dividers**: Not solid lines — fade from transparent to color to transparent
- **Button hierarchy**: Primary (gradient bg) > Secondary (outline) > Ghost (text) > Danger (red theme)
- **Z-index layering**: Use `position: relative; z-index: 0/1` for pseudo-elements to prevent overlap issues

## Key Product Rules

**Telegram Bot**: Fast input over precision (users fix errors in web later), must feel instant
**Analytics**: Every metric needs tooltip (simple Russian), status indicators with color coding, progressive disclosure
**Subscription**: Full access with active sub, read-only without, payment history append-only
**Performance**: Don't block first render, lazy load non-critical data, paginate/virtualize large lists
**Security**: JWT auth, all ops auto-scoped to current user, soft-delete by default
**Validation**: UI-friendly Russian messages, all financial terms need hints/tooltips

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