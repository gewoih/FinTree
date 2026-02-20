# Analytics Cards Cleanup — Design

_Date: 2026-02-20_
_Tasks: FT-TODO-016, FT-TODO-017_

---

## FT-TODO-016 — Remove card subtitles

Remove the subtitle `<p>` element and its CSS from four analytics cards. The subtitles duplicate information already available in the tooltip hint icon.

**Affected components:**
- `SpendingPieCard.vue` — remove `<p class="donut-card__subtitle">` + `.donut-card__subtitle` CSS
- `SpendingBarsCard.vue` — remove `<p class="bars-card__subtitle">` + `.bars-card__subtitle` CSS and its mobile override
- `CategoryDeltaCard.vue` — remove `<p class="delta-card__subtitle">` + `.delta-card__subtitle` CSS
- `ForecastCard.vue` — remove `<p class="forecast-card__subtitle">` + `.forecast-card__subtitle` CSS in `forecast-card.css`

---

## FT-TODO-017 — ForecastCard redesign

### What changes

**Header:**
- Remove subtitle (covered by 016)
- Remove `UiBadge` status chip (`forecast-chip--good/average/poor`) — status communicated via hero color instead

**Chips area → Hero KPI layout:**

Replace the flat 5-chip row with a two-level structure:

1. **Hero block** — label "Прогноз до конца месяца" + large formatted amount
   - Color driven by `forecast.status`:
     - `good` → `--ft-accent-primary` (teal)
     - `average` → `--ft-warning-400` (amber)
     - `poor` → `--ft-danger-400` (red)
     - `null` → `--ft-text-primary`

2. **Secondary row** — two compact stats side by side:
   - "Оптимистичный" → `--ft-success-400` (green)
   - "Риск" → `--ft-warning-400` (amber)

**Removed chips:** "Потрачено" and "Базовые расходы" (both visible on chart).

**Chart — baseline label:**
Add a local `afterDraw` canvas plugin (no new dependency) that draws the formatted baseline value as a text label at the right end of the baseline dashed line. Rendered only when `hasBaseline` is true. Styling: small font, `--ft-chart-baseline` color, right-aligned above the line.

**Legend:** No change.

### Removed CSS
- `.forecast-chip--good`, `.forecast-chip--average`, `.forecast-chip--poor` (status badge variants)
- `.forecast-chip--accent` (Потрачено chip)
- `.forecast-chip--outline` (Базовые расходы chip)
- `.forecast-chip--muted` label (rename to `--optimistic` for clarity)

### Retained CSS
- `.forecast-chip--primary` → "Прогноз" (now hero, will be restyled)
- `.forecast-chip--warning` → "Риск"
- New `.forecast-chip--optimistic` → "Оптимистичный"
