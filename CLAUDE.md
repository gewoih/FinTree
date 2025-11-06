# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinTree is a personal finance tracking SaaS application with a .NET 9.0 backend (ASP.NET Core Web API) and Vue 3 frontend. It enables users to manage accounts, track transactions across multiple currencies, categorize expenses, and analyze financial health with metrics and visualizations.

**Tech Stack:**
- **Backend:** .NET 9.0, ASP.NET Core, Entity Framework Core, PostgreSQL, JWT authentication, Serilog
- **Frontend:** Vue 3 (Composition API), TypeScript, Vite, PrimeVue 4.4.1, Pinia, Vue Router, Chart.js
- **Architecture:** Clean Architecture (Domain → Application → Infrastructure → API)

## Common Commands

### Backend (.NET)

```bash
# Build the solution
dotnet build FinTree.sln

# Run the API (from FinTree.Api directory)
cd FinTree.Api
dotnet run

# Create a new migration
dotnet ef migrations add <MigrationName> --project FinTree.Infrastructure --startup-project FinTree.Api

# Apply migrations (runs automatically on startup via Program.cs)
dotnet ef database update --project FinTree.Infrastructure --startup-project FinTree.Api

# Run from solution root
dotnet run --project FinTree.Api/FinTree.Api.csproj
```

**API runs on:** `https://localhost:5001`

### Frontend (Vue)

```bash
# Install dependencies
cd vue-app
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Lint code
npm run lint

# Lint styles
npm run lint:style

# Preview production build
npm run preview
```

**Frontend runs on:** `http://localhost:8080` (proxies `/api/*` to backend)

## Architecture

### Backend: Clean Architecture Layers

FinTree follows Clean Architecture with strict dependency rules (inner layers never depend on outer layers):

```
FinTree.Domain (Core)
    ↑
FinTree.Application (Use Cases)
    ↑
FinTree.Infrastructure (Data Access)
    ↑
FinTree.Api (Controllers, Entry Point)
```

#### **FinTree.Domain** (Core Business Logic)
- **Location:** `FinTree.Domain/`
- **Responsibility:** Domain entities, value objects, business rules, invariants
- **Key Folders:**
  - `Accounts/` - Account entity, AccountType enum
  - `Transactions/` - Transaction entity, TransactionType enum
  - `Categories/` - TransactionCategory entity
  - `Identity/` - User and Role entities for ASP.NET Core Identity
  - `ValueObjects/` - Money, Currency value objects
  - `Base/` - Abstract base classes (Entity)
- **Rules:**
  - No dependencies on other projects
  - Contains domain logic only (e.g., balance calculations, ownership validation)
  - Entities enforce invariants in constructors/methods

#### **FinTree.Application** (Use Cases & Business Orchestration)
- **Location:** `FinTree.Application/`
- **Responsibility:** Application services, DTOs, business workflows
- **Key Folders:**
  - `Accounts/` - AccountsService, DTOs for account operations
  - `Transactions/` - TransactionsService, TransactionCategoryService, DTOs
  - `Analytics/` - AnalyticsService (net worth, category breakdowns, financial health metrics)
  - `Users/` - UserService, AuthService (JWT token generation, registration, login)
  - `Currencies/` - CurrencyConverter service
  - `Exceptions/` - Custom exceptions (NotFoundException, etc.)
- **Dependencies:** References `FinTree.Domain`
- **Patterns:**
  - Services orchestrate domain entities
  - DTOs for data transfer (never expose domain entities directly to API)
  - `ICurrentUser` interface abstracts authenticated user context

#### **FinTree.Infrastructure** (Data & External Services)
- **Location:** `FinTree.Infrastructure/`
- **Responsibility:** Database access, EF Core configurations, migrations, external integrations
- **Key Files:**
  - `Database/AppDbContext.cs` - EF Core DbContext
  - `Database/Initializer.cs` - Seeds default categories and test user
  - `Migrations/` - EF Core migrations (auto-applied on startup)
  - `FxLoader.cs` - Background service for loading forex rates
  - `Telegram/TelegramBotHostedService.cs` - Telegram bot integration
