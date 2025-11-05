# FinTree Financial Domain Roadmap

This artifact outlines the senior-architect plan for evolving FinTree’s backend so users can track every facet of their financial life while retaining full manual control. Use it as the reference point for domain changes, service updates, and delivery sequencing.

## 1. Objectives & Scope
- Consolidate credits, deposits, and investments into the existing account-centric model with clear product metadata.
- Enable users to record all inflows/outflows manually, while providing projections and analytics for planning.
- Surface financial “quality” indicators through consistent metrics spanning short-, mid-, and long-term views.

## 2. Guiding Principles
- **Manual Authority:** No background jobs create or mutate transactions. All cash movement remains user initiated.
- **Progressive Complexity:** Start with simple, extensible models; defer automation (e.g., schedule-driven postings) until explicitly requested.
- **Layer Discipline:** Domain objects stay focused on invariants; orchestration lives in Application services. Infrastructure only persists/query.
- **Transparency:** Every analytic number traces back to transactions or scheduled expectations that the user can inspect and edit.

## 3. Domain Model Extensions

### 3.1 Accounts & Product Metadata
- Expand `AccountType` (`FinTree.Domain/Accounts/AccountType.cs`) with `Credit`, `Deposit`, `Investment`.
- Introduce value object `ProductDetails` (stored in `FinTree.Domain/Accounts/Account.cs`) containing:
  - `Rate`, `PaymentFrequency`, `CreditLimit`, `MaturityDate`, `Capitalization`, `Notes`.
  - Optional JSON column in EF to avoid table explosion; consider owned entity configuration.
- Credit- and deposit-specific properties remain optional; absence implies generic bank/cash account.

### 3.2 Transactions
- Extend `Transaction` (`FinTree.Domain/Transactions/Transaction.cs`) with:
  - `TransactionKind` enum (`Expense`, `Income`, `Transfer`, `Adjustment`).
  - Direction-aware balance logic (positive amount always stored; semantics controlled by `Kind`).
- Keep `ExpenseTransaction` for backward compatibility; add lightweight derivatives:
  - `IncomeTransaction`, `TransferTransaction`, `AdjustmentTransaction` inheriting from `Transaction`.
- Validation rules stay the same (user ownership, archive checks); adjust constructors to accept kind-specific flags.

### 3.3 Scheduled Events
- New entity `ScheduledEvent` under `FinTree.Domain/Accounts` or dedicated folder:
  - Fields: `UserId`, `AccountId`, `EventType` (`Income`, `CreditPayment`, `DepositAccrual`, `Reminder`), `Amount`, `Currency`, `FirstOccurrence`, `Frequency`, `EndDate`, `Description`.
  - Serves as planning metadata only; **never** creates transactions.

## 4. Application Layer Updates

### 4.1 Transaction Handling
- Refactor `TransactionsService` (`FinTree.Application/Transactions/TransactionsService.cs`):
  - Accept explicit `TransactionKind`.
  - Add command handlers `CreateIncome`, `CreateTransfer`, `CreateAdjustment`.
  - Preserve current validation (account ownership, non-archived).
- Update DTOs / controllers (`FinTree.Api/Controllers/TransactionController.cs`) to expose new commands while keeping existing expense workflow intact.

### 4.2 Account Onboarding
- Extend `CreateAccount` flow (`FinTree.Application/Accounts`) to capture optional `ProductDetails`.
- Validate credit/deposit inputs (rate ≥ 0, dates coherent) before persisting.
- Consider migration helpers for existing accounts (default `ProductDetails` as null).

### 4.3 Planning & Projections
- Add `ScheduledEventsService` (create/update/delete/list) to manage user reminders.
- Implement read-only services:
  - `CreditScheduleService`: produce amortization rows for display using `CreditTerms` from `ProductDetails`.
  - `DepositProjectionService`: compute expected interest schedule (simple vs compounded).
  - `AccountProjectionService`: merge schedules + manual events into a consolidated forecast timeline without altering data.

## 5. Analytics & Reporting

### 5.1 Net Worth Trend
- Adjust `ExpenseAnalytics.BuildNetWorthTrendAsync` (`FinTree.Domain/Analytics/ExpenseAnalytics.cs`) to:
  - Apply sign based on `TransactionKind`.
  - Include `Adjustment` transactions for manual portfolio valuations.
  - Preserve currency conversion via `ICurrencyExchange`.

### 5.2 Forecast Views
- New projection endpoint in `AnalyticsService` returning a combined list of:
  - Actual snapshots (existing `NetWorthSnapshotDto`).
  - Forecast points sourced from `AccountProjectionService` tagged as “planned”.
- UI can overlay plan vs fact while maintaining transparency.

### 5.3 Portfolio Health Metrics
- Implement `PortfolioHealthService` using transactions (facts) + scheduled events (expectations).
- Metric set and time windows:

| Metric | Definition | Window |
| --- | --- | --- |
| `SavingsRate` | (Income − Expenses) ÷ Income | Current month, trailing 3 & 6 months |
| `DebtToIncome` | Mandatory debt payments ÷ Net income | Trailing 6 & 12 months |
| `LiquidityMonths` | Liquid assets ÷ Avg monthly essential spend | Current month snapshot |
| `ExpenseVolatility` | Coefficient of variation of monthly expenses | Trailing 6 months |
| `NetWorthTrend` | Linear regression slope of monthly net worth | Trailing 12 months |
| `IncomeDiversity` | Share of largest income source | Trailing 6 months |

- Return both current-month facts and longer-term aggregates so UI can highlight red/amber/green thresholds.

## 6. Persistence Strategy
- Database changes:
  - New columns on `Accounts` for serialized `ProductDetails`.
  - New `TransactionKind` column on `Transactions` table (default `Expense`).
  - New `ScheduledEvents` table keyed by `UserId`.
  - Optional `PortfolioHealthSnapshots` table for precomputed monthly metrics (UserId, PeriodType, PeriodStart, JSON data).
- Migrations stored in `FinTree.Infrastructure/Migrations`; ensure backward-compatible defaults.
- Introduce EF configurations for new owned types/entities (`FinTree.Infrastructure/Configs`).

## 7. Delivery Plan (High-Level)
1. **Foundation**
   - Add `TransactionKind`, update domain constructors, adjust migrations.
   - Introduce `ProductDetails` value object with migrations + API wiring.
2. **Planning Layer**
   - Create `ScheduledEvent` domain/services + CRUD endpoints.
   - Implement credit/deposit projection services (pure calculation).
3. **Analytics Refresh**
   - Update net worth calculation to respect direction.
   - Build `PortfolioHealthService` and expose metrics endpoints.
   - Add projection endpoint combining facts and planned events.
4. **UX Integration**
   - Surface new account fields in API/UI.
   - Present plan vs fact views, health dashboard, and forecasting timelines.
5. **Hardening**
   - Add unit/integration tests (domain, services, analytics).
   - Populate seed data/migrations; update documentation (`IMPLEMENTATION_GUIDE.md`, QA checklists).

## 8. Risks & Open Questions
- **Data Migration:** Existing transactions default to `Expense`; ensure reports remain correct until users create incomes/adjustments.
- **User Overload:** Additional fields may overwhelm new users; coordinate UX to hide advanced options unless needed.
- **Currency Conversion Gaps:** Projections rely on `ICurrencyExchange`; define behavior when rates are missing (fallback to latest? block?).
- **Performance:** Portfolio health metrics can be heavy; monitor query patterns before committing to snapshot storage.

---

Use this roadmap as the canonical reference while implementing the upcoming iterations. Update it alongside architecture decisions to keep the team aligned.
