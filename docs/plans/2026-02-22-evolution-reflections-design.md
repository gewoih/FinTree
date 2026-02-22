# Design: Evolution + Reflections Features
**Date:** 2026-02-22
**Status:** Approved

---

## Overview

Two independent new features for FinTree:

1. **Evolution** — historical KPI trend view (read-only, no new data storage)
2. **Reflections** — structured monthly retrospective (CRUD, new entity)

They share no state, no backend logic, and can be built independently in any order.

---

## Feature 1: Evolution

### Objective

Show users how their financial KPIs evolve month over month, answering: *"Am I improving financially over time?"*

### Navigation

The Analytics page becomes **tabbed**:
- Tab 1: **"Сейчас"** — existing content, unchanged
- Tab 2: **"Динамика"** — new Evolution view

No new top-level nav item. Evolution lives inside Analytics.

### Backend

**New endpoint:**
```
GET /api/analytics/evolution?months=N
```
- `months` = 6, 12, or 0 (all-time)
- Returns an array of month objects in ascending chronological order

**Response shape (per month):**
```json
{
  "year": 2026,
  "month": 1,
  "hasData": true,
  "savingsRate": 0.23,
  "stabilityIndex": 1.4,
  "discretionaryPercent": 38.5,
  "netWorth": 450000.0,
  "liquidMonths": 4.2,
  "meanDaily": 3200.0,
  "peakDayRatio": 0.15
}
```

- `hasData: false` when a month has insufficient data (e.g. stability index requires 4+ days, savings rate requires income > 0). All KPI fields are `null` for such months.
- **Single source of truth:** backend reuses the exact same calculation methods from `AnalyticsService.cs`. No duplicated formulas.
- The endpoint iterates months in one DB pass. No N+1 queries.

### Frontend Layout

```
[ Сейчас ]  [ Динамика ]                    ← tab switcher

┌─────────────────────────────────────────┐
│  [ 6 мес ]  [ 12 мес ]  [ Всё ]         │  ← time filter pills
├─────────────────────────────────────────┤
│                                          │
│  Норма сбережений              ▾        │  ← KPI selector (dropdown)
│                                          │
│  ╭──────────────────────────────────╮   │
│  │   Line chart (Chart.js)          │   │
│  ╰──────────────────────────────────╯   │
│                                          │
│  Текущий месяц: 23%                     │
│  ↑ +4% к прошлому месяцу               │  ← current value + MoM delta
└─────────────────────────────────────────┘
```

**KPI selector options:**
1. Норма сбережений (%)
2. Индекс стабильности
3. Необязательные расходы (%)
4. Чистый капитал (₽)
5. Финансовая подушка (мес.)
6. Средние расходы в день (₽)
7. Доля пиковых дней (%)

**Chart behavior:**
- Months where `hasData: false` render as a **gap** in the line (`spanGaps: false`), never as zero
- Switching KPI is instant (all data loaded on tab open, no additional requests)
- Switching time filter re-fetches from the endpoint

### State Management

New composable `useEvolutionTab.ts`:
- Fetches on tab activation (lazy — not fetched until user opens the tab)
- Manages selected KPI, selected time range, chart data transformation
- Cached per session (no re-fetch on tab switch back unless month changes)

---

## Feature 2: Reflections

### Objective

Structured monthly financial retrospective, answering: *"What did I learn this month, and how will I improve next month?"*

Voluntary. Accessible for any past month. No forced completion.

### Navigation

New top-level nav item: **"Рефлексии"**

### Backend

**New entity: `MonthlyRetrospective`**

| Field | Type | Notes |
|-------|------|-------|
| `Id` | Guid | PK |
| `UserId` | Guid | FK, indexed |
| `Month` | string | "YYYY-MM", unique per user |
| `BannerDismissedAt` | DateTime? | Set when banner is closed |
| `DisciplineRating` | int? | 1–5, nullable |
| `ImpulseControlRating` | int? | 1–5, nullable |
| `SatisfactionRating` | int? | 1–5, nullable |
| `WhatWentWell` | string? | Free text |
| `OverspendingAreas` | string? | Free text |
| `MainLesson` | string? | Free text |
| `NextMonthIntention` | string? | Free text |
| `CreatedAt` | DateTime | UTC |
| `UpdatedAt` | DateTime | UTC |

No financial values stored. All financial summaries are fetched live.

**API routes:**
```
GET    /api/retrospectives                  → list (paginated, desc by month)
GET    /api/retrospectives/{month}          → single retrospective (YYYY-MM)
POST   /api/retrospectives                  → create
PUT    /api/retrospectives/{month}          → update (all content fields)
DELETE /api/retrospectives/{month}          → delete
POST   /api/retrospectives/{month}/dismiss  → upsert stub with BannerDismissedAt set
```

The `/dismiss` endpoint does an upsert: creates a stub record if none exists, or updates `BannerDismissedAt` if a record already exists (e.g. user wrote a retrospective before dismissing). This way there is always at most one record per user per month.

### Banner Trigger

Displayed **on the "Сейчас" tab of the Analytics page** during the first 7 days of a new month, if no `MonthlyRetrospective` record exists for the previous month (neither dismissed nor written).

```
┌────────────────────────────────────────────────┐
│  Прошлый месяц завершён.                       │
│  Хотите подвести итоги?                        │
│                    [ Подвести итоги ]  [ ✕ ]  │
└────────────────────────────────────────────────┘
```

- "Подвести итоги" → navigates to create view for previous month
- "✕" → calls `POST /api/retrospectives/{month}/dismiss`, banner disappears on all devices
- Banner does not appear again for that month once dismissed or after a retrospective is created

### Reflections List Page

```
Рефлексии                              [ + Добавить ]

┌──────────────────────────────────────────────┐
│  Январь 2026                    ★★★★☆       │
│  "В следующем месяце я буду…"               │
│  Норма сбережений: 18%  •  Подушка: 4.2 мес│
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Декабрь 2025                   ★★★☆☆       │
│  "..."                                       │
│  Норма сбережений: 12%  •  Подушка: 3.1 мес│
└──────────────────────────────────────────────┘
```

List items show: month, satisfaction stars, intention preview, 2 live-computed KPIs.
Stub records (dismissed only, no content) do not appear in the list.

"+ Добавить" opens a month picker to create a retrospective for any past month.

### Retrospective Detail / Create / Edit View

**Block 1 — Automatic summary (read-only)**
Fetched live from `/api/analytics/dashboard?year=Y&month=M`:
- Income, Expenses, Savings rate, Δ vs prior month
- Stability index, Discretionary %, Net worth change

**Block 2 — Self-assessment (optional)**
Star ratings (1–5) for:
- Дисциплина трекинга
- Контроль импульсов
- Общая удовлетворённость

**Block 3 — Reflection (optional text fields)**
- Что получилось хорошо?
- Где были перерасходы?
- Главный урок месяца
- Что изменить в следующем месяце?

**Block 4 — Intention (optional)**
Single text field: "В следующем месяце я буду…"

All blocks are optional. User can save at any time.

---

## Shared Constraints

- **Single source of truth:** all financial values (in Evolution charts and Retrospective summaries) use the existing `AnalyticsService` calculation logic. No alternative formula implementations.
- **No snapshot persistence:** no financial values are stored. If transactions or formulas change, all displayed values update automatically.
- **Localization:** all UI strings in Russian (consistent with existing app).

---

## Out of Scope

- Budgets, debt management, bank integrations
- Push notifications for retrospective reminder
- Export of retrospectives
- Sharing retrospectives