- **Dependencies:** References `FinTree.Domain` and `FinTree.Application`
- **Notes:**
  - Uses PostgreSQL via Npgsql.EntityFrameworkCore.PostgreSQL
  - Migrations run automatically in `Program.cs` on startup

#### **FinTree.Api** (HTTP Controllers & Startup)
- **Location:** `FinTree.Api/`
- **Responsibility:** HTTP endpoints, authentication/authorization, dependency injection setup
- **Key Files:**
  - `Program.cs` - Application entry point, DI container configuration, middleware pipeline
  - `Controllers/` - API controllers (AccountsController, TransactionController, AnalyticsController, AuthController, etc.)
  - `HttpCurrentUser.cs` - Implementation of ICurrentUser using HttpContext
- **Dependencies:** References `FinTree.Application` (Application references Infrastructure)
- **Endpoints:** All controllers are under `/api/*` route
- **Authentication:** JWT Bearer tokens (configured in Program.cs)

### Frontend Architecture

```
vue-app/
├── src/
│   ├── components/        # Reusable components
│   │   ├── common/        # EmptyState, KPICard, PageHeader, StatusBadge
│   │   ├── layout/        # AppShell (nav + sidebar)
│   │   └── [feature components] # ExpenseForm, TransactionList, CategoryManager
│   ├── pages/             # Route-level components
│   │   ├── LandingPage.vue
│   │   ├── HomePage.vue
│   │   ├── ExpensesPage.vue
│   │   ├── AccountsPage.vue
│   │   ├── CategoriesPage.vue
│   │   ├── AnalyticsPage.vue
│   │   └── [auth pages]
│   ├── stores/            # Pinia state management
│   │   ├── auth.ts        # Authentication state
│   │   ├── finance.ts     # Accounts, transactions, categories
│   │   └── user.ts        # User profile
│   ├── services/          # API client wrappers
│   ├── composables/       # Reusable composition functions (useTheme, etc.)
│   ├── router/            # Vue Router configuration
│   ├── assets/            # design-tokens.css, images
│   ├── styles/            # Global styles
│   └── utils/             # Helper functions
```

**State Management Pattern (Pinia):**
- `auth.ts` - Manages JWT token, login/logout, token refresh
- `finance.ts` - Central store for accounts, transactions, categories (fetched from API)
- Stores call API services, update reactive state, handle errors

**Routing:**
- Public routes: `/` (LandingPage), `/login`, `/register`
- Authenticated routes: `/dashboard`, `/expenses`, `/accounts`, `/categories`, `/analytics`, `/settings`
- Authentication guard in router checks token validity

## Design System & UI

FinTree uses a comprehensive design system documented in `DESIGN_SYSTEM.md`:

**Key Files:**
- `vue-app/src/assets/design-tokens.css` - CSS variables for colors, typography, spacing, shadows, transitions
- `vue-app/src/primevue-theme.css` - PrimeVue theme overrides
- `vue-app/src/components/index.ts` - Global component registration

