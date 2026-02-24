# Feature: Monthly Performance Score

## Objective

Introduce a continuous, mathematically consistent **Monthly Performance Score (0–100)**  
that reflects the overall financial strength of the month.

The score must:

- Use only existing KPI calculations from the Analytics page
- Use continuous normalization (no discrete good/average/poor mapping)
- Use equal weights
- Avoid artificial saturation (except for financial cushion)
- Be transparent and explainable

This score represents financial strength, not punishment.

---

# 1. Calculation Model

## 1.1 Final Formula

MonthScore is calculated as:

MonthScore = 100 × (S1 + S2 + S3 + S4 + S5) / 5

Each sub-score Si is normalized to range [0, 1].

All weights are equal.

---

# 2. Sub-Score Definitions

## 2.1 Savings Rate (S1)

Ideal: 100%  
Worst: 0%

No saturation.

S1 = SavingsRate

Where SavingsRate = (Income − Expense) / Income

Examples:
- 0.81 → 0.81
- 0.90 → 0.90

Higher savings always increase score proportionally.

---

## 2.2 Financial Cushion (S2)

The only metric with saturation.

Saturation point: 12 months.

S2 = min(CushionMonths / 12, 1)

Examples:
- 4.7 months → 0.392
- 12 months → 1.0
- 18 months → 1.0

---

## 2.3 Stability Index (IQR) (S3)

Lower IQR = better.

No fixed red zone.
No linear thresholding.

S3 = 1 / IQR

Examples:
- 1.0 → 1.0
- 1.5 → 0.67
- 2.0 → 0.5
- 5.0 → 0.2

As instability grows, score decays smoothly.

---

## 2.4 Non-Essential Spending Share (S4)

Ideal: 0%  
No saturation.

S4 = 1 − NonEssentialShare

Where NonEssentialShare is in [0,1].

Examples:
- 0.32 → 0.68
- 0.10 → 0.90
- 0.50 → 0.50

Lower discretionary spending directly improves score.

---

## 2.5 Peak Day Share (S5)

Ideal: 0%  
No saturation.

S5 = 1 − PeakShare

Where PeakShare is in [0,1].

Examples:
- 0.13 → 0.87
- 0.05 → 0.95
- 0.40 → 0.60

More volatile months reduce score proportionally.

---

# 3. Example Calculation

Given:

SavingsRate = 0.8098  
CushionMonths = 4.7  
IQR = 1.06  
NonEssentialShare = 0.323  
PeakShare = 0.129  

Sub-scores:

S1 = 0.8098  
S2 = 4.7 / 12 = 0.392  
S3 = 1 / 1.06 = 0.943  
S4 = 1 − 0.323 = 0.677  
S5 = 1 − 0.129 = 0.871  

MonthScore:

(0.8098 + 0.392 + 0.943 + 0.677 + 0.871) / 5 = 0.7386  

Final Score = 73.9 / 100

---

# 4. Design Principles

- Continuous, not categorical
- No step changes
- Equal metric weight
- Transparent mathematics
- Fully derived from existing Analytics KPIs
- Automatically recalculates if underlying data changes

---

# 5. UI Integration

Display:

Monthly Performance Score: 74 / 100

Optional:

- Sub-score breakdown
- Contribution visualization
- Trend vs previous month
- Δ change indicator

---

# 6. Interpretation

Score meaning:

0–40   → Financially unstable  
40–60  → Weak structure  
60–75  → Stable month  
75–85  → Strong financial discipline  
85–100 → Excellent financial strength  

Score is not judgment.  
It is a normalized measure of financial strength and stability.

---

# 7. Technical Requirements

- Reuse existing KPI calculations
- No duplicated business logic
- No persistent snapshot storage
- Fully dynamic recalculation
- Deterministic output for identical inputs
