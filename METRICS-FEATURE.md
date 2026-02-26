# Feature: Monthly Performance Score (`totalMonthScore`)

## Objective

Introduce one deterministic month-level score (`0..100`) that is shared across Analytics and Evolution.

Goals:
- Single documented weighted formula
- Same month => same score in both pages
- Safe rendering when some metrics are missing

---

## Canonical Formula

`totalMonthScore` is computed from 5 normalized sub-scores in `[0..1]`.

Weights are fixed and equal (`20%` each):

```text
ScoreRaw = (S1 + S2 + S3 + S4 + S5) / 5

totalMonthScore = round(clamp(ScoreRaw, 0, 1) * 100)
```

### Sub-scores

1. Savings rate (`S1`)

```text
S1 = clamp(savingsRate, 0, 1)
```

Where:

```text
savingsRate = (income - expense) / income
```

2. Financial cushion (`S2`)

```text
S2 = clamp(liquidMonths / 12, 0, 1)
```

`12` months is saturation point.

3. Stability (`S3`)

```text
S3 = clamp(stabilityScore / 100, 0, 1)
```

`stabilityScore` is existing backend score (`0..100`).

4. Non-essential spending share (`S4`)

```text
S4 = 1 - clamp(discretionarySharePercent / 100, 0, 1)
```

5. Peak spending share (`S5`)

```text
S5 = 1 - clamp(peakSpendSharePercent / 100, 0, 1)
```

`peakSpendSharePercent` = share of month expenses concentrated in peak days.

---

## Missing Data Policy

If one or more metrics are missing (`null`), calculation reweights to available metrics only:

```text
totalMonthScore = round(100 * sum(weight_i * S_i over available metrics)
                           / sum(weight_i over available metrics))
```

If all 5 metrics are missing => `totalMonthScore = null`.

---

## Data and Consistency Rules

1. Backend is source of truth for score calculation.
2. Dashboard and Evolution use shared calculation services.
3. Evolution uses Dashboard-style formulas for:
- liquidity (`liquidMonths`)
- peak metric (`peakSpendSharePercent`)
4. Frontend does not reimplement score math.

---

## UI Interpretation Bands (3-level)

- `0..39` -> Red (нужна коррекция)
- `40..74` -> Yellow (зона внимания)
- `75..100` -> Green (все в порядке)

Display format: whole number, e.g. `74/100`.

---

## Technical Requirements

- Reuse existing KPIs and shared services
- No duplicated score formula in calculators/components
- Deterministic output for identical month inputs
- Null-safe rendering in Analytics and Evolution
