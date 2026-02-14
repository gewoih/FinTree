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

## UI/UX Requirements

**Design**: Modern fintech (Stripe/Revolut benchmark), dark mode mandatory, design tokens use `--ft-*` prefix
**Mobile-first**: ≥360px width, 44x44 min hit area, no horizontal overflow/layout jumps
**Accessibility**: Mandatory (semantics, focus, contrast, keyboard nav)
**Interactions**: Destructive actions need confirmation, forms validate immediately
**Motion**: Functional only (indicates state changes)

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