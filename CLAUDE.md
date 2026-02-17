# CLAUDE.md

**Quick Reference:** [DESIGN.md](./DESIGN.md) for design tokens, visual patterns, and UI/UX guidelines.

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

**Target Users:** 25-35 y.o., average income, low financial literacy
- Hints/tooltips mandatory for all financial terms
- Primary input: Telegram bot → Review/analytics: Web app
- **Quality bar:** Stripe/Revolut-level UX, instant performance, mobile-first, dark-default

## Development Principles

**Code Quality:**
- ✓ **Simple > Clever** — Prefer readable, obvious code over "smart" abstractions
- ✓ **Extend, don't modify** — Design for extension (open/closed principle)
- ✓ **YAGNI** — Don't build features/abstractions until actually needed
- ✓ **DRY with judgment** — Eliminate duplication, but don't force premature abstractions
- ✓ **Explicit > Implicit** — Avoid magic, prefer clear data flow and dependencies
- ✓ **Modern standards** — Use current language/framework idioms (C# 13, Vue 3 Composition API, ES2024+)

**Component & Style Architecture:**
- ✓ **Atomic design** — Small, composable components over monoliths
- ✓ **Single responsibility** — Components do one thing well
- ✓ **Design tokens first** — Never hardcode values; always use `--ft-*` tokens
- ✓ **CSS layers** — Respect layer order; never fight specificity with `!important` stacking
- ✓ **Scoped styles** — Component styles are scoped; shared patterns go to `theme.css`
- ✓ **No style duplication** — Shared patterns become utilities or tokens, not copy-paste
- ✓ **Consistent patterns** — Follow established conventions (e.g., `UiButton` patterns apply to all buttons)

**Maintainability First:**
- ✓ **Self-documenting code** — Names explain intent; comments explain "why", not "what"
- ✓ **Predictable structure** — Follow project conventions; no surprises
- ✓ **Fail fast** — Validate early, return early, make invalid states unrepresentable
- ✓ **Testable by default** — Separate concerns, inject dependencies, avoid tight coupling
- ✓ **Delete over disable** — Remove unused code; don't comment out or feature-flag dead paths

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

**Directory Structure** (`vue-app/src/`):
| Folder | Purpose |
|--------|---------|
| `pages/` | Routed page components (Analytics, Accounts, Transactions, Investments, Settings) |
| `components/` | Feature-specific reusable components |
| `ui/` | Shared UI primitives (buttons, inputs, cards, modals) |
| `stores/` | Pinia state management |
| `services/` | API client layer (centralized, typed) |
| `composables/` | Reusable composition functions |
| `router/` | Vue Router config |
| `types.ts` | Global TypeScript types |
| `assets/design-tokens.css` | `--ft-*` design tokens |
| `styles/` | Theme, overrides, base styles |

**Core Patterns:**
- API calls **only** in services layer — never in components
- Async states **must be explicit:** `loading`, `empty`, `error`, `success`
- TypeScript strict mode — no implicit `any`
- DTOs ≠ UI models — always map explicitly
- Mobile-first (≥360px), min touch target 44×44px
- Fonts: Inter (UI), JetBrains Mono (amounts/code)
- Validation in Russian, destructive actions require confirmation

**Working with PrimeVue Components**:

Our `ui/` components (e.g., `UiButton`, `UiCard`) wrap PrimeVue primitives. Critical architectural points:

- **Input Wrappers Are Mandatory**: In `pages/` and `components/`, always use controls from `vue-app/src/ui` (`UiInputText`, `UiInputNumber`, `UiSelect`, `UiDatePicker`, `UiSelectButton`, etc.). Do not import PrimeVue input controls directly outside `src/ui/*`.

- **Wrapper Structure**: PrimeVue components render as the root element, not nested. `<UiButton>` renders as `<button class="p-button ui-button">`, not `<div class="ui-button"><button class="p-button">`. This affects CSS selectors.

- **Overriding PrimeVue Styles**:
  - Do NOT use `:deep(.p-button)` for root-level PrimeVue elements — selector won't match
  - Target wrapper classes directly: `.ui-button--icon-only { gap: 0 !important; }`
  - Use `!important` when overriding library defaults (justified to enforce design system)
  - Use `:deep()` only for nested PrimeVue internals (e.g., `.ui-button :deep(.p-button-icon)`)
  - For `Ui*` wrappers, do NOT target wrapper roots with descendant selectors like `.field :deep(.p-inputnumber)` / `.field :deep(.p-datepicker)`. Root styling must be applied to wrapper class itself (e.g., `.field`) and `:deep()` must remain for nested internals only.

- **Component Variations**: Auto-detect via `computed`, never manual props:
  ```ts
  const isIconOnly = computed(() => props.icon && !props.label)
  const buttonClasses = computed(() => [
    'ui-button',
    { 'ui-button--icon-only': isIconOnly.value }
  ])
  ```

- **Quality Policy**: Fix broken components immediately when discovered (e.g., misaligned icons due to PrimeVue `gap`/`padding`). Don't defer UI bugs — they compound and erode UX quality bar.

**Visual Quality Standards**: See [DESIGN.md](./DESIGN.md) for premium visual patterns (frosted glass, gradient badges, active states, hover microinteractions, etc.)

## Product Rules

| Domain | Rule |
|--------|------|
| **Telegram Bot** | Speed > precision (fix errors in web later), must feel instant |
| **Analytics** | Every metric needs tooltip (simple Russian), progressive disclosure |
| **Subscription** | Active = full access; expired = read-only; payment history append-only |
| **Performance** | Never block first render, lazy load non-critical, paginate/virtualize lists |
| **Security** | JWT auth, all ops auto-scoped to current user, soft-delete default |
| **Validation** | Russian UI messages, financial terms need hints/tooltips |

## Localization

- **Language:** Russian only (UI, validation, hints in simple Russian)
- **Formats:** Russian standards (date, numbers, currency)
- **Currency:** Multi-currency support with user-defined base currency

## Non-Negotiable Constraints

**Backend:**
- ✓ Respect DDD layers: API → Application → Domain ← Infrastructure
- ✓ Controllers are thin — no domain logic
- ✓ API errors: consistent payload + unambiguous HTTP status
- ✓ Multi-step workflows are atomic (transactions)

**Frontend:**
- ✓ API calls **only** in services layer — never in components
- ✓ Async states **must be explicit:** `loading`, `empty`, `error`, `success`
- ✓ TypeScript strict mode — no implicit `any`
- ✓ No expensive deep watchers
- ✓ **UX litmus test:** "Will low financial literacy users understand this?"
