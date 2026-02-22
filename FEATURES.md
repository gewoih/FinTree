# FinTree — Feature Plan  
## 1) Monthly Metrics Evolution  
## 2) Monthly Retrospective  

This document describes **only two new features**:

1. Dynamic monthly metrics (historical evolution of core KPIs)  
2. Structured monthly retrospective  

No changes to budgeting, automation, debts, or integrations.

---

# 1. Monthly Metrics Evolution

## 1.1 Objective

Enable users to see how their financial discipline and capital evolve over time.

This feature answers:

> “Am I improving financially month over month?”

It complements the current Analytics page, which focuses only on the current month.

---

## 1.2 KPI Source of Truth (Critical Requirement)

All KPIs shown on the **Evolution** page must be calculated using the **exact same calculation methods and business logic** as on the Analytics (Home) page.

There must be:

- No duplicated formulas
- No alternative implementations
- No simplified calculations
- No separate KPI logic layer

The Evolution page reuses the same metric calculation services used by Analytics.

Any future formula change must automatically affect:
- Current month metrics (Analytics)
- Historical monthly metrics (Evolution)

Single source of truth is mandatory.

---

## 1.3 Scope

Track the following KPIs monthly (computed dynamically from transactions):

- Savings rate (%)
- Stability index
- Non-essential spending (%)
- Net worth
- Financial cushion (months)
- Average daily spending
- Peak day ratio (%)

All values are recalculated dynamically.  
No snapshot storage of financial data.

---

## 1.4 New Page: `Evolution`

A dedicated page containing:

### Section A — KPI Charts

For each KPI:

- Line chart across months
- Month-over-month delta
- Trend indicator (↑ ↓ →)

Filters:

- Last 6 months
- Last 12 months
- All time

All monthly values must be computed using the same KPI calculation engine as Analytics.

---

### Section B — Net Worth Growth

- Net worth over time (line chart)
- Optional overlay: cumulative contributions vs growth

Net worth calculation must reuse existing logic from Analytics / Investments.

---

## 1.5 Technical Notes

- Metrics are derived from transactions at query time.
- Metrics use the exact same domain services as Analytics.
- No separate KPI calculation module is allowed.
- If historical data changes, all charts update automatically.
- If formulas change, past values reflect updated logic.

No financial values are persisted per month.

---

## 1.6 Acceptance Criteria

- Evolution KPIs exactly match Analytics KPIs for the same month.
- Changing KPI calculation logic affects both pages automatically.
- Changing historical transactions updates past metrics.
- No duplicated formula logic exists in codebase.
- Page loads within acceptable performance limits.

---

# 2. Monthly Retrospective

## 2.1 Objective

Introduce structured financial reflection at the end of each month.

This feature answers:

> “What did I learn this month, and how will I improve next month?”

Retrospective is voluntary.

---

## 2.2 Trigger

At the beginning of a new month:

Banner on Home:

> “Last month has ended. Would you like to review it?”

User can:
- Open retrospective
- Dismiss

No forced completion.

---

## 2.3 Retrospective Structure

### Block 1 — Automatic Monthly Summary (Read-only)

System-generated overview:

- Income
- Expenses
- Savings rate
- Δ vs previous month
- Stability index
- Non-essential %
- Net worth change
- Top category increase
- Top category decrease

All financial values must be calculated using the same KPI calculation logic as Analytics.

---

### Block 2 — Self-Assessment (Optional)

Ratings (1–5):

- Tracking discipline
- Impulse control
- Overall satisfaction

---

### Block 3 — Reflection (Text Fields)

- What went well?
- Where did overspending occur?
- Main lesson of the month
- What should change next month?

---

### Block 4 — Intention for Next Month

Single text field:

> “Next month I will…”

Free-form text.  
No numeric enforcement.

---

## 2.4 Data Model

### Entity: `MonthlyRetrospective`

Fields:

- Month (YYYY-MM)
- DisciplineRating (nullable)
- ImpulseControlRating (nullable)
- SatisfactionRating (nullable)
- WhatWentWell (text)
- OverspendingAreas (text)
- MainLesson (text)
- NextMonthIntention (text)
- CreatedAt
- UpdatedAt

No financial metrics stored.

---

## 2.5 Retrospective List Page

New page: `Reflections`

List view includes:

- Month
- Savings rate (computed live via KPI engine)
- Net worth change (computed live via KPI engine)
- Satisfaction rating (if present)
- Preview of next-month intention

User can:

- Open
- Edit
- Delete

---

## 2.6 Technical Notes

- Retrospective data does not freeze financial values.
- All financial summaries reuse Analytics KPI logic.
- If transactions or formulas change, summary values update automatically.
- If metrics differ from when retrospective was written, optionally display:

  > “Metrics updated due to data changes.”

---

## 2.7 Acceptance Criteria

- User can create a retrospective for any past month.
- Retrospective is editable.
- Financial summary reflects current computed data.
- All summary metrics use the same KPI calculation engine as Analytics.
- No month-locking behavior exists.
- Banner appears only for months without a retrospective.

---

# Result After Implementation

FinTree gains:

- Long-term financial trend visibility (Evolution)
- Structured behavioral reflection (Retrospective)

Without adding:

- Budgets
- Debt management
- Bank integrations
- Snapshot persistence