**Design Tokens:**
- **Colors:** Primary blue (#2563EB), semantic colors (success, warning, danger), neutrals
- **Spacing:** 4px/8px grid system (`--ft-space-1` through `--ft-space-24`)
- **Typography:** Font sizes (12px-40px), weights, line heights
- **Shadows:** `--ft-shadow-xs` through `--ft-shadow-2xl`
- **Transitions:** Fast (150ms), base (220ms), slow (350ms)

**Dark Mode:**
- Implemented via `.dark-mode` class on `<html>`
- Managed by `useTheme` composable
- Persisted to localStorage
- All semantic tokens automatically adapt

**Common Components:**
- `EmptyState` - Zero-data states with icon, title, description, CTA
- `KPICard` - Dashboard metric cards with trend indicators
- `PageHeader` - Consistent page headers with breadcrumbs and actions
- `StatusBadge` - Status indicators with semantic colors
- `AppShell` - Main layout (top nav + sidebar)

## Domain Model (Current State)

### Core Entities

**Account** (`FinTree.Domain/Accounts/Account.cs`)
- Properties: Name, Currency, Balance, AccountType (Cash/BankAccount/CreditCard/Investment), Color, Icon, IsArchived
- Owned by User (via UserId)
- Balance updated through transactions

**Transaction** (`FinTree.Domain/Transactions/Transaction.cs`)
- Properties: AccountId, Amount, Currency, TransactionType (Income/Expense), Description, Date, TransactionCategoryId
- Belongs to Account and User
- Categorized via TransactionCategory

**TransactionCategory** (`FinTree.Domain/Categories/TransactionCategory.cs`)
- Properties: Name, IconClass, ColorHex, Type (Income/Expense)
- System categories seeded in Initializer
- User can create custom categories

**User** (`FinTree.Domain/Identity/User.cs`)
- ASP.NET Core Identity user
- Properties: Email, BaseCurrency, TimeZone, FullName
- Owns accounts and transactions

### Planned Extensions (from ARCHITECTURE_PLAN.md)

**IMPORTANT:** The roadmap in `ARCHITECTURE_PLAN.md` outlines upcoming features:

1. **Enhanced Transaction Types:**
   - Add `TransactionKind` enum (`Expense`, `Income`, `Transfer`, `Adjustment`)
   - Support transfers between accounts
   - Portfolio valuation adjustments

2. **Product Metadata on Accounts:**
   - `ProductDetails` value object (rate, payment frequency, credit limit, maturity date)
   - Support credit cards, deposits, investments with specific attributes

3. **Scheduled Events:**
   - New `ScheduledEvent` entity for planning (income, payments, reminders)
   - Read-only projections (NOT automated transaction creation)

4. **Analytics Enhancements:**
   - Portfolio health metrics (savings rate, debt-to-income, liquidity months, etc.)
   - Forecast views merging actual + planned data
   - Multi-timeframe analysis (short/mid/long-term)

**When implementing new features, refer to `ARCHITECTURE_PLAN.md` for architectural decisions and delivery sequencing.**

## Key Architectural Patterns

### Manual Authority Principle
- **No background jobs create transactions** - all cash movement is user-initiated
- Scheduled events are for planning only; they never auto-post transactions
- Users have full control over their financial data

### Service Layer Responsibility
- **Domain entities** enforce invariants (e.g., user ownership, non-archived accounts)
- **Application services** orchestrate workflows (e.g., TransactionsService.CreateTransaction fetches account, creates transaction, saves)
- **Infrastructure** only persists/queries data

### Authentication & Authorization
- JWT tokens issued by `AuthService` (valid for 1 hour, refresh supported)
- `ICurrentUser` interface abstracts current user context
- `HttpCurrentUser` implementation uses HttpContext.User claims
- All API controllers require `[Authorize]` attribute except AuthController

### Currency Handling
- `Money` value object in domain (Amount + Currency)
- `CurrencyConverter` service for multi-currency conversions
- `FxLoader` background service fetches exchange rates periodically
- Net worth analytics convert all balances to user's base currency

### Error Handling
- Custom exceptions: `NotFoundException`, `ValidationException`
- Global exception handler in `Program.cs` maps exceptions to HTTP status codes
- Frontend displays errors via PrimeVue Toast notifications

## Database

**Provider:** PostgreSQL via Npgsql

**Connection String:** Configured in `appsettings.json` or `appsettings.Development.json`

**Migrations:**
- Created with: `dotnet ef migrations add <Name> --project FinTree.Infrastructure --startup-project FinTree.Api`
- Auto-applied on startup in `Program.cs` (line 144)

**Seeding:**
- Default transaction categories seeded via `Initializer.SeedTransactionCategories`
- Test user seeded via `Initializer.SeedTestUser` (development only)

**Tables:**
- AspNetUsers, AspNetRoles (Identity)
- Accounts
- Transactions
- TransactionCategories
- FxRates (forex exchange rates)

## API Conventions

### Request/Response Format
- All requests/responses use JSON
- DTOs defined in `FinTree.Application/[Feature]/Dto/`
- Enums serialized as strings (via `JsonStringEnumConverter` in Program.cs)

### Error Responses
```json
{
  "error": "Error message"
}
```

### Authentication
- Include JWT in `Authorization: Bearer <token>` header
- Token obtained from `POST /api/auth/login`

### CORS
- Frontend origin `http://localhost:8080` allowed (configured in Program.cs)

## Frontend Development Patterns

### API Calls
- Use services in `vue-app/src/services/` (Axios wrappers)
- Handle errors with try/catch, display via `useToast` from PrimeVue

### Form Handling
- Use PrimeVue form components (InputText, Dropdown, Calendar)
- Validation handled in component logic
- Submit via Pinia store actions

### Data Fetching
- Fetch data in component `onMounted` or via router navigation guards
- Store in Pinia for reactivity
- Use `SkeletonLoader` or `Skeleton` components during loading

### Styling
- Use design tokens from `design-tokens.css` (e.g., `var(--ft-primary-600)`)
- Prefer semantic tokens over raw colors (e.g., `--ft-bg-base` instead of hex values)
- PrimeVue components styled via `primevue-theme.css` overrides

## Important Notes

### Security
- **WARNING:** Telegram bot token hardcoded in `Program.cs:95` - move to configuration/secrets
- JWT secret key hardcoded in `AuthService` - should be in configuration
- Never commit sensitive credentials to Git

### Code Quality
- Use meaningful variable/method names
- Follow existing patterns (e.g., services for business logic, DTOs for data transfer)
- Keep controllers thin (delegate to services)
- Domain entities should enforce invariants

### Testing
- No test projects currently exist
- When adding tests, create separate projects: `FinTree.Domain.Tests`, `FinTree.Application.Tests`, etc.
- Use xUnit or NUnit for .NET tests
- Use Vitest or Jest for Vue component tests

## Related Documentation

- `ARCHITECTURE_PLAN.md` - Roadmap for domain model extensions (credits, deposits, investments, scheduled events)
- `DESIGN_SYSTEM.md` - Complete design system rationale, tokens, components
- `IMPLEMENTATION_GUIDE.md` - Step-by-step guide for integrating design system
- `QA_CHECKLIST.md` - Visual, functional, accessibility, performance acceptance criteria
- `README_REDESIGN.md` - Design system deliverables overview

## Git Workflow

**Main Branch:** `master`

**Current Branch:** `claude/frontend-audit-refactor-011CUq67UDzq8CHXPAmJeX5t`

When creating commits:
- Use clear, descriptive messages
- Reference the "why" not just the "what"
- Follow existing commit message style (see `git log --oneline`)

## Common Gotchas

1. **CORS Issues:** Ensure backend CORS policy includes frontend origin (`http://localhost:8080`)
2. **Vite Proxy:** API calls in frontend use `/api/*` which proxies to `https://localhost:5001`
3. **SSL in Development:** Backend uses HTTPS; Vite proxy has `secure: false` to skip SSL verification
4. **EF Core Migrations:** Always specify both `--project` (Infrastructure) and `--startup-project` (Api)
5. **PrimeVue Theme:** Custom theme applied via Aura preset in `main.ts`, overrides in `primevue-theme.css`
6. **Dark Mode Class:** Applied to `<html>` element, not `<body>` - ensure semantic tokens reference correct selector
7. **Design Tokens Import Order:** `design-tokens.css` must be imported before other styles in `main.ts`
