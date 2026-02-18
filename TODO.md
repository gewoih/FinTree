# FinTree — TODO (Frontend Stabilization)

This backlog reflects the frontend audit (February 2026).
Goal: remove systemic causes of UI bugs, inconsistency, and high maintenance cost.

---

## P1 — Critical (Do First)

### 3) Normalize field validation UI (single contract)

- [x] Add explicit invalid/error props in `UiInput*` / `UiSelect` / `UiDatePicker` wrappers.
- [x] Centralize field error visuals in shared wrapper style layers.
- [x] Remove ad hoc dependence on `p-invalid` in feature components.

Why:
- `p-invalid` is used, but there is no guaranteed centralized unstyled error-state styling contract.

Done criteria:
- All field error states render consistently without local hacks.

---

### 4) Eliminate stylelint debt and enforce “no new warnings”

- [x] Resolve current `order/properties-order` warning debt (audit found 180 warnings).
- [x] Enforce rule: new changes must not add stylelint warnings.

Why:
- Lint noise hides real regressions and accelerates style quality decay.

Done criteria:
- `npm run lint:style` has no new warnings relative to baseline.

---

## P2 — Important Improvements (After P1)

### 6) Decompose oversized Vue files

- [ ] Split files >800 lines into focused subcomponents/composables by responsibility.

Priority candidates:
- `vue-app/src/pages/LandingPage.vue`
- `vue-app/src/components/TransactionForm.vue`
- `vue-app/src/pages/AnalyticsPage.vue`
- `vue-app/src/components/layout/AppShell.vue`
- `vue-app/src/components/TransactionList.vue`
- `vue-app/src/components/analytics/HeroHealthCard.vue`
- `vue-app/src/components/TransferFormModal.vue`

Why:
- God components increase regression risk and make both human and AI edits unstable.

---

### 7) Restore strict design-token discipline

- [ ] Remove hardcoded colors and fallback hex values from feature components.
- [ ] Use `useChartColors`/token palette for charting.
- [ ] Ban undefined-token fallbacks like `var(--unknown, ...)` in feature layer.

Why:
- This is a direct source of cross-screen/theme inconsistency.

---

### 8) Complete localization consistency (end-user UI Russian-only)

- [ ] Align route titles and user-facing error messages with Russian UI policy.
- [ ] Add lint/check to prevent new unintended English UI strings (except technical identifiers).

Why:
- Mixed RU/EN copy reduces product coherence.

---

### 9) Unify auth networking path

- [ ] Move `auth` store from direct `axios` calls to shared `apiClient`/`apiService` contract.
- [ ] Reuse one interceptor policy for refresh/redirect/error behavior.

Why:
- Multiple HTTP paths produce inconsistent behavior for 401/error scenarios.

---

### 10) Add minimal frontend smoke tests

- [ ] Add smoke coverage for critical user flows:
  - sign in / sign out
  - create transaction
  - list filtering
  - baseline analytics states

Why:
- There is currently no automated behavioral safety net for UI refactors.

---

## Priority Rule

1. Complete P1 first (architecture, style ownership, validation, CI).
2. Then complete P2 (decomposition, tokens, localization, tests).
3. Any new feature work must follow updated `CLAUDE.md` and `DESIGN.md`.